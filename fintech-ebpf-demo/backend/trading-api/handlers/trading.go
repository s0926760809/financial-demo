package handlers

import (
	"fmt"
	"net/http"
	"time"
	"context"
	"strings"
	"encoding/json"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"github.com/go-redis/redis/v8"

	"trading-api/models"
	"trading-api/config"
	"trading-api/services"
)

var (
	logger               = logrus.New()
	rdb                  *redis.Client
	marketDataService    *services.MarketDataService
	tradingHistoryService *services.TradingHistoryService
)

func InitializeHandlers() {
	// 初始化Redis連接
	rdb = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", config.AppConfig.Redis.Host, config.AppConfig.Redis.Port),
		Password: config.AppConfig.Redis.Password,
		DB:       config.AppConfig.Redis.DB,
	})

	// 設置日誌格式
	logger.SetFormatter(&logrus.JSONFormatter{})

	// 初始化服務
	marketDataService = services.NewMarketDataService(logger, rdb)
	tradingHistoryService = services.NewTradingHistoryService(logger, rdb)
	
	logger.Info("交易處理器初始化完成")
}

// 創建訂單
func CreateOrder(c *gin.Context) {
	var req models.OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.WithError(err).Error("無效的訂單請求")
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "INVALID_REQUEST",
			Code:    400,
			Message: err.Error(),
			Time:    time.Now(),
		})
		return
	}

	// 驗證股票代碼
	supportedStocks := marketDataService.GetSupportedStocks()
	isSupported := false
	for _, stock := range supportedStocks {
		if strings.ToUpper(req.Symbol) == stock {
			isSupported = true
			break
		}
	}
	
	if !isSupported {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "UNSUPPORTED_SYMBOL",
			Code:    400,
			Message: fmt.Sprintf("不支持的股票代碼: %s", req.Symbol),
			Time:    time.Now(),
		})
		return
	}

	// 模擬用戶ID（實際應用中從JWT token獲取）
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "user_" + uuid.New().String()[:8]
	}

	// 創建訂單
	order := &models.Order{
		ID:           uuid.New().String(),
		UserID:       userID,
		Symbol:       strings.ToUpper(req.Symbol),
		Side:         req.Side,
		OrderType:    req.OrderType,
		Quantity:     req.Quantity,
		Price:        req.Price,
		Status:       "pending",
		FilledQty:    0,
		RemainingQty: req.Quantity,
		AvgPrice:     0,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		TimeInForce:  req.TimeInForce,
	}

	// 記錄敏感操作日誌
	logger.WithFields(logrus.Fields{
		"user_id":     userID,
		"order_id":    order.ID,
		"symbol":      req.Symbol,
		"quantity":    req.Quantity,
		"price":       req.Price,
		"order_type":  req.OrderType,
		"side":        req.Side,
		"user_ip":     c.ClientIP(),
		"user_agent":  c.GetHeader("User-Agent"),
	}).Info("新訂單創建")

	// 獲取實時市價
	marketQuote, err := marketDataService.GetStockQuote(order.Symbol)
	if err != nil {
		logger.WithError(err).WithField("symbol", order.Symbol).Error("獲取股價失敗")
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "MARKET_DATA_ERROR",
			Code:    500,
			Message: "無法獲取股票市價，請稍後重試",
			Time:    time.Now(),
		})
		return
	}

	// 驗證投資組合餘額（針對買入訂單）
	if order.Side == "buy" {
		portfolio, err := tradingHistoryService.GetPortfolio(userID)
		if err != nil {
			// 創建初始投資組合
			logger.WithField("user_id", userID).Info("創建初始投資組合")
		} else {
			requiredAmount := order.Quantity * order.Price
			if order.OrderType == "market" {
				requiredAmount = order.Quantity * marketQuote.Price
			}
			
			if portfolio.CashBalance < requiredAmount*1.01 { // 包含1%緩衝
				c.JSON(http.StatusBadRequest, models.ErrorResponse{
					Error:   "INSUFFICIENT_FUNDS",
					Code:    400,
					Message: fmt.Sprintf("資金不足。可用餘額: $%.2f, 需要: $%.2f", 
						portfolio.CashBalance, requiredAmount),
					Time:    time.Now(),
				})
				return
			}
		}
	}

	// 檢查持倉（針對賣出訂單）
	if order.Side == "sell" {
		portfolio, err := tradingHistoryService.GetPortfolio(userID)
		if err != nil || portfolio.Positions[order.Symbol] == nil || 
		   portfolio.Positions[order.Symbol].Quantity < order.Quantity {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "INSUFFICIENT_SHARES",
				Code:    400,
				Message: fmt.Sprintf("持股不足，無法賣出 %g 股 %s", order.Quantity, order.Symbol),
				Time:    time.Now(),
			})
			return
		}
	}

	// 模擬風險檢查
	riskResult := checkRiskLimits(order, marketQuote)
	if !riskResult.Approved {
		order.Status = "rejected"
		c.JSON(http.StatusBadRequest, models.OrderResponse{
			Order:   order,
			Message: fmt.Sprintf("訂單被風險控制拒絕: %s", strings.Join(riskResult.Reasons, ", ")),
			Success: false,
		})
		return
	}

	// 嘗試執行訂單
	executed, executionPrice, err := marketDataService.CheckOrderExecution(
		order.Symbol, order.OrderType, order.Price, order.Side)
	
	if err != nil {
		logger.WithError(err).Error("檢查訂單執行失敗")
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "EXECUTION_ERROR",
			Code:    500,
			Message: "訂單執行檢查失敗",
			Time:    time.Now(),
		})
		return
	}

	if executed {
		// 訂單成交
		order.Status = "filled"
		order.FilledQty = order.Quantity
		order.RemainingQty = 0
		order.AvgPrice = executionPrice
		order.UpdatedAt = time.Now()

		// 記錄交易歷史
		tradeRecord, err := tradingHistoryService.RecordTrade(
			order.ID, userID, order.Symbol, order.Side, 
			order.Quantity, executionPrice, order.OrderType, marketQuote)
		
		if err != nil {
			logger.WithError(err).Error("記錄交易失敗")
		} else {
			logger.WithFields(logrus.Fields{
				"trade_id":    tradeRecord.ID,
				"order_id":    order.ID,
				"symbol":      order.Symbol,
				"side":        order.Side,
				"quantity":    order.Quantity,
				"price":       executionPrice,
				"market_price": marketQuote.Price,
				"commission":  tradeRecord.Commission,
			}).Info("交易執行成功")
		}
	} else {
		// 訂單未成交，保持pending狀態
		logger.WithFields(logrus.Fields{
			"order_id":     order.ID,
			"symbol":       order.Symbol,
			"order_price":  order.Price,
			"market_price": marketQuote.Price,
			"side":         order.Side,
		}).Info("訂單未達成交條件，保持pending狀態")
	}

	// 存儲到Redis
	orderKey := fmt.Sprintf("order:%s", order.ID)
	orderJSON, _ := json.Marshal(order)
	rdb.Set(context.Background(), orderKey, orderJSON, time.Hour*24)

	// 添加市場信息到響應
	response := models.OrderResponse{
		Order:   order,
		Success: true,
	}

	if executed {
		response.Message = fmt.Sprintf("訂單成功成交，成交價: $%.2f (市價: $%.2f)", 
			executionPrice, marketQuote.Price)
	} else {
		response.Message = fmt.Sprintf("訂單已提交，等待成交。當前市價: $%.2f", marketQuote.Price)
	}

	// 添加市場數據到響應
	response.MarketData = map[string]interface{}{
		"currentPrice":   marketQuote.Price,
		"previousClose":  marketQuote.PreviousClose,
		"change":         marketQuote.Change,
		"changePercent":  marketQuote.ChangePercent,
		"volume":         marketQuote.Volume,
		"isMarketOpen":   marketQuote.IsMarketOpen,
		"lastUpdated":    marketQuote.LastUpdated,
	}

	c.JSON(http.StatusCreated, response)
}

// 獲取訂單信息
func GetOrder(c *gin.Context) {
	orderID := c.Param("id")
	
	logger.WithFields(logrus.Fields{
		"order_id": orderID,
		"user_ip":  c.ClientIP(),
		"endpoint": "/api/v1/orders/" + orderID,
	}).Info("訂單查詢請求")

	// 從Redis獲取
	orderKey := fmt.Sprintf("order:%s", orderID)
	orderJSON, err := rdb.Get(context.Background(), orderKey).Result()
	
	if err == redis.Nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "ORDER_NOT_FOUND",
			Code:    404,
			Message: "訂單不存在",
			Time:    time.Now(),
		})
		return
	}

	var order models.Order
	if err := json.Unmarshal([]byte(orderJSON), &order); err != nil {
		logger.WithError(err).Error("解析訂單數據失敗")
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Code:    500,
			Message: "內部服務錯誤",
			Time:    time.Now(),
		})
		return
	}

	// 獲取最新市價
	marketQuote, err := marketDataService.GetStockQuote(order.Symbol)
	if err == nil {
		// 檢查pending訂單是否可以成交
		if order.Status == "pending" {
			executed, executionPrice, err := marketDataService.CheckOrderExecution(
				order.Symbol, order.OrderType, order.Price, order.Side)
			
			if err == nil && executed {
				// 更新訂單狀態
				order.Status = "filled"
				order.FilledQty = order.Quantity
				order.RemainingQty = 0
				order.AvgPrice = executionPrice
				order.UpdatedAt = time.Now()

				// 記錄交易
				tradingHistoryService.RecordTrade(
					order.ID, order.UserID, order.Symbol, order.Side,
					order.Quantity, executionPrice, order.OrderType, marketQuote)

				// 更新Redis
				orderJSON, _ := json.Marshal(order)
				rdb.Set(context.Background(), orderKey, orderJSON, time.Hour*24)

				logger.WithField("order_id", orderID).Info("Pending訂單已成交")
			}
		}
	}

	response := models.OrderResponse{
		Order:   &order,
		Message: "訂單查詢成功",
		Success: true,
	}

	// 添加市場數據
	if marketQuote != nil {
		response.MarketData = map[string]interface{}{
			"currentPrice":  marketQuote.Price,
			"previousClose": marketQuote.PreviousClose,
			"change":        marketQuote.Change,
			"changePercent": marketQuote.ChangePercent,
			"isMarketOpen":  marketQuote.IsMarketOpen,
			"lastUpdated":   marketQuote.LastUpdated,
		}
	}

	c.JSON(http.StatusOK, response)
}

// 獲取投資組合
func GetPortfolio(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "demo_user"
	}

	logger.WithFields(logrus.Fields{
		"user_id": userID,
		"user_ip": c.ClientIP(),
		"endpoint": "/api/v1/portfolio",
	}).Info("投資組合查詢")

	// 獲取投資組合
	portfolio, err := tradingHistoryService.GetPortfolio(userID)
	if err != nil {
		// 創建默認投資組合
		portfolio = &services.Portfolio{
			UserID:      userID,
			Positions:   make(map[string]*services.Position),
			CashBalance: 100000.0, // 初始10萬美元
			TotalValue:  100000.0,
			TotalPL:     0,
			DayPL:       0,
			LastUpdated: time.Now(),
		}
	}

	// 更新所有持倉的實時市價
	if len(portfolio.Positions) > 0 {
		symbols := make([]string, 0, len(portfolio.Positions))
		for symbol := range portfolio.Positions {
			symbols = append(symbols, symbol)
		}

		quotes, err := marketDataService.GetMultipleQuotes(symbols)
		if err == nil {
			portfolio.TotalValue = portfolio.CashBalance
			portfolio.TotalPL = 0
			portfolio.DayPL = 0

			for symbol, position := range portfolio.Positions {
				if quote, exists := quotes[symbol]; exists {
					position.LastPrice = quote.Price
					position.PreviousClose = quote.PreviousClose
					position.MarketValue = position.Quantity * quote.Price
					position.UnrealizedPL = position.MarketValue - (position.Quantity * position.AvgCost)
					position.DayPL = position.Quantity * (quote.Price - quote.PreviousClose)
					position.LastUpdated = time.Now()

					portfolio.TotalValue += position.MarketValue
					portfolio.TotalPL += position.UnrealizedPL
					portfolio.DayPL += position.DayPL
				}
			}
			portfolio.LastUpdated = time.Now()
		}
	}

	c.JSON(http.StatusOK, map[string]interface{}{
		"portfolio": portfolio,
		"message":   "投資組合查詢成功",
		"success":   true,
	})
}

// 獲取交易歷史
func GetTradingHistory(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "demo_user"
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	trades, err := tradingHistoryService.GetUserTrades(userID, limit)
	if err != nil {
		logger.WithError(err).Error("獲取交易歷史失敗")
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Code:    500,
			Message: "獲取交易歷史失敗",
			Time:    time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, map[string]interface{}{
		"trades":  trades,
		"count":   len(trades),
		"message": "交易歷史查詢成功",
		"success": true,
	})
}

// 獲取交易統計
func GetTradingStats(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "demo_user"
	}

	stats, err := tradingHistoryService.GetTradingStats(userID)
	if err != nil {
		// 返回空統計
		stats = &services.TradingStats{
			UserID:      userID,
			LastUpdated: time.Now(),
		}
	}

	c.JSON(http.StatusOK, map[string]interface{}{
		"stats":   stats,
		"message": "交易統計查詢成功",
		"success": true,
	})
}

// 獲取實時股價
func GetStockQuote(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	
	quote, err := marketDataService.GetStockQuote(symbol)
	if err != nil {
		logger.WithError(err).WithField("symbol", symbol).Error("獲取股價失敗")
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "QUOTE_NOT_FOUND",
			Code:    404,
			Message: fmt.Sprintf("無法獲取 %s 的股價信息", symbol),
			Time:    time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, map[string]interface{}{
		"quote":   quote,
		"message": "股價查詢成功",
		"success": true,
	})
}

// 獲取支持的股票列表
func GetSupportedStocks(c *gin.Context) {
	stocks := marketDataService.GetSupportedStocks()
	
	// 獲取所有股票的實時價格
	quotes, err := marketDataService.GetMultipleQuotes(stocks)
	if err != nil {
		logger.WithError(err).Warn("獲取股票價格失敗")
	}

	stockList := make([]map[string]interface{}, len(stocks))
	for i, symbol := range stocks {
		stockInfo := map[string]interface{}{
			"symbol": symbol,
			"name":   getStockName(symbol),
		}
		
		if quote, exists := quotes[symbol]; exists {
			stockInfo["price"] = quote.Price
			stockInfo["change"] = quote.Change
			stockInfo["changePercent"] = quote.ChangePercent
			stockInfo["volume"] = quote.Volume
			stockInfo["isMarketOpen"] = quote.IsMarketOpen
		}
		
		stockList[i] = stockInfo
	}

	c.JSON(http.StatusOK, map[string]interface{}{
		"stocks":  stockList,
		"count":   len(stockList),
		"message": "支持股票列表查詢成功",
		"success": true,
	})
}

// 健康檢查
func HealthCheck(c *gin.Context) {
	health := models.HealthCheck{
		Status:    "healthy",
		Timestamp: time.Now(),
		Version:   "2.0.0",
		Services: map[string]string{
			"redis":           "connected",
			"market-data":     "connected", 
			"trading-history": "connected",
		},
	}

	// 檢查Redis連接
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		health.Services["redis"] = "disconnected"
		health.Status = "degraded"
	}

	// 檢查市場數據服務
	_, err := marketDataService.GetStockQuote("AAPL")
	if err != nil {
		health.Services["market-data"] = "degraded"
		health.Status = "degraded"
	}

	c.JSON(http.StatusOK, health)
}

// 輔助函數 - 風險檢查
func checkRiskLimits(order *models.Order, marketQuote *services.StockQuote) models.RiskAssessment {
	reasons := []string{}
	approved := true
	riskScore := 0.0

	// 檢查訂單數量
	if order.Quantity > 1000 {
		reasons = append(reasons, "訂單數量過大")
		riskScore += 20
	}

	// 檢查價格偏離度
	if order.OrderType == "limit" {
		priceDiff := abs(order.Price - marketQuote.Price) / marketQuote.Price
		if priceDiff > 0.1 { // 偏離市價超過10%
			reasons = append(reasons, fmt.Sprintf("限價偏離市價過大: %.1f%%", priceDiff*100))
			riskScore += 15
		}
	}

	// 檢查市場開放狀態
	if !marketQuote.IsMarketOpen {
		reasons = append(reasons, "市場已關閉")
		riskScore += 5
	}

	// 檢查波動率
	if abs(marketQuote.ChangePercent) > 5 {
		reasons = append(reasons, fmt.Sprintf("股價波動過大: %.1f%%", marketQuote.ChangePercent))
		riskScore += 10
	}

	if riskScore > 30 {
		approved = false
		reasons = append(reasons, "總風險評分過高")
	}

	return models.RiskAssessment{
		OrderID:    order.ID,
		UserID:     order.UserID,
		RiskScore:  riskScore,
		RiskLevel:  getRiskLevel(riskScore),
		Approved:   approved,
		Reasons:    reasons,
		AssessedAt: time.Now(),
	}
}

func getRiskLevel(score float64) string {
	if score > 30 {
		return "HIGH"
	} else if score > 15 {
		return "MEDIUM"
	}
	return "LOW"
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

func getStockName(symbol string) string {
	names := map[string]string{
		"AAPL":  "Apple Inc.",
		"GOOGL": "Alphabet Inc.",
		"MSFT":  "Microsoft Corp.",
		"AMZN":  "Amazon.com Inc.",
		"TSLA":  "Tesla Inc.",
		"META":  "Meta Platforms Inc.",
		"NFLX":  "Netflix Inc.",
		"NVDA":  "NVIDIA Corp.",
		"JPM":   "JPMorgan Chase & Co.",
		"JNJ":   "Johnson & Johnson",
		"V":     "Visa Inc.",
		"PG":    "Procter & Gamble Co.",
		"MA":    "Mastercard Inc.",
		"UNH":   "UnitedHealth Group Inc.",
		"HD":    "Home Depot Inc.",
		"DIS":   "Walt Disney Co.",
		"PYPL":  "PayPal Holdings Inc.",
		"BAC":   "Bank of America Corp.",
		"VZ":    "Verizon Communications Inc.",
		"ADBE":  "Adobe Inc.",
	}
	
	if name, exists := names[symbol]; exists {
		return name
	}
	return symbol
}

// 修改訂單
func UpdateOrder(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "INVALID_ORDER_ID",
			Code:    400,
			Message: "訂單ID不能為空",
			Time:    time.Now(),
		})
		return
	}

	var req models.OrderUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.WithError(err).Error("無效的訂單修改請求")
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "INVALID_REQUEST",
			Code:    400,
			Message: err.Error(),
			Time:    time.Now(),
		})
		return
	}

	// 獲取現有訂單
	existingOrder, err := getOrderFromRedis(orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "ORDER_NOT_FOUND",
			Code:    404,
			Message: "找不到指定的訂單",
			Time:    time.Now(),
		})
		return
	}

	// 檢查訂單是否可以修改
	if existingOrder.Status != "pending" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "ORDER_NOT_MODIFIABLE",
			Code:    400,
			Message: "只有待執行的訂單才能修改",
			Time:    time.Now(),
		})
		return
	}

	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "user_" + uuid.New().String()[:8]
	}

	// 記錄修改操作
	logger.WithFields(logrus.Fields{
		"user_id":      userID,
		"order_id":     orderID,
		"old_quantity": existingOrder.Quantity,
		"new_quantity": req.Quantity,
		"old_price":    existingOrder.Price,
		"new_price":    req.Price,
		"user_ip":      c.ClientIP(),
		"action":       "order_modification",
	}).Info("訂單修改請求")

	// 更新訂單信息
	if req.Quantity != nil {
		existingOrder.Quantity = *req.Quantity
		existingOrder.RemainingQty = *req.Quantity - existingOrder.FilledQty
	}
	if req.Price != nil {
		existingOrder.Price = *req.Price
	}
	if req.OrderType != nil {
		existingOrder.OrderType = *req.OrderType
	}
	existingOrder.UpdatedAt = time.Now()

	// 驗證修改後的訂單
	if existingOrder.Side == "buy" {
		portfolio, err := tradingHistoryService.GetPortfolio(userID)
		if err == nil {
			requiredAmount := existingOrder.Quantity * existingOrder.Price
			if portfolio.CashBalance < requiredAmount*1.01 {
				c.JSON(http.StatusBadRequest, models.ErrorResponse{
					Error:   "INSUFFICIENT_FUNDS",
					Code:    400,
					Message: fmt.Sprintf("修改後資金不足。可用餘額: $%.2f, 需要: $%.2f", 
						portfolio.CashBalance, requiredAmount),
					Time:    time.Now(),
				})
				return
			}
		}
	}

	// 保存修改後的訂單到Redis
	orderKey := fmt.Sprintf("order:%s", orderID)
	orderJSON, _ := json.Marshal(existingOrder)
	err = rdb.Set(context.Background(), orderKey, string(orderJSON), 24*time.Hour).Err()
	if err != nil {
		logger.WithError(err).Error("保存修改後的訂單失敗")
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "SAVE_ERROR",
			Code:    500,
			Message: "保存訂單修改失敗",
			Time:    time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, models.OrderResponse{
		Order:   existingOrder,
		Message: "訂單修改成功",
		Success: true,
	})
}

// 取消訂單
func CancelOrder(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "INVALID_ORDER_ID",
			Code:    400,
			Message: "訂單ID不能為空",
			Time:    time.Now(),
		})
		return
	}

	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "user_" + uuid.New().String()[:8]
	}

	// 獲取現有訂單
	existingOrder, err := getOrderFromRedis(orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "ORDER_NOT_FOUND",
			Code:    404,
			Message: "找不到指定的訂單",
			Time:    time.Now(),
		})
		return
	}

	// 檢查訂單是否可以取消
	if existingOrder.Status == "filled" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "ORDER_NOT_CANCELLABLE",
			Code:    400,
			Message: "已成交的訂單不能取消",
			Time:    time.Now(),
		})
		return
	}

	if existingOrder.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "ORDER_ALREADY_CANCELLED",
			Code:    400,
			Message: "訂單已經被取消",
			Time:    time.Now(),
		})
		return
	}

	// 記錄取消操作
	logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"order_id":   orderID,
		"symbol":     existingOrder.Symbol,
		"quantity":   existingOrder.Quantity,
		"price":      existingOrder.Price,
		"user_ip":    c.ClientIP(),
		"action":     "order_cancellation",
	}).Info("訂單取消請求")

	// 更新訂單狀態
	existingOrder.Status = "cancelled"
	existingOrder.UpdatedAt = time.Now()

	// 如果是部分成交訂單，需要處理剩餘數量
	if existingOrder.FilledQty > 0 {
		existingOrder.RemainingQty = 0
		logger.WithFields(logrus.Fields{
			"order_id":   orderID,
			"filled_qty": existingOrder.FilledQty,
			"total_qty":  existingOrder.Quantity,
		}).Info("取消部分成交訂單")
	}

	// 保存取消後的訂單到Redis
	orderKey := fmt.Sprintf("order:%s", orderID)
	orderJSON, _ := json.Marshal(existingOrder)
	err = rdb.Set(context.Background(), orderKey, string(orderJSON), 24*time.Hour).Err()
	if err != nil {
		logger.WithError(err).Error("保存取消後的訂單失敗")
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "SAVE_ERROR",
			Code:    500,
			Message: "保存訂單取消狀態失敗",
			Time:    time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, models.OrderResponse{
		Order:   existingOrder,
		Message: "訂單取消成功",
		Success: true,
	})
}

// 獲取用戶所有訂單
func GetUserOrders(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "user_" + uuid.New().String()[:8]
	}

	// 從Redis獲取用戶訂單列表
	orderKeys, err := rdb.Keys(context.Background(), "order:*").Result()
	if err != nil {
		logger.WithError(err).Error("獲取訂單列表失敗")
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "FETCH_ERROR",
			Code:    500,
			Message: "獲取訂單列表失敗",
			Time:    time.Now(),
		})
		return
	}

	var userOrders []*models.Order
	for _, orderKey := range orderKeys {
		orderJSON, err := rdb.Get(context.Background(), orderKey).Result()
		if err != nil {
			continue
		}

		var order models.Order
		if err := json.Unmarshal([]byte(orderJSON), &order); err != nil {
			continue
		}

		// 只返回當前用戶的訂單
		if order.UserID == userID {
			userOrders = append(userOrders, &order)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": userOrders,
		"total":  len(userOrders),
		"success": true,
	})
}

// 輔助函數：從Redis獲取訂單
func getOrderFromRedis(orderID string) (*models.Order, error) {
	orderKey := fmt.Sprintf("order:%s", orderID)
	orderJSON, err := rdb.Get(context.Background(), orderKey).Result()
	if err != nil {
		return nil, err
	}

	var order models.Order
	if err := json.Unmarshal([]byte(orderJSON), &order); err != nil {
		return nil, err
	}

	return &order, nil
} 