package main

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
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
	Risk     RiskConfig     `mapstructure:"risk"`
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

type RiskConfig struct {
	MaxOrderValue    float64 `mapstructure:"max_order_value"`
	HighRiskSymbols  []string `mapstructure:"high_risk_symbols"`
	CPUIntensiveMode bool     `mapstructure:"cpu_intensive_mode"`
}

// 數據模型
type RiskRequest struct {
	OrderID   string  `json:"order_id" binding:"required"`
	UserID    string  `json:"user_id" binding:"required"`
	Symbol    string  `json:"symbol" binding:"required"`
	Side      string  `json:"side" binding:"required"`
	Quantity  float64 `json:"quantity" binding:"required"`
	Price     float64 `json:"price" binding:"required"`
	OrderType string  `json:"order_type" binding:"required"`
}

type RiskResponse struct {
	OrderID      string    `json:"order_id"`
	UserID       string    `json:"user_id"`
	RiskScore    float64   `json:"risk_score"`
	RiskLevel    string    `json:"risk_level"`
	Approved     bool      `json:"approved"`
	Reasons      []string  `json:"reasons"`
	Limits       RiskLimit `json:"limits"`
	AssessedAt   time.Time `json:"assessed_at"`
	ProcessingMs int64     `json:"processing_ms"`
}

type RiskLimit struct {
	DailyVolumeLimit   float64 `json:"daily_volume_limit"`
	SingleOrderLimit   float64 `json:"single_order_limit"`
	PositionSizeLimit  float64 `json:"position_size_limit"`
	CurrentExposure    float64 `json:"current_exposure"`
}

type AlertRequest struct {
	AlertType string                 `json:"alert_type" binding:"required"`
	UserID    string                 `json:"user_id" binding:"required"`
	Message   string                 `json:"message" binding:"required"`
	Severity  string                 `json:"severity" binding:"required"`
	Data      map[string]interface{} `json:"data"`
}

var (
	config *Config
	rdb    *redis.Client
	logger *logrus.Logger

	// Prometheus指標
	riskAssessmentsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "risk_engine_assessments_total",
			Help: "Total number of risk assessments",
		},
		[]string{"risk_level", "approved"},
	)

	riskProcessingDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "risk_engine_processing_duration_seconds",
			Help: "Risk assessment processing duration",
		},
		[]string{"complexity"},
	)

	cpuUsage = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "risk_engine_cpu_usage_percent",
			Help: "CPU usage percentage",
		},
	)

	redisOperations = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "risk_engine_redis_operations_total",
			Help: "Total Redis operations",
		},
		[]string{"operation", "result"},
	)

	sensitiveFileAccess = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "risk_engine_sensitive_file_access_total",
			Help: "Sensitive file access events",
		},
		[]string{"file_type", "operation"},
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

	// 設置Gin
	gin.SetMode(config.Server.Mode)
	router := gin.New()

	// 配置CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-User-Id"}

	// 中間件
	router.Use(cors.New(corsConfig))
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(metricsMiddleware())

	// 路由
	router.POST("/risk/evaluate", evaluateRisk)
	router.GET("/risk/limits", getRiskLimits)
	router.POST("/risk/alert", sendAlert)
	router.GET("/health", healthCheck)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 故意暴露的內部端點
	router.GET("/debug/config", getDebugConfig)
	router.GET("/debug/files", listSensitiveFiles)
	router.POST("/debug/compute", intensiveCompute)

	// 定期更新CPU使用率
	go updateCPUUsage()

	// 定期執行CPU密集任務
	if config.Risk.CPUIntensiveMode {
		go runCPUIntensiveTasks()
	}

	// 啟動服務器
	address := fmt.Sprintf("%s:%s", config.Server.Host, config.Server.Port)
	logger.WithField("address", address).Info("Starting Risk Engine service")

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
	viper.SetDefault("server.port", "8081")
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.mode", "release")
	viper.SetDefault("risk.max_order_value", 100000.0)
	viper.SetDefault("risk.high_risk_symbols", []string{"CRYPTO", "MEME", "PENNY"})
	viper.SetDefault("risk.cpu_intensive_mode", true)

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

// 風險評估端點
func evaluateRisk(c *gin.Context) {
	start := time.Now()

	var req RiskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 記錄敏感信息 - 故意的安全問題
	logger.WithFields(logrus.Fields{
		"user_id":        req.UserID,
		"order_id":       req.OrderID,
		"symbol":         req.Symbol,
		"order_value":    req.Price * req.Quantity,
		"client_ip":      c.ClientIP(),
		"user_agent":     c.GetHeader("User-Agent"),
		"session_token":  c.GetHeader("Authorization"),
		"request_time":   time.Now(),
		"sensitive_data": "This order involves high-value trading",
	}).Info("風險評估請求")

	// 執行CPU密集的風險計算
	riskScore := performCPUIntensiveRiskCalculation(req)

	// 頻繁的Redis操作
	performRedisOperations(req)

	// 讀取敏感配置文件
	sensitiveConfig := readSensitiveConfig()

	// 評估風險
	reasons := []string{}
	approved := true

	if req.Price*req.Quantity > config.Risk.MaxOrderValue {
		reasons = append(reasons, "Order value exceeds limit")
		riskScore += 25
	}

	for _, symbol := range config.Risk.HighRiskSymbols {
		if strings.Contains(req.Symbol, symbol) {
			reasons = append(reasons, "High risk symbol")
			riskScore += 30
		}
	}

	if riskScore > 80 {
		approved = false
		reasons = append(reasons, "Total risk score too high")
	}

	// 構建響應
	response := RiskResponse{
		OrderID:   req.OrderID,
		UserID:    req.UserID,
		RiskScore: riskScore,
		RiskLevel: getRiskLevel(riskScore),
		Approved:  approved,
		Reasons:   reasons,
		Limits: RiskLimit{
			DailyVolumeLimit:  1000000,
			SingleOrderLimit:  config.Risk.MaxOrderValue,
			PositionSizeLimit: 500000,
			CurrentExposure:   rand.Float64() * 400000,
		},
		AssessedAt:   time.Now(),
		ProcessingMs: time.Since(start).Milliseconds(),
	}

	// 記錄指標
	approvedStr := "false"
	if approved {
		approvedStr = "true"
	}
	riskAssessmentsTotal.WithLabelValues(response.RiskLevel, approvedStr).Inc()
	riskProcessingDuration.WithLabelValues("high").Observe(time.Since(start).Seconds())

	// 故意記錄更多敏感信息
	logger.WithFields(logrus.Fields{
		"risk_assessment": response,
		"sensitive_config": sensitiveConfig,
		"internal_notes":   fmt.Sprintf("Risk evaluation for %s completed", req.UserID),
	}).Info("風險評估完成")

	c.JSON(http.StatusOK, response)
}

// 獲取風險限額
func getRiskLimits(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		userID = "default"
	}

	limits := RiskLimit{
		DailyVolumeLimit:  1000000,
		SingleOrderLimit:  config.Risk.MaxOrderValue,
		PositionSizeLimit: 500000,
		CurrentExposure:   rand.Float64() * 400000,
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id": userID,
		"limits":  limits,
		"status":  "active",
	})
}

// 發送風險告警
func sendAlert(c *gin.Context) {
	var req AlertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	alertID := uuid.New().String()

	// 故意記錄敏感告警信息
	logger.WithFields(logrus.Fields{
		"alert_id":       alertID,
		"alert_type":     req.AlertType,
		"user_id":        req.UserID,
		"severity":       req.Severity,
		"message":        req.Message,
		"client_ip":      c.ClientIP(),
		"alert_data":     req.Data,
		"timestamp":      time.Now(),
	}).Warn("風險告警發送")

	c.JSON(http.StatusOK, gin.H{
		"alert_id": alertID,
		"status":   "sent",
		"message":  "Alert has been processed",
	})
}

// 健康檢查
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "risk-engine",
		"timestamp": time.Now(),
		"version":   "1.0.0",
	})
}

// 故意暴露配置 - 安全問題
func getDebugConfig(c *gin.Context) {
	sensitiveFileAccess.WithLabelValues("config", "read").Inc()

	c.JSON(http.StatusOK, gin.H{
		"config":     config,
		"env_vars":   os.Environ(),
		"redis_info": getRedisSensitiveInfo(),
	})
}

// 列出敏感文件 - 安全問題
func listSensitiveFiles(c *gin.Context) {
	sensitiveFileAccess.WithLabelValues("filesystem", "list").Inc()

	files := []string{
		"/etc/passwd",
		"/etc/shadow",
		"/root/.bashrc",
		"/root/.ssh/id_rsa",
		"/var/log/auth.log",
		"/proc/version",
		"/proc/cpuinfo",
	}

	fileContents := make(map[string]string)
	for _, file := range files {
		if content, err := ioutil.ReadFile(file); err == nil {
			fileContents[file] = string(content)
		} else {
			fileContents[file] = "Permission denied or file not found"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"files":    files,
		"contents": fileContents,
	})
}

// CPU密集計算端點
func intensiveCompute(c *gin.Context) {
	iterations := 1000000
	if iter := c.Query("iterations"); iter != "" {
		if i, err := strconv.Atoi(iter); err == nil {
			iterations = i
		}
	}

	start := time.Now()
	result := performCPUIntensiveTask(iterations)
	duration := time.Since(start)

	c.JSON(http.StatusOK, gin.H{
		"result":      result,
		"iterations":  iterations,
		"duration_ms": duration.Milliseconds(),
		"cpu_cores":   runtime.NumCPU(),
	})
}

// CPU密集風險計算
func performCPUIntensiveRiskCalculation(req RiskRequest) float64 {
	// 模擬複雜的風險計算
	baseScore := rand.Float64() * 50

	// CPU密集的計算
	for i := 0; i < 10000; i++ {
		hash := md5.Sum([]byte(fmt.Sprintf("%s-%s-%f-%d", req.UserID, req.Symbol, req.Price, i)))
		sum := 0
		for _, b := range hash {
			sum += int(b)
		}
		baseScore += float64(sum) / 1000000
	}

	// 模擬機器學習風險模型
	features := []float64{
		req.Quantity,
		req.Price,
		float64(len(req.Symbol)),
		float64(time.Now().Hour()),
	}

	mlScore := 0.0
	for i, feature := range features {
		mlScore += feature * math.Sin(float64(i)+feature) * 0.01
	}

	return math.Mod(baseScore+mlScore, 100)
}

// Redis操作
func performRedisOperations(req RiskRequest) {
	ctx := context.Background()

	// 用戶風險歷史
	historyKey := fmt.Sprintf("risk_history:%s", req.UserID)
	historyData := map[string]interface{}{
		"order_id":   req.OrderID,
		"timestamp":  time.Now().Unix(),
		"symbol":     req.Symbol,
		"value":      req.Price * req.Quantity,
	}

	if err := rdb.LPush(ctx, historyKey, historyData).Err(); err != nil {
		redisOperations.WithLabelValues("lpush", "error").Inc()
	} else {
		redisOperations.WithLabelValues("lpush", "success").Inc()
	}

	// 限制歷史記錄長度
	rdb.LTrim(ctx, historyKey, 0, 99)

	// 市場風險數據
	marketKey := fmt.Sprintf("market_risk:%s", req.Symbol)
	marketData := gin.H{
		"volatility":    rand.Float64(),
		"liquidity":     rand.Float64() * 1000000,
		"last_updated":  time.Now().Unix(),
	}

	if jsonData, err := json.Marshal(marketData); err == nil {
		if err := rdb.Set(ctx, marketKey, jsonData, time.Hour).Err(); err != nil {
			redisOperations.WithLabelValues("set", "error").Inc()
		} else {
			redisOperations.WithLabelValues("set", "success").Inc()
		}
	}

	// 頻繁的Redis查詢
	for i := 0; i < 10; i++ {
		key := fmt.Sprintf("risk_cache:%s:%d", req.Symbol, i)
		if _, err := rdb.Get(ctx, key).Result(); err != nil {
			redisOperations.WithLabelValues("get", "miss").Inc()
		} else {
			redisOperations.WithLabelValues("get", "hit").Inc()
		}
	}
}

// 讀取敏感配置
func readSensitiveConfig() map[string]interface{} {
	sensitiveFileAccess.WithLabelValues("sensitive_config", "read").Inc()

	// 故意讀取敏感文件
	sensitiveFiles := map[string]string{
		"credentials":   "/root/.credentials",
		"private_key":   "/root/.private_key",
		"db_connection": "/root/.db_connection",
	}

	config := make(map[string]interface{})
	for name, path := range sensitiveFiles {
		if content, err := ioutil.ReadFile(path); err == nil {
			config[name] = string(content)
		}
	}

	return config
}

// CPU密集任務
func performCPUIntensiveTask(iterations int) float64 {
	result := 0.0
	for i := 0; i < iterations; i++ {
		result += math.Sin(float64(i)) * math.Cos(float64(i))
	}
	return result
}

// 定期CPU密集任務
func runCPUIntensiveTasks() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		logger.Info("執行定期CPU密集任務")
		performCPUIntensiveTask(500000)
	}
}

// 獲取Redis敏感信息
func getRedisSensitiveInfo() map[string]interface{} {
	ctx := context.Background()
	info := make(map[string]interface{})

	// 獲取所有鍵
	if keys, err := rdb.Keys(ctx, "*").Result(); err == nil {
		info["all_keys"] = keys
	}

	// 獲取配置
	if configInfo, err := rdb.ConfigGet(ctx, "*").Result(); err == nil {
		info["config"] = configInfo
	}

	return info
}

// 更新CPU使用率
func updateCPUUsage() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// 模擬CPU使用率
		usage := 30 + rand.Float64()*40 // 30-70%之間
		cpuUsage.Set(usage)
	}
}

// 獲取風險等級
func getRiskLevel(score float64) string {
	if score > 80 {
		return "HIGH"
	} else if score > 50 {
		return "MEDIUM"
	}
	return "LOW"
}

// 指標中間件
func metricsMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start).Seconds()
		
		// 記錄響應時間
		if c.Request.URL.Path == "/risk/evaluate" {
			riskProcessingDuration.WithLabelValues("standard").Observe(duration)
		}
	})
} 