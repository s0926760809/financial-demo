package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"trading-api/config"
	"trading-api/handlers"
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
	log.Printf("📊 Prometheus指標: http://localhost:%s/metrics", port)
	
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), r); err != nil {
		log.Fatal("啟動服務器失敗:", err)
	}
} 