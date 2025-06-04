package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

// 配置結構
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	Audit    AuditConfig    `mapstructure:"audit"`
}

type ServerConfig struct {
	Port string `mapstructure:"port"`
	Host string `mapstructure:"host"`
	Mode string `mapstructure:"mode"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type AuditConfig struct {
	LogRetentionDays int      `mapstructure:"log_retention_days"`
	SensitiveFields  []string `mapstructure:"sensitive_fields"`
	LogDirectory     string   `mapstructure:"log_directory"`
}

// 數據模型
type AuditLog struct {
	ID          string                 `json:"id"`
	Timestamp   time.Time              `json:"timestamp"`
	Service     string                 `json:"service"`
	Action      string                 `json:"action"`
	UserID      string                 `json:"user_id"`
	ResourceID  string                 `json:"resource_id"`
	Details     map[string]interface{} `json:"details"`
	ClientIP    string                 `json:"client_ip"`
	UserAgent   string                 `json:"user_agent"`
	Severity    string                 `json:"severity"`
	Status      string                 `json:"status"`
}

type AuditLogRequest struct {
	Service    string                 `json:"service" binding:"required"`
	Action     string                 `json:"action" binding:"required"`
	UserID     string                 `json:"user_id"`
	ResourceID string                 `json:"resource_id"`
	Details    map[string]interface{} `json:"details"`
	Severity   string                 `json:"severity"`
	Status     string                 `json:"status"`
}

type SearchRequest struct {
	Service     string    `json:"service"`
	Action      string    `json:"action"`
	UserID      string    `json:"user_id"`
	DateFrom    time.Time `json:"date_from"`
	DateTo      time.Time `json:"date_to"`
	Severity    string    `json:"severity"`
	Limit       int       `json:"limit"`
	Offset      int       `json:"offset"`
}

type ExportRequest struct {
	Format   string        `json:"format" binding:"required,oneof=json csv pdf"`
	Filter   SearchRequest `json:"filter"`
	FileName string        `json:"file_name"`
}

var (
	config    *Config
	rdb       *redis.Client
	logger    *logrus.Logger
	clients   = make(map[*websocket.Conn]bool)
	broadcast = make(chan AuditLog)
	upgrader  = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // 故意允許所有來源 - 安全風險
		},
	}

	// Prometheus指標
	auditLogsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "audit_service_logs_total",
			Help: "Total number of audit logs",
		},
		[]string{"service", "action", "severity"},
	)

	fileOperationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "audit_service_file_operations_total",
			Help: "Total file operations",
		},
		[]string{"operation", "file_type"},
	)

	sensitiveDataAccess = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "audit_service_sensitive_data_access_total",
			Help: "Sensitive data access events",
		},
		[]string{"data_type", "operation"},
	)

	websocketConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "audit_service_websocket_connections",
			Help: "Active WebSocket connections",
		},
	)
)

func main() {
	// 初始化日誌
	logger = logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})

	// 加載配置
	loadConfig()

	// 初始化Redis
	initRedis()

	// 創建日誌目錄
	if err := os.MkdirAll(config.Audit.LogDirectory, 0755); err != nil {
		logger.WithError(err).Warn("無法創建日誌目錄")
	}

	// 啟動WebSocket廣播協程
	go handleMessages()

	// 設置Gin
	gin.SetMode(config.Server.Mode)
	router := gin.New()

	// 中間件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(metricsMiddleware())
	router.Use(auditMiddleware())

	// 路由
	router.POST("/audit/log", logAuditEvent)
	router.GET("/audit/search", searchLogs)
	router.POST("/audit/export", exportLogs)
	router.GET("/health", healthCheck)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// WebSocket端點
	router.GET("/ws/events", handleWebSocket)

	// Debug端點 - 故意暴露的功能
	router.GET("/debug/files", listLogFiles)
	router.GET("/debug/config", getDebugConfig)
	router.POST("/debug/sensitive", readSensitiveFile)

	// 啟動服務器
	address := fmt.Sprintf("%s:%s", config.Server.Host, config.Server.Port)
	logger.WithField("address", address).Info("Starting Audit Service")

	if err := router.Run(address); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func loadConfig() {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	viper.AddConfigPath(".")

	// 默認值
	viper.SetDefault("server.port", "8083")
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.mode", "release")
	viper.SetDefault("audit.log_retention_days", 90)
	viper.SetDefault("audit.log_directory", "/var/log/audit")
	viper.SetDefault("audit.sensitive_fields", []string{
		"password", "ssn", "credit_card", "bank_account",
	})

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		logger.Warn("Config file not found, using defaults")
	}

	config = &Config{}
	if err := viper.Unmarshal(config); err != nil {
		log.Fatal("Failed to unmarshal config:", err)
	}
}

func initRedis() {
	rdb = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", config.Redis.Host, config.Redis.Port),
		Password: config.Redis.Password,
		DB:       config.Redis.DB,
	})
}

// 記錄審計事件
func logAuditEvent(c *gin.Context) {
	var req AuditLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 創建審計日誌
	auditLog := AuditLog{
		ID:         uuid.New().String(),
		Timestamp:  time.Now(),
		Service:    req.Service,
		Action:     req.Action,
		UserID:     req.UserID,
		ResourceID: req.ResourceID,
		Details:    req.Details,
		ClientIP:   c.ClientIP(),
		UserAgent:  c.GetHeader("User-Agent"),
		Severity:   req.Severity,
		Status:     req.Status,
	}

	// 故意記錄詳細的審計信息，包括敏感數據
	logger.WithFields(logrus.Fields{
		"audit_log":      auditLog,
		"request_headers": c.Request.Header,
		"full_request":   req,
		"session_data":   c.GetHeader("Authorization"),
		"internal_ip":    c.GetHeader("X-Forwarded-For"),
	}).Info("審計事件記錄")

	// 檢查是否包含敏感數據
	containsSensitive := checkForSensitiveData(auditLog)
	if containsSensitive {
		sensitiveDataAccess.WithLabelValues("audit_log", "create").Inc()
	}

	// 寫入文件
	if err := writeAuditLogToFile(auditLog); err != nil {
		logger.WithError(err).Error("寫入審計日誌文件失敗")
	}

	// 存儲到Redis
	if err := storeAuditLogToRedis(auditLog); err != nil {
		logger.WithError(err).Error("存儲審計日誌到Redis失敗")
	}

	// 廣播到WebSocket客戶端
	broadcast <- auditLog

	// 記錄指標
	auditLogsTotal.WithLabelValues(req.Service, req.Action, req.Severity).Inc()

	c.JSON(http.StatusCreated, gin.H{
		"id":      auditLog.ID,
		"status":  "logged",
		"message": "Audit event recorded successfully",
	})
}

// 搜索日誌
func searchLogs(c *gin.Context) {
	var req SearchRequest

	// 解析查詢參數
	req.Service = c.Query("service")
	req.Action = c.Query("action")
	req.UserID = c.Query("user_id")
	req.Severity = c.Query("severity")

	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			req.Limit = l
		}
	}
	if req.Limit == 0 {
		req.Limit = 100
	}

	if offset := c.Query("offset"); offset != "" {
		if o, err := strconv.Atoi(offset); err == nil {
			req.Offset = o
		}
	}

	// 記錄敏感搜索操作
	logger.WithFields(logrus.Fields{
		"search_request": req,
		"client_ip":      c.ClientIP(),
		"user_agent":     c.GetHeader("User-Agent"),
		"timestamp":      time.Now(),
	}).Info("審計日誌搜索")

	// 從Redis搜索日誌
	logs, err := searchAuditLogsFromRedis(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	// 故意在搜索結果中包含敏感信息
	enrichedLogs := make([]map[string]interface{}, len(logs))
	for i, log := range logs {
		enrichedLogs[i] = map[string]interface{}{
			"log":              log,
			"internal_metadata": map[string]interface{}{
				"server_ip":      "192.168.1.100",
				"database_host":  "audit-db.internal",
				"encryption_key": "audit_key_12345",
			},
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":       enrichedLogs,
		"total":      len(logs),
		"limit":      req.Limit,
		"offset":     req.Offset,
		"search_id":  uuid.New().String(),
	})
}

// 導出日誌
func exportLogs(c *gin.Context) {
	var req ExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exportID := uuid.New().String()

	// 記錄導出操作
	logger.WithFields(logrus.Fields{
		"export_id":      exportID,
		"format":         req.Format,
		"filter":         req.Filter,
		"client_ip":      c.ClientIP(),
		"user_agent":     c.GetHeader("User-Agent"),
		"timestamp":      time.Now(),
	}).Info("審計日誌導出")

	// 搜索要導出的日誌
	logs, err := searchAuditLogsFromRedis(req.Filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Export search failed"})
		return
	}

	// 生成導出文件
	fileName := req.FileName
	if fileName == "" {
		fileName = fmt.Sprintf("audit_export_%s.%s", exportID, req.Format)
	}

	filePath := filepath.Join(config.Audit.LogDirectory, fileName)
	
	if err := writeExportFile(filePath, logs, req.Format); err != nil {
		logger.WithError(err).Error("寫入導出文件失敗")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Export failed"})
		return
	}

	fileOperationsTotal.WithLabelValues("export", req.Format).Inc()

	c.JSON(http.StatusOK, gin.H{
		"export_id":  exportID,
		"file_name":  fileName,
		"file_path":  filePath,
		"records":    len(logs),
		"status":     "completed",
		"download_url": fmt.Sprintf("/debug/files/%s", fileName),
	})
}

// 健康檢查
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "audit-service",
		"timestamp": time.Now(),
		"version":   "1.0.0",
		"websocket_connections": len(clients),
	})
}

// WebSocket處理
func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.WithError(err).Error("WebSocket升級失敗")
		return
	}
	defer conn.Close()

	// 添加客戶端
	clients[conn] = true
	websocketConnections.Set(float64(len(clients)))

	logger.WithFields(logrus.Fields{
		"client_ip":   c.ClientIP(),
		"user_agent":  c.GetHeader("User-Agent"),
		"connections": len(clients),
	}).Info("新的WebSocket連接")

	// 保持連接
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			delete(clients, conn)
			websocketConnections.Set(float64(len(clients)))
			break
		}
	}
}

// 處理廣播消息
func handleMessages() {
	for {
		msg := <-broadcast
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				client.Close()
				delete(clients, client)
			}
		}
		websocketConnections.Set(float64(len(clients)))
	}
}

// 列出日誌文件 - 故意暴露文件系統
func listLogFiles(c *gin.Context) {
	fileOperationsTotal.WithLabelValues("list", "log").Inc()

	// 故意暴露敏感文件路徑
	sensitiveFiles := []string{
		"/var/log/audit",
		"/var/log/auth.log",
		"/var/log/syslog",
		"/root/.bash_history",
		"/etc/passwd",
		"/etc/shadow",
	}

	fileInfo := make(map[string]interface{})

	for _, path := range sensitiveFiles {
		info, err := os.Stat(path)
		if err == nil {
			fileInfo[path] = map[string]interface{}{
				"size":    info.Size(),
				"mode":    info.Mode().String(),
				"mod_time": info.ModTime(),
			}
		} else {
			fileInfo[path] = map[string]interface{}{
				"error": err.Error(),
			}
		}
	}

	// 列出日誌目錄中的文件
	if files, err := ioutil.ReadDir(config.Audit.LogDirectory); err == nil {
		logFiles := make([]map[string]interface{}, len(files))
		for i, file := range files {
			logFiles[i] = map[string]interface{}{
				"name":     file.Name(),
				"size":     file.Size(),
				"mod_time": file.ModTime(),
				"is_dir":   file.IsDir(),
			}
		}
		fileInfo["log_directory"] = logFiles
	}

	c.JSON(http.StatusOK, gin.H{
		"files":         fileInfo,
		"log_directory": config.Audit.LogDirectory,
		"timestamp":     time.Now(),
	})
}

// 故意暴露配置
func getDebugConfig(c *gin.Context) {
	sensitiveDataAccess.WithLabelValues("config", "read").Inc()

	c.JSON(http.StatusOK, gin.H{
		"config":      config,
		"env_vars":    os.Environ(),
		"redis_info":  getRedisSensitiveInfo(),
		"system_info": getSystemInfo(),
	})
}

// 讀取敏感文件端點
func readSensitiveFile(c *gin.Context) {
	var request struct {
		FilePath string `json:"file_path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fileOperationsTotal.WithLabelValues("read", "sensitive").Inc()
	sensitiveDataAccess.WithLabelValues("sensitive_file", "read").Inc()

	// 故意不進行路徑驗證 - 這是一個嚴重的安全漏洞
	content, err := ioutil.ReadFile(request.FilePath)
	
	logger.WithFields(logrus.Fields{
		"file_path":  request.FilePath,
		"client_ip":  c.ClientIP(),
		"user_agent": c.GetHeader("User-Agent"),
		"success":    err == nil,
	}).Warn("敏感文件讀取請求")

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":     err.Error(),
			"file_path": request.FilePath,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file_path": request.FilePath,
		"content":   string(content),
		"size":      len(content),
		"timestamp": time.Now(),
	})
}

// 輔助函數
func checkForSensitiveData(log AuditLog) bool {
	for _, field := range config.Audit.SensitiveFields {
		if _, exists := log.Details[field]; exists {
			return true
		}
	}
	return false
}

func writeAuditLogToFile(log AuditLog) error {
	fileName := fmt.Sprintf("audit_%s.log", time.Now().Format("2006-01-02"))
	filePath := filepath.Join(config.Audit.LogDirectory, fileName)

	logData, err := json.Marshal(log)
	if err != nil {
		return err
	}

	file, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(string(logData) + "\n")
	fileOperationsTotal.WithLabelValues("write", "log").Inc()
	return err
}

func storeAuditLogToRedis(log AuditLog) error {
	logData, err := json.Marshal(log)
	if err != nil {
		return err
	}

	key := fmt.Sprintf("audit:%s:%s", log.Service, log.ID)
	return rdb.Set(rdb.Context(), key, logData, time.Duration(config.Audit.LogRetentionDays)*24*time.Hour).Err()
}

func searchAuditLogsFromRedis(req SearchRequest) ([]AuditLog, error) {
	// 模擬搜索結果
	logs := []AuditLog{
		{
			ID:        uuid.New().String(),
			Timestamp: time.Now().Add(-time.Hour),
			Service:   "trading-api",
			Action:    "order_create",
			UserID:    "user_123",
			Details: map[string]interface{}{
				"order_id": "ord_456",
				"amount":   10000,
				"symbol":   "AAPL",
			},
			ClientIP:  "192.168.1.50",
			UserAgent: "TradingApp/1.0",
			Severity:  "INFO",
			Status:    "SUCCESS",
		},
	}

	return logs, nil
}

func writeExportFile(filePath string, logs []AuditLog, format string) error {
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	switch format {
	case "json":
		encoder := json.NewEncoder(file)
		encoder.SetIndent("", "  ")
		return encoder.Encode(logs)
	case "csv":
		// 簡單的CSV實現
		_, err := file.WriteString("ID,Timestamp,Service,Action,UserID,ClientIP,Severity,Status\n")
		if err != nil {
			return err
		}
		for _, log := range logs {
			line := fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s,%s\n",
				log.ID, log.Timestamp.Format(time.RFC3339),
				log.Service, log.Action, log.UserID,
				log.ClientIP, log.Severity, log.Status)
			_, err := file.WriteString(line)
			if err != nil {
				return err
			}
		}
		return nil
	default:
		return fmt.Errorf("不支持的格式: %s", format)
	}
}

func getRedisSensitiveInfo() map[string]interface{} {
	// 故意暴露Redis敏感信息
	return map[string]interface{}{
		"redis_host":     config.Redis.Host,
		"redis_password": config.Redis.Password,
		"redis_keys":     []string{"audit:*", "session:*", "user:*"},
	}
}

func getSystemInfo() map[string]interface{} {
	hostname, _ := os.Hostname()
	wd, _ := os.Getwd()
	
	return map[string]interface{}{
		"hostname":     hostname,
		"working_dir":  wd,
		"pid":          os.Getpid(),
		"uid":          os.Getuid(),
		"gid":          os.Getgid(),
	}
}

// 中間件
func metricsMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()
		c.Next()
		
		// 記錄處理時間
		duration := time.Since(start)
		logger.WithFields(logrus.Fields{
			"method":      c.Request.Method,
			"path":        c.Request.URL.Path,
			"status":      c.Writer.Status(),
			"duration_ms": duration.Milliseconds(),
		}).Info("HTTP請求處理")
	})
}

func auditMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// 記錄所有請求到審計日誌
		auditLog := AuditLog{
			ID:        uuid.New().String(),
			Timestamp: time.Now(),
			Service:   "audit-service",
			Action:    fmt.Sprintf("%s %s", c.Request.Method, c.Request.URL.Path),
			ClientIP:  c.ClientIP(),
			UserAgent: c.GetHeader("User-Agent"),
			Details: map[string]interface{}{
				"headers": c.Request.Header,
				"query":   c.Request.URL.RawQuery,
			},
			Severity: "INFO",
			Status:   "PROCESSING",
		}

		// 故意記錄詳細的請求信息
		logger.WithFields(logrus.Fields{
			"audit_request": auditLog,
			"body_size":     c.Request.ContentLength,
			"remote_addr":   c.Request.RemoteAddr,
		}).Info("審計服務請求")

		c.Next()
	})
} 