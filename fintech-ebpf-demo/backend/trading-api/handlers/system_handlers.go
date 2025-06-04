package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// 系統配置結構
type SystemConfig struct {
	TradingEnabled      bool    `json:"trading_enabled"`
	MarketOpenTime      string  `json:"market_open_time"`
	MarketCloseTime     string  `json:"market_close_time"`
	CommissionRate      float64 `json:"commission_rate"`
	MaxOrderSize        int     `json:"max_order_size"`
	InitialBalance      float64 `json:"initial_balance"`
	YahooFinanceEnabled bool    `json:"yahoo_finance_enabled"`
	RealPriceTrading    bool    `json:"real_price_trading"`
}

// 獲取系統配置
func GetSystemConfig(c *gin.Context) {
	ctx := context.Background()
	configKey := "system_config"

	// 從Redis獲取配置
	configJSON, err := rdb.Get(ctx, configKey).Result()
	if err == redis.Nil {
		// 配置不存在，返回默認配置
		defaultConfig := &SystemConfig{
			TradingEnabled:      true,
			MarketOpenTime:      "09:30",
			MarketCloseTime:     "16:00",
			CommissionRate:      0.0025,
			MaxOrderSize:        10000,
			InitialBalance:      100000.0,
			YahooFinanceEnabled: true,
			RealPriceTrading:    true,
		}

		// 保存默認配置到Redis
		configData, _ := json.Marshal(defaultConfig)
		rdb.Set(ctx, configKey, configData, time.Hour*24*365)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"config":  defaultConfig,
		})
		return
	} else if err != nil {
		logger.WithError(err).Error("獲取系統配置失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取系統配置失敗",
		})
		return
	}

	var config SystemConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		logger.WithError(err).Error("解析系統配置失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "解析系統配置失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"config":  config,
	})
}

// 更新系統配置
func UpdateSystemConfig(c *gin.Context) {
	var config SystemConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求數據格式錯誤",
		})
		return
	}

	// 驗證配置值
	if config.CommissionRate < 0 || config.CommissionRate > 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "手續費率必須在0-1之間",
		})
		return
	}

	if config.MaxOrderSize <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "最大訂單數量必須大於0",
		})
		return
	}

	if config.InitialBalance < 1000 || config.InitialBalance > 10000000 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "初始資金必須在1,000-10,000,000之間",
		})
		return
	}

	ctx := context.Background()
	configKey := "system_config"

	// 保存配置到Redis
	configData, err := json.Marshal(config)
	if err != nil {
		logger.WithError(err).Error("序列化系統配置失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "保存系統配置失敗",
		})
		return
	}

	if err := rdb.Set(ctx, configKey, configData, time.Hour*24*365).Err(); err != nil {
		logger.WithError(err).Error("保存系統配置失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "保存系統配置失敗",
		})
		return
	}

	logger.Infof("系統配置已更新: %+v", config)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "系統配置更新成功",
		"config":  config,
	})
} 