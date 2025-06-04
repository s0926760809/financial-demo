package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

type TradingHistoryService struct {
	logger *logrus.Logger
	redis  *redis.Client
}

type TradeRecord struct {
	ID            string    `json:"id"`
	OrderID       string    `json:"orderId"`
	UserID        string    `json:"userId"`
	Symbol        string    `json:"symbol"`
	Side          string    `json:"side"`          // "buy" 或 "sell"
	Quantity      float64   `json:"quantity"`
	Price         float64   `json:"price"`
	Amount        float64   `json:"amount"`        // 總金額
	Commission    float64   `json:"commission"`    // 手續費
	NetAmount     float64   `json:"netAmount"`     // 淨額
	OrderType     string    `json:"orderType"`
	ExecutedAt    time.Time `json:"executedAt"`
	MarketPrice   float64   `json:"marketPrice"`   // 當時市價
	PriceChange   float64   `json:"priceChange"`   // 相對市價的差異
	IsMarketOpen  bool      `json:"isMarketOpen"`
	Currency      string    `json:"currency"`
	Exchange      string    `json:"exchange"`
	Notes         string    `json:"notes"`
}

type Portfolio struct {
	UserID        string             `json:"userId"`
	Positions     map[string]*Position `json:"positions"`
	CashBalance   float64            `json:"cashBalance"`
	TotalValue    float64            `json:"totalValue"`
	TotalPL       float64            `json:"totalPL"`     // 總損益
	DayPL         float64            `json:"dayPL"`       // 當日損益
	LastUpdated   time.Time          `json:"lastUpdated"`
}

type Position struct {
	Symbol        string    `json:"symbol"`
	Quantity      float64   `json:"quantity"`
	AvgCost       float64   `json:"avgCost"`       // 平均成本
	MarketValue   float64   `json:"marketValue"`   // 市值
	UnrealizedPL  float64   `json:"unrealizedPL"`  // 未實現損益
	DayPL         float64   `json:"dayPL"`         // 當日損益
	LastPrice     float64   `json:"lastPrice"`     // 最新價格
	PreviousClose float64   `json:"previousClose"` // 前收盤價
	LastUpdated   time.Time `json:"lastUpdated"`
}

type TradingStats struct {
	UserID          string    `json:"userId"`
	TotalTrades     int       `json:"totalTrades"`
	WinningTrades   int       `json:"winningTrades"`
	LosingTrades    int       `json:"losingTrades"`
	WinRate         float64   `json:"winRate"`
	TotalProfit     float64   `json:"totalProfit"`
	TotalLoss       float64   `json:"totalLoss"`
	NetProfit       float64   `json:"netProfit"`
	LargestWin      float64   `json:"largestWin"`
	LargestLoss     float64   `json:"largestLoss"`
	AvgTradeSize    float64   `json:"avgTradeSize"`
	TotalVolume     float64   `json:"totalVolume"`
	TotalCommission float64   `json:"totalCommission"`
	LastUpdated     time.Time `json:"lastUpdated"`
}

func NewTradingHistoryService(logger *logrus.Logger, redisClient *redis.Client) *TradingHistoryService {
	return &TradingHistoryService{
		logger: logger,
		redis:  redisClient,
	}
}

// 記錄交易
func (s *TradingHistoryService) RecordTrade(orderID, userID, symbol, side string, 
	quantity, price float64, orderType string, marketQuote *StockQuote) (*TradeRecord, error) {
	
	// 計算手續費（0.25%）
	amount := quantity * price
	commission := amount * 0.0025
	netAmount := amount
	
	if side == "buy" {
		netAmount = amount + commission // 買入時加手續費
	} else {
		netAmount = amount - commission // 賣出時減手續費
	}

	// 創建交易記錄
	trade := &TradeRecord{
		ID:           uuid.New().String(),
		OrderID:      orderID,
		UserID:       userID,
		Symbol:       symbol,
		Side:         side,
		Quantity:     quantity,
		Price:        price,
		Amount:       amount,
		Commission:   commission,
		NetAmount:    netAmount,
		OrderType:    orderType,
		ExecutedAt:   time.Now(),
		MarketPrice:  marketQuote.Price,
		PriceChange:  price - marketQuote.Price,
		IsMarketOpen: marketQuote.IsMarketOpen,
		Currency:     marketQuote.Currency,
		Exchange:     marketQuote.Exchange,
		Notes:        fmt.Sprintf("%s %s %g shares at $%.2f", side, symbol, quantity, price),
	}

	// 保存到Redis
	if err := s.saveTrade(trade); err != nil {
		return nil, err
	}

	// 更新投資組合
	if err := s.updatePortfolio(trade, marketQuote); err != nil {
		s.logger.WithError(err).Error("更新投資組合失敗")
	}

	// 更新交易統計
	if err := s.updateTradingStats(trade); err != nil {
		s.logger.WithError(err).Error("更新交易統計失敗")
	}

	s.logger.WithFields(logrus.Fields{
		"tradeId":   trade.ID,
		"orderId":   orderID,
		"symbol":    symbol,
		"side":      side,
		"quantity":  quantity,
		"price":     price,
		"amount":    amount,
		"commission": commission,
	}).Info("交易記錄已保存")

	return trade, nil
}

// 保存交易記錄
func (s *TradingHistoryService) saveTrade(trade *TradeRecord) error {
	tradeJSON, err := json.Marshal(trade)
	if err != nil {
		return err
	}

	ctx := context.Background()
	
	// 保存個別交易記錄
	tradeKey := fmt.Sprintf("trade:%s", trade.ID)
	if err := s.redis.Set(ctx, tradeKey, tradeJSON, time.Hour*24*365).Err(); err != nil {
		return err
	}

	// 添加到用戶交易列表
	userTradesKey := fmt.Sprintf("user_trades:%s", trade.UserID)
	s.redis.LPush(ctx, userTradesKey, trade.ID)
	s.redis.Expire(ctx, userTradesKey, time.Hour*24*365)

	// 添加到股票交易列表
	symbolTradesKey := fmt.Sprintf("symbol_trades:%s", trade.Symbol)
	s.redis.LPush(ctx, symbolTradesKey, trade.ID)
	s.redis.Expire(ctx, symbolTradesKey, time.Hour*24*30)

	// 添加到日期索引
	dateKey := fmt.Sprintf("trades_date:%s", trade.ExecutedAt.Format("2006-01-02"))
	s.redis.LPush(ctx, dateKey, trade.ID)
	s.redis.Expire(ctx, dateKey, time.Hour*24*90)

	return nil
}

// 更新投資組合
func (s *TradingHistoryService) updatePortfolio(trade *TradeRecord, marketQuote *StockQuote) error {
	ctx := context.Background()
	portfolioKey := fmt.Sprintf("portfolio:%s", trade.UserID)
	
	// 獲取現有投資組合
	portfolio, err := s.getPortfolio(trade.UserID)
	if err != nil {
		// 創建新投資組合
		portfolio = &Portfolio{
			UserID:      trade.UserID,
			Positions:   make(map[string]*Position),
			CashBalance: 100000.0, // 初始資金10萬美元
			TotalValue:  100000.0,
			TotalPL:     0,
			DayPL:       0,
			LastUpdated: time.Now(),
		}
	}

	// 更新現金餘額
	if trade.Side == "buy" {
		portfolio.CashBalance -= trade.NetAmount
	} else {
		portfolio.CashBalance += trade.NetAmount
	}

	// 更新持倉
	position, exists := portfolio.Positions[trade.Symbol]
	if !exists {
		position = &Position{
			Symbol:        trade.Symbol,
			Quantity:      0,
			AvgCost:       0,
			MarketValue:   0,
			UnrealizedPL:  0,
			DayPL:         0,
			LastPrice:     marketQuote.Price,
			PreviousClose: marketQuote.PreviousClose,
			LastUpdated:   time.Now(),
		}
		portfolio.Positions[trade.Symbol] = position
	}

	if trade.Side == "buy" {
		// 買入：更新平均成本
		totalCost := position.Quantity*position.AvgCost + trade.Quantity*trade.Price
		position.Quantity += trade.Quantity
		if position.Quantity > 0 {
			position.AvgCost = totalCost / position.Quantity
		}
	} else {
		// 賣出：減少持倉
		position.Quantity -= trade.Quantity
		if position.Quantity <= 0 {
			delete(portfolio.Positions, trade.Symbol)
		}
	}

	// 更新市值和損益
	if position.Quantity > 0 {
		position.MarketValue = position.Quantity * marketQuote.Price
		position.UnrealizedPL = position.MarketValue - (position.Quantity * position.AvgCost)
		position.DayPL = position.Quantity * (marketQuote.Price - marketQuote.PreviousClose)
		position.LastPrice = marketQuote.Price
		position.LastUpdated = time.Now()
	}

	// 計算總市值和損益
	portfolio.TotalValue = portfolio.CashBalance
	portfolio.TotalPL = 0
	portfolio.DayPL = 0

	for _, pos := range portfolio.Positions {
		portfolio.TotalValue += pos.MarketValue
		portfolio.TotalPL += pos.UnrealizedPL
		portfolio.DayPL += pos.DayPL
	}

	portfolio.LastUpdated = time.Now()

	// 保存投資組合
	portfolioJSON, err := json.Marshal(portfolio)
	if err != nil {
		return err
	}

	return s.redis.Set(ctx, portfolioKey, portfolioJSON, time.Hour*24*365).Err()
}

// 更新交易統計
func (s *TradingHistoryService) updateTradingStats(trade *TradeRecord) error {
	ctx := context.Background()
	statsKey := fmt.Sprintf("trading_stats:%s", trade.UserID)
	
	// 獲取現有統計
	stats, err := s.getTradingStats(trade.UserID)
	if err != nil {
		stats = &TradingStats{
			UserID:      trade.UserID,
			LastUpdated: time.Now(),
		}
	}

	stats.TotalTrades++
	stats.TotalVolume += trade.Amount
	stats.TotalCommission += trade.Commission
	stats.AvgTradeSize = stats.TotalVolume / float64(stats.TotalTrades)

	// 計算損益（僅對賣出交易）
	if trade.Side == "sell" {
		// 簡化計算：假設賣出價高於平均成本則為盈利
		if trade.Price > trade.MarketPrice*0.95 { // 假設平均成本為市價的95%
			profit := trade.NetAmount - (trade.Quantity * trade.MarketPrice * 0.95)
			stats.WinningTrades++
			stats.TotalProfit += profit
			if profit > stats.LargestWin {
				stats.LargestWin = profit
			}
		} else {
			loss := (trade.Quantity * trade.MarketPrice * 0.95) - trade.NetAmount
			stats.LosingTrades++
			stats.TotalLoss += loss
			if loss > stats.LargestLoss {
				stats.LargestLoss = loss
			}
		}
	}

	stats.NetProfit = stats.TotalProfit - stats.TotalLoss
	if stats.TotalTrades > 0 {
		stats.WinRate = float64(stats.WinningTrades) / float64(stats.TotalTrades) * 100
	}
	stats.LastUpdated = time.Now()

	// 保存統計
	statsJSON, err := json.Marshal(stats)
	if err != nil {
		return err
	}

	return s.redis.Set(ctx, statsKey, statsJSON, time.Hour*24*365).Err()
}

// 獲取用戶交易歷史
func (s *TradingHistoryService) GetUserTrades(userID string, limit int) ([]*TradeRecord, error) {
	ctx := context.Background()
	userTradesKey := fmt.Sprintf("user_trades:%s", userID)
	
	// 獲取交易ID列表
	tradeIDs, err := s.redis.LRange(ctx, userTradesKey, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}

	trades := make([]*TradeRecord, 0, len(tradeIDs))
	
	for _, tradeID := range tradeIDs {
		tradeKey := fmt.Sprintf("trade:%s", tradeID)
		tradeJSON, err := s.redis.Get(ctx, tradeKey).Result()
		if err != nil {
			continue
		}

		var trade TradeRecord
		if err := json.Unmarshal([]byte(tradeJSON), &trade); err != nil {
			continue
		}

		trades = append(trades, &trade)
	}

	return trades, nil
}

// 獲取投資組合
func (s *TradingHistoryService) getPortfolio(userID string) (*Portfolio, error) {
	ctx := context.Background()
	portfolioKey := fmt.Sprintf("portfolio:%s", userID)
	
	portfolioJSON, err := s.redis.Get(ctx, portfolioKey).Result()
	if err != nil {
		return nil, err
	}

	var portfolio Portfolio
	if err := json.Unmarshal([]byte(portfolioJSON), &portfolio); err != nil {
		return nil, err
	}

	return &portfolio, nil
}

// 獲取投資組合（公開方法）
func (s *TradingHistoryService) GetPortfolio(userID string) (*Portfolio, error) {
	return s.getPortfolio(userID)
}

// 獲取交易統計
func (s *TradingHistoryService) getTradingStats(userID string) (*TradingStats, error) {
	ctx := context.Background()
	statsKey := fmt.Sprintf("trading_stats:%s", userID)
	
	statsJSON, err := s.redis.Get(ctx, statsKey).Result()
	if err != nil {
		return nil, err
	}

	var stats TradingStats
	if err := json.Unmarshal([]byte(statsJSON), &stats); err != nil {
		return nil, err
	}

	return &stats, nil
}

// 獲取交易統計（公開方法）
func (s *TradingHistoryService) GetTradingStats(userID string) (*TradingStats, error) {
	return s.getTradingStats(userID)
}

// 獲取股票交易歷史
func (s *TradingHistoryService) GetSymbolTrades(symbol string, limit int) ([]*TradeRecord, error) {
	ctx := context.Background()
	symbolTradesKey := fmt.Sprintf("symbol_trades:%s", symbol)
	
	tradeIDs, err := s.redis.LRange(ctx, symbolTradesKey, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}

	trades := make([]*TradeRecord, 0, len(tradeIDs))
	
	for _, tradeID := range tradeIDs {
		tradeKey := fmt.Sprintf("trade:%s", tradeID)
		tradeJSON, err := s.redis.Get(ctx, tradeKey).Result()
		if err != nil {
			continue
		}

		var trade TradeRecord
		if err := json.Unmarshal([]byte(tradeJSON), &trade); err != nil {
			continue
		}

		trades = append(trades, &trade)
	}

	return trades, nil
} 