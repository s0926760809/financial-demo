package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// 用戶資料結構
type UserProfile struct {
	UserID         string    `json:"user_id"`
	Email          string    `json:"email"`
	DisplayName    string    `json:"display_name"`
	InitialBalance float64   `json:"initial_balance"`
	CurrentBalance float64   `json:"current_balance"`
	TotalTrades    int       `json:"total_trades"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// 帳戶重置請求
type ResetAccountRequest struct {
	ResetBalance   float64 `json:"reset_balance"`
	ClearPositions bool    `json:"clear_positions"`
	ClearTrades    bool    `json:"clear_trades"`
}

// 帳戶重置響應
type ResetAccountResponse struct {
	Success    bool    `json:"success"`
	Message    string  `json:"message"`
	NewBalance float64 `json:"new_balance"`
	Timestamp  string  `json:"timestamp"`
}

// 獲取用戶資料
func GetUserProfile(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "用戶ID不能為空",
		})
		return
	}

	ctx := context.Background()
	profileKey := fmt.Sprintf("user_profile:%s", userID)

	// 從Redis獲取用戶資料
	profileJSON, err := rdb.Get(ctx, profileKey).Result()
	if err == redis.Nil {
		// 用戶資料不存在，創建默認資料
		defaultProfile := &UserProfile{
			UserID:         userID,
			Email:          "demo@example.com",
			DisplayName:    "演示用戶",
			InitialBalance: 100000.0,
			CurrentBalance: 100000.0,
			TotalTrades:    0,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		// 保存到Redis
		profileData, _ := json.Marshal(defaultProfile)
		rdb.Set(ctx, profileKey, profileData, time.Hour*24*365)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"user":    defaultProfile,
		})
		return
	} else if err != nil {
		logger.WithError(err).Error("獲取用戶資料失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶資料失敗",
		})
		return
	}

	var profile UserProfile
	if err := json.Unmarshal([]byte(profileJSON), &profile); err != nil {
		logger.WithError(err).Error("解析用戶資料失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "解析用戶資料失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    profile,
	})
}

// 更新用戶資料
func UpdateUserProfile(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "用戶ID不能為空",
		})
		return
	}

	var updateData struct {
		DisplayName string `json:"display_name"`
		Email       string `json:"email"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求數據格式錯誤",
		})
		return
	}

	ctx := context.Background()
	profileKey := fmt.Sprintf("user_profile:%s", userID)

	// 獲取現有資料
	profileJSON, err := rdb.Get(ctx, profileKey).Result()
	if err == redis.Nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "用戶資料不存在",
		})
		return
	} else if err != nil {
		logger.WithError(err).Error("獲取用戶資料失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶資料失敗",
		})
		return
	}

	var profile UserProfile
	if err := json.Unmarshal([]byte(profileJSON), &profile); err != nil {
		logger.WithError(err).Error("解析用戶資料失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "解析用戶資料失敗",
		})
		return
	}

	// 更新資料
	profile.DisplayName = updateData.DisplayName
	profile.Email = updateData.Email
	profile.UpdatedAt = time.Now()

	// 保存更新後的資料
	updatedData, err := json.Marshal(profile)
	if err != nil {
		logger.WithError(err).Error("序列化用戶資料失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "保存用戶資料失敗",
		})
		return
	}

	if err := rdb.Set(ctx, profileKey, updatedData, time.Hour*24*365).Err(); err != nil {
		logger.WithError(err).Error("保存用戶資料失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "保存用戶資料失敗",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用戶資料更新成功",
		"user":    profile,
	})
}

// 重置帳戶
func ResetAccount(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "用戶ID不能為空",
		})
		return
	}

	var request ResetAccountRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "請求數據格式錯誤",
		})
		return
	}

	ctx := context.Background()
	
	// 重置用戶餘額
	profileKey := fmt.Sprintf("user_profile:%s", userID)
	profileJSON, err := rdb.Get(ctx, profileKey).Result()
	if err != redis.Nil && err != nil {
		logger.WithError(err).Error("獲取用戶資料失敗")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "獲取用戶資料失敗",
		})
		return
	}

	var profile UserProfile
	if err == redis.Nil {
		// 創建默認資料
		profile = UserProfile{
			UserID:         userID,
			Email:          "demo@example.com",
			DisplayName:    "演示用戶",
			InitialBalance: request.ResetBalance,
			CurrentBalance: request.ResetBalance,
			TotalTrades:    0,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
	} else {
		json.Unmarshal([]byte(profileJSON), &profile)
		profile.CurrentBalance = request.ResetBalance
		profile.InitialBalance = request.ResetBalance
		profile.TotalTrades = 0
		profile.UpdatedAt = time.Now()
	}

	// 清除持倉（如果要求）
	if request.ClearPositions {
		portfolioKey := fmt.Sprintf("portfolio:%s", userID)
		// 創建空的投資組合
		emptyPortfolio := map[string]interface{}{
			"userID":       userID,
			"positions":    make(map[string]interface{}),
			"cashBalance":  request.ResetBalance,
			"totalValue":   request.ResetBalance,
			"totalPL":      0.0,
			"dayPL":        0.0,
			"lastUpdated":  time.Now(),
		}
		portfolioData, _ := json.Marshal(emptyPortfolio)
		rdb.Set(ctx, portfolioKey, portfolioData, time.Hour*24*365)
	}

	// 清除交易記錄（如果要求）
	if request.ClearTrades {
		tradesKey := fmt.Sprintf("trades:%s", userID)
		rdb.Del(ctx, tradesKey)
		
		statsKey := fmt.Sprintf("trading_stats:%s", userID)
		rdb.Del(ctx, statsKey)
	}

	// 保存更新後的用戶資料
	profileData, _ := json.Marshal(profile)
	rdb.Set(ctx, profileKey, profileData, time.Hour*24*365)

	response := ResetAccountResponse{
		Success:    true,
		Message:    "帳戶重置成功",
		NewBalance: request.ResetBalance,
		Timestamp:  time.Now().Format(time.RFC3339),
	}

	logger.Infof("用戶 %s 帳戶重置成功，新餘額: $%.2f", userID, request.ResetBalance)

	c.JSON(http.StatusOK, response)
} 