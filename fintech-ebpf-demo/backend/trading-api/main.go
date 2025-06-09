package main

import (
	"fmt"
	"log"
	"net/http"
	"time"
	"math"
	"os"
	"sync/atomic"
	"sync"
	"runtime"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"trading-api/config"
	"trading-api/handlers"
)

// 添加監控相關的數據結構
type ServiceMetrics struct {
	ServiceName    string            `json:"service_name"`
	Version        string            `json:"version"`
	Status         string            `json:"status"`
	Uptime         int64             `json:"uptime"`
	Instances      int               `json:"instances"`
	RequestsTotal  int64             `json:"requests_total"`
	RequestsPerMin int64             `json:"requests_per_min"`
	ErrorsTotal    int64             `json:"errors_total"`
	ErrorsPerMin   int64             `json:"errors_per_min"`
	AvgLatency     float64           `json:"avg_latency_ms"`
	CPUUsage       float64           `json:"cpu_usage_percent"`
	MemoryUsage    int64             `json:"memory_usage_bytes"`
	MemoryUsageMB  float64           `json:"memory_usage_mb"`
	Details        map[string]interface{} `json:"details"`
}

type SystemOverview struct {
	TotalServices    int     `json:"total_services"`
	HealthyServices  int     `json:"healthy_services"`
	OverallHealth    float64 `json:"overall_health_percent"`
	TotalInstances   int     `json:"total_instances"`
	TotalRequests    int64   `json:"total_requests"`
	TotalErrors      int64   `json:"total_errors"`
	AvgResponseTime  float64 `json:"avg_response_time_ms"`
	LastUpdated      string  `json:"last_updated"`
}

var (
	serviceStartTime = time.Now()
	requestsCounter  = int64(0)
	errorsCounter    = int64(0)
	latencySum       = float64(0)
	latencyCount     = int64(0)
	latencyMutex     sync.Mutex
)

func main() {
	// 載入配置
	config.LoadConfig()

	// 初始化處理器
	handlers.InitializeHandlers()

	// 創建Gin路由器
	r := gin.Default()

	// 配置CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-User-ID"}
	r.Use(cors.New(corsConfig))

	// 添加監控中間件
	r.Use(metricsMiddleware())

	// 健康檢查端點
	r.GET("/health", handlers.HealthCheck)

	// API v1路由組
	v1 := r.Group("/api/v1")
	{
		// 訂單相關端點
		orders := v1.Group("/orders")
		{
			orders.POST("", handlers.CreateOrder)          // 創建訂單
			orders.GET("/:id", handlers.GetOrder)          // 查詢訂單
			orders.PUT("/:id", handlers.UpdateOrder)       // 修改訂單
			orders.DELETE("/:id", handlers.CancelOrder)    // 取消訂單
			orders.GET("", handlers.GetUserOrders)         // 獲取用戶所有訂單
		}

		// 投資組合端點
		v1.GET("/portfolio", handlers.GetPortfolio)       // 獲取投資組合
		v1.GET("/portfolio/history", handlers.GetPortfolioHistory)

		// 交易歷史端點
		v1.GET("/trades", handlers.GetTradingHistory)     // 獲取交易歷史
		v1.GET("/trading-stats", handlers.GetTradingStats) // 獲取交易統計

		// 市場數據端點
		market := v1.Group("/market")
		{
			market.GET("/quote/:symbol", handlers.GetStockQuote)    // 獲取實時股價
			market.GET("/stocks", handlers.GetSupportedStocks)      // 獲取支持的股票列表
		}

		// 用戶管理端點
		user := v1.Group("/user")
		{
			user.GET("/profile", handlers.GetUserProfile)         // 獲取用戶資料
			user.PUT("/profile", handlers.UpdateUserProfile)      // 更新用戶資料
			user.POST("/reset-account", handlers.ResetAccount)    // 重置帳戶
		}

		// 系統配置端點
		system := v1.Group("/system")
		{
			system.GET("/config", handlers.GetSystemConfig)       // 獲取系統配置
			system.PUT("/config", handlers.UpdateSystemConfig)    // 更新系統配置
		}

		// 🚨 安全測試端點 - 僅用於eBPF監控演示
		security := v1.Group("/security")
		{
			// 安全測試概覽
			security.GET("/tests", handlers.GetSecurityTestOverview)

			// 具體安全測試
			tests := security.Group("/test")
			{
				tests.POST("/command", handlers.TestCommandInjection)       // 命令注入測試
				tests.POST("/file", handlers.TestFileAccess)                // 文件訪問測試
				tests.POST("/network", handlers.TestNetworkScan)            // 網絡掃描測試
				tests.POST("/sensitive", handlers.TestSensitiveDataLeak)    // 敏感數據洩露測試
				tests.POST("/sql", handlers.TestSQLInjection)               // SQL注入測試
				tests.POST("/privilege", handlers.TestPrivilegeEscalation)  // 權限提升測試
				tests.POST("/crypto", handlers.TestCryptoWeakness)          // 加密弱點測試
				tests.POST("/memory", handlers.TestMemoryDump)              // 內存轉儲測試
				tests.POST("/comprehensive", handlers.RunComprehensiveSecurityTest) // 綜合安全測試
			}
		}

		// 添加路由
		v1.GET("/monitoring/service", getServiceMetrics)
		v1.GET("/monitoring/overview", getSystemOverview)
		v1.GET("/monitoring/instances", getInstancesInfo)

		// 🔍 Tetragon eBPF 事件監控端點
		tetragon := v1.Group("/tetragon")
		{
			tetragon.GET("/events", handlers.GetTetragonEvents)           // 獲取事件列表
			tetragon.GET("/alerts", handlers.GetSecurityAlerts)          // 獲取安全告警
			tetragon.GET("/statistics", handlers.GetEventStatistics)     // 獲取事件統計
			tetragon.GET("/ws", handlers.TetragonWebSocketHandler)        // WebSocket實時事件流
		}
	}

	// Prometheus指標端點
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 啟動服務器
	port := config.AppConfig.Server.Port
	if port == "" {
		port = "30080"
	}

	log.Printf("🚀 Trading API 服務器啟動在端口 %s", port)
	log.Printf("📊 健康檢查: http://localhost:%s/health", port)
	log.Printf("📈 API文檔: http://localhost:%s/api/v1/", port)
	log.Printf("🚨 安全測試: http://localhost:%s/api/v1/security/tests", port)
	log.Printf("🔍 Tetragon事件: http://localhost:%s/api/v1/tetragon/events", port)
	log.Printf("📡 WebSocket事件流: ws://localhost:%s/api/v1/tetragon/ws", port)
	log.Printf("📊 Prometheus指標: http://localhost:%s/metrics", port)
	
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), r); err != nil {
		log.Fatal("啟動服務器失敗:", err)
	}
}

// 獲取服務指標
func getServiceMetrics(c *gin.Context) {
	atomic.AddInt64(&requestsCounter, 1)
	
	// 計算運行時間
	uptime := time.Since(serviceStartTime).Seconds()
	
	// 計算每分鐘請求數
	requestsPerMin := int64(float64(requestsCounter) / (uptime / 60))
	if uptime < 60 {
		requestsPerMin = requestsCounter
	}
	
	// 計算每分鐘錯誤數
	errorsPerMin := int64(float64(errorsCounter) / (uptime / 60))
	if uptime < 60 {
		errorsPerMin = errorsCounter
	}
	
	// 計算平均延遲
	avgLatency := float64(0)
	if latencyCount > 0 {
		latencyMutex.Lock()
		avgLatency = latencySum / float64(latencyCount)
		latencyMutex.Unlock()
	}
	
	// 獲取Go運行時指標
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	
	// 計算CPU使用率（基於goroutines數量估算）
	numGoroutines := runtime.NumGoroutine()
	cpuUsage := math.Min(float64(numGoroutines) / 50.0 * 100, 100.0)
	
	metrics := ServiceMetrics{
		ServiceName:    "trading-api",
		Version:        "1.0.0",
		Status:         "healthy",
		Uptime:         int64(uptime),
		Instances:      1, // 單實例部署
		RequestsTotal:  requestsCounter,
		RequestsPerMin: requestsPerMin,
		ErrorsTotal:    errorsCounter,
		ErrorsPerMin:   errorsPerMin,
		AvgLatency:     avgLatency,
		CPUUsage:       cpuUsage,
		MemoryUsage:    int64(memStats.Alloc),
		MemoryUsageMB:  float64(memStats.Alloc) / 1024 / 1024,
		Details: map[string]interface{}{
			"goroutines":     numGoroutines,
			"gc_cycles":      memStats.NumGC,
			"heap_objects":   memStats.HeapObjects,
			"stack_inuse":    memStats.StackInuse,
			"next_gc":        memStats.NextGC,
		},
	}
	
	c.JSON(http.StatusOK, metrics)
}

// 獲取系統概覽
func getSystemOverview(c *gin.Context) {
	// 檢查所有服務的健康狀態
	services := []string{
		os.Getenv("TRADING_API_HEALTH_URL"),
		os.Getenv("RISK_ENGINE_HEALTH_URL"),
		os.Getenv("PAYMENT_GATEWAY_HEALTH_URL"),
		os.Getenv("AUDIT_SERVICE_HEALTH_URL"),
	}

	var validServices []string
	for _, s := range services {
		if s != "" {
			validServices = append(validServices, s)
		}
	}

	healthyCount := 0
	var wg sync.WaitGroup
	var results = make(chan bool, len(validServices))

	for _, serviceURL := range validServices {
		wg.Add(1)
		go func(url string) {
			defer wg.Done()
			if isServiceHealthy(url) {
				results <- true
			} else {
				results <- false
			}
		}(serviceURL)
	}

	wg.Wait()
	close(results)

	for res := range results {
		if res {
			healthyCount++
		}
	}

	overview := SystemOverview{
		TotalServices:    len(validServices),
		HealthyServices:  healthyCount,
		OverallHealth:    (float64(healthyCount) / float64(len(validServices))) * 100,
		TotalInstances:   len(validServices), // 簡化為服務數量
		TotalRequests:    atomic.LoadInt64(&requestsCounter),
		TotalErrors:      atomic.LoadInt64(&errorsCounter),
		AvgResponseTime:  getAverageLatency(),
		LastUpdated:      time.Now().Format(time.RFC3339),
	}
	c.JSON(http.StatusOK, overview)
}

// 獲取實例信息
func getInstancesInfo(c *gin.Context) {
	hostname, _ := os.Hostname()
	
	instances := []map[string]interface{}{
		{
			"service":     "trading-api",
			"instance_id": fmt.Sprintf("trading-api-%s", hostname),
			"host":        hostname,
			"port":        config.AppConfig.Server.Port,
			"status":      "running",
			"started_at":  serviceStartTime.Format(time.RFC3339),
			"uptime":      time.Since(serviceStartTime).Seconds(),
			"health":      "healthy",
			"cpu_usage":   math.Min(float64(runtime.NumGoroutine()) / 50.0 * 100, 100.0),
			"memory_mb":   getMemoryUsageMB(),
		},
	}
	
	c.JSON(http.StatusOK, gin.H{
		"instances": instances,
		"total":     len(instances),
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// 輔助函數：檢查服務健康狀態
func isServiceHealthy(serviceURL string) bool {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(serviceURL)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	
	return resp.StatusCode == http.StatusOK
}

// 輔助函數：獲取內存使用量(MB)
func getMemoryUsageMB() float64 {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	return float64(memStats.Alloc) / 1024 / 1024
}

// 修改中間件以記錄請求指標
func metricsMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()
		
		c.Next()
		
		// 記錄請求延遲
		latency := time.Since(start).Milliseconds()
		atomic.AddInt64(&latencyCount, 1)
		
		// 使用mutex保護latencySum
		latencyMutex.Lock()
		latencySum += float64(latency)
		latencyMutex.Unlock()
		
		// 記錄錯誤
		if c.Writer.Status() >= 400 {
			atomic.AddInt64(&errorsCounter, 1)
		}
	})
} 
} 