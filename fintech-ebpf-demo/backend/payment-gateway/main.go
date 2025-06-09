package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net"
	"net/http"
	"os"
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
	Payment  PaymentConfig  `mapstructure:"payment"`
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

type PaymentConfig struct {
	ProviderAPIKey    string            `mapstructure:"provider_api_key"`
	ProviderSecret    string            `mapstructure:"provider_secret"`
	ExternalEndpoints map[string]string `mapstructure:"external_endpoints"`
	DNSServers        []string          `mapstructure:"dns_servers"`
}

// 數據模型
type PaymentRequest struct {
	OrderID     string  `json:"order_id" binding:"required"`
	UserID      string  `json:"user_id" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Currency    string  `json:"currency" binding:"required"`
	Method      string  `json:"method" binding:"required"`
	CardNumber  string  `json:"card_number,omitempty"`
	ExpiryMonth int     `json:"expiry_month,omitempty"`
	ExpiryYear  int     `json:"expiry_year,omitempty"`
	CVV         string  `json:"cvv,omitempty"`
}

type PaymentResponse struct {
	PaymentID     string    `json:"payment_id"`
	OrderID       string    `json:"order_id"`
	Status        string    `json:"status"`
	Amount        float64   `json:"amount"`
	Currency      string    `json:"currency"`
	TransactionID string    `json:"transaction_id"`
	ProcessedAt   time.Time `json:"processed_at"`
	Message       string    `json:"message"`
}

type RefundRequest struct {
	PaymentID string  `json:"payment_id" binding:"required"`
	Amount    float64 `json:"amount" binding:"required,gt=0"`
	Reason    string  `json:"reason"`
}

type RefundResponse struct {
	RefundID    string    `json:"refund_id"`
	PaymentID   string    `json:"payment_id"`
	Amount      float64   `json:"amount"`
	Status      string    `json:"status"`
	ProcessedAt time.Time `json:"processed_at"`
}

var (
	config *Config
	rdb    *redis.Client
	logger *logrus.Logger

	// Prometheus指標
	paymentsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payment_gateway_payments_total",
			Help: "Total number of payment requests",
		},
		[]string{"method", "status", "currency"},
	)

	paymentAmount = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "payment_gateway_payment_amount",
			Help: "Payment amounts",
		},
		[]string{"currency", "method"},
	)

	externalAPICallsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payment_gateway_external_api_calls_total",
			Help: "Total external API calls",
		},
		[]string{"endpoint", "status"},
	)

	dnsQueriesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payment_gateway_dns_queries_total",
			Help: "Total DNS queries",
		},
		[]string{"domain", "result"},
	)

	sensitiveDataProcessed = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payment_gateway_sensitive_data_processed_total",
			Help: "Sensitive data processing events",
		},
		[]string{"data_type", "operation"},
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
	router.Use(securityMiddleware())

	// API v1 路由組
	v1 := router.Group("/api/v1")
	{
		payment := v1.Group("/payment")
		{
			payment.POST("/process", processPayment)
			payment.GET("/status/:id", getPaymentStatus)
			payment.POST("/refund", processRefund)
		}

		// 測試端點 - 故意暴露的功能
		debug := v1.Group("/debug")
		{
			debug.GET("/config", getDebugConfig)
			debug.POST("/dns", testDNSLookup)
			debug.POST("/external", testExternalAPI)
		}
	}

	// 健康檢查和指標路由
	router.GET("/health", healthCheck)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 啟動服務器
	address := fmt.Sprintf("%s:%s", config.Server.Host, config.Server.Port)
	logger.WithField("address", address).Info("Starting Payment Gateway service")

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
	viper.SetDefault("server.port", "8082")
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.mode", "release")
	viper.SetDefault("payment.provider_api_key", "pk_test_51234567890abcdef")
	viper.SetDefault("payment.provider_secret", "sk_test_secret_key_demo_123")
	viper.SetDefault("payment.external_endpoints", map[string]string{
		"stripe":  "https://api.stripe.com",
		"paypal":  "https://api.paypal.com",
		"bank":    "https://api.bank.example.com",
	})
	viper.SetDefault("payment.dns_servers", []string{
		"8.8.8.8",
		"1.1.1.1",
		"suspicious-dns.example.com",
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

// 處理支付
func processPayment(c *gin.Context) {
	var req PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paymentID := uuid.New().String()

	// 故意記錄敏感支付信息 - 這是嚴重的安全問題
	logger.WithFields(logrus.Fields{
		"payment_id":     paymentID,
		"user_id":        req.UserID,
		"order_id":       req.OrderID,
		"amount":         req.Amount,
		"currency":       req.Currency,
		"method":         req.Method,
		"card_number":    req.CardNumber,     // 故意記錄完整卡號
		"expiry_month":   req.ExpiryMonth,
		"expiry_year":    req.ExpiryYear,
		"cvv":           req.CVV,             // 故意記錄CVV
		"client_ip":      c.ClientIP(),
		"user_agent":     c.GetHeader("User-Agent"),
		"session_token":  c.GetHeader("Authorization"),
		"timestamp":      time.Now(),
	}).Info("支付請求處理")

	// 記錄敏感數據處理
	sensitiveDataProcessed.WithLabelValues("credit_card", "process").Inc()
	if req.CVV != "" {
		sensitiveDataProcessed.WithLabelValues("cvv", "process").Inc()
	}

	// 模擬外部API調用
	externalResult := callExternalPaymentAPI(req)

	// 模擬DNS查詢
	performDNSQueries()

	// 處理支付邏輯
	status := "success"
	transactionID := fmt.Sprintf("txn_%s", uuid.New().String()[:8])

	// 簡單的失敗模擬
	if req.Amount > 50000 {
		status = "failed"
		transactionID = ""
	} else if rand.Float64() < 0.1 { // 10%隨機失敗率
		status = "failed"
		transactionID = ""
	}

	response := PaymentResponse{
		PaymentID:     paymentID,
		OrderID:       req.OrderID,
		Status:        status,
		Amount:        req.Amount,
		Currency:      req.Currency,
		TransactionID: transactionID,
		ProcessedAt:   time.Now(),
		Message:       getStatusMessage(status),
	}

	// 存儲到Redis
	paymentData, _ := json.Marshal(response)
	rdb.Set(context.Background(), fmt.Sprintf("payment:%s", paymentID), paymentData, time.Hour*24)

	// 記錄指標
	paymentsTotal.WithLabelValues(req.Method, status, req.Currency).Inc()
	paymentAmount.WithLabelValues(req.Currency, req.Method).Observe(req.Amount)

	// 故意將完整的支付信息存儲到日誌
	logger.WithFields(logrus.Fields{
		"payment_response":     response,
		"external_api_result":  externalResult,
		"full_card_details":    req, // 故意記錄完整請求
	}).Info("支付處理完成")

	c.JSON(http.StatusOK, response)
}

// 獲取支付狀態
func getPaymentStatus(c *gin.Context) {
	paymentID := c.Param("id")

	// 從Redis獲取支付信息
	paymentData, err := rdb.Get(context.Background(), fmt.Sprintf("payment:%s", paymentID)).Result()
	if err == redis.Nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	var payment PaymentResponse
	if err := json.Unmarshal([]byte(paymentData), &payment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Data parsing error"})
		return
	}

	c.JSON(http.StatusOK, payment)
}

// 處理退款
func processRefund(c *gin.Context) {
	var req RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	refundID := uuid.New().String()

	// 記錄退款處理
	logger.WithFields(logrus.Fields{
		"refund_id":   refundID,
		"payment_id":  req.PaymentID,
		"amount":      req.Amount,
		"reason":      req.Reason,
		"client_ip":   c.ClientIP(),
		"user_agent":  c.GetHeader("User-Agent"),
		"timestamp":   time.Now(),
	}).Info("退款請求處理")

	// 模擬退款處理
	status := "processed"
	if rand.Float64() < 0.05 { // 5%失敗率
		status = "failed"
	}

	response := RefundResponse{
		RefundID:    refundID,
		PaymentID:   req.PaymentID,
		Amount:      req.Amount,
		Status:      status,
		ProcessedAt: time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// 健康檢查
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "payment-gateway",
		"timestamp": time.Now(),
		"version":   "1.0.0",
	})
}

// 故意暴露配置
func getDebugConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"config":     config,
		"env_vars":   os.Environ(),
		"api_keys": map[string]string{
			"stripe_key":    config.Payment.ProviderAPIKey,
			"stripe_secret": config.Payment.ProviderSecret,
		},
	})
}

// DNS查詢測試端點
func testDNSLookup(c *gin.Context) {
	var request struct {
		Domain string `json:"domain" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 執行DNS查詢 - 故意不進行輸入驗證
	ips, err := net.LookupIP(request.Domain)

	result := "success"
	if err != nil {
		result = "failed"
	}

	dnsQueriesTotal.WithLabelValues(request.Domain, result).Inc()

	logger.WithFields(logrus.Fields{
		"domain":    request.Domain,
		"ips":       ips,
		"client_ip": c.ClientIP(),
		"result":    result,
	}).Info("DNS查詢執行")

	c.JSON(http.StatusOK, gin.H{
		"domain": request.Domain,
		"ips":    ips,
		"error":  err,
	})
}

// 外部API測試端點
func testExternalAPI(c *gin.Context) {
	var request struct {
		Endpoint string            `json:"endpoint" binding:"required"`
		Headers  map[string]string `json:"headers"`
		Data     map[string]interface{} `json:"data"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 調用外部API - 故意不進行URL驗證
	client := &http.Client{Timeout: 10 * time.Second}
	
	var resp *http.Response
	var err error

	if request.Data != nil {
		jsonData, _ := json.Marshal(request.Data)
		req, _ := http.NewRequest("POST", request.Endpoint, strings.NewReader(string(jsonData)))
		req.Header.Set("Content-Type", "application/json")
		
		for k, v := range request.Headers {
			req.Header.Set(k, v)
		}
		
		resp, err = client.Do(req)
	} else {
		resp, err = client.Get(request.Endpoint)
	}

	status := "success"
	if err != nil {
		status = "failed"
	}

	externalAPICallsTotal.WithLabelValues(request.Endpoint, status).Inc()

	logger.WithFields(logrus.Fields{
		"endpoint":   request.Endpoint,
		"headers":    request.Headers,
		"data":       request.Data,
		"status":     status,
		"client_ip":  c.ClientIP(),
	}).Info("外部API調用")

	result := gin.H{
		"endpoint": request.Endpoint,
		"status":   status,
	}

	if resp != nil {
		result["status_code"] = resp.StatusCode
		resp.Body.Close()
	}

	if err != nil {
		result["error"] = err.Error()
	}

	c.JSON(http.StatusOK, result)
}

// 模擬外部支付API調用
func callExternalPaymentAPI(req PaymentRequest) map[string]interface{} {
	// 模擬調用不同的支付提供商
	var endpoint string
	switch req.Method {
	case "credit_card":
		endpoint = config.Payment.ExternalEndpoints["stripe"]
	case "paypal":
		endpoint = config.Payment.ExternalEndpoints["paypal"]
	default:
		endpoint = config.Payment.ExternalEndpoints["bank"]
	}

	externalAPICallsTotal.WithLabelValues(endpoint, "success").Inc()

	return map[string]interface{}{
		"endpoint":       endpoint,
		"response_time":  rand.Intn(500) + 100, // 100-600ms
		"transaction_id": fmt.Sprintf("ext_%s", uuid.New().String()[:8]),
		"status":         "processed",
	}
}

// 執行DNS查詢
func performDNSQueries() {
	for _, server := range config.Payment.DNSServers {
		// 模擬DNS查詢
		_, err := net.LookupIP(server)
		
		result := "success"
		if err != nil {
			result = "failed"
		}
		
		dnsQueriesTotal.WithLabelValues(server, result).Inc()
	}

	// 查詢一些可疑的域名
	suspiciousDomains := []string{
		"malware.example.com",
		"phishing-site.com",
		"crypto-miner.net",
	}

	for _, domain := range suspiciousDomains {
		_, err := net.LookupIP(domain)
		
		result := "success"
		if err != nil {
			result = "failed"
		}
		
		dnsQueriesTotal.WithLabelValues(domain, result).Inc()
	}
}

// 獲取狀態消息
func getStatusMessage(status string) string {
	switch status {
	case "success":
		return "Payment processed successfully"
	case "failed":
		return "Payment processing failed"
	case "pending":
		return "Payment is being processed"
	default:
		return "Unknown status"
	}
}

// 指標中間件
func metricsMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()
		c.Next()
		
		// 記錄請求處理時間
		_ = time.Since(start).Seconds() // 使用空白標識符忽略未使用的值
		
		// 根據端點記錄不同的指標
		if strings.Contains(c.Request.URL.Path, "/payment/") {
			// 支付相關請求的額外監控
		}
	})
}

// 安全中間件
func securityMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// 記錄所有支付相關請求
		if strings.Contains(c.Request.URL.Path, "/payment/") {
			logger.WithFields(logrus.Fields{
				"method":      c.Request.Method,
				"path":        c.Request.URL.Path,
				"client_ip":   c.ClientIP(),
				"user_agent":  c.GetHeader("User-Agent"),
				"headers":     c.Request.Header,
				"timestamp":   time.Now(),
			}).Info("支付端點訪問")
		}

		c.Next()
	})
} 