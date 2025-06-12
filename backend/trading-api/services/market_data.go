package services

import (
	"context"
	"fmt"
	"time"
	"strings"
	"encoding/json"
	"net/http"
	"io"
	"math/rand"

	"github.com/sirupsen/logrus"
	"github.com/go-redis/redis/v8"
)

var (
	// Rand 是一個導出的隨機數生成器，以便在其他包中獲得可重現的隨機性
	Rand = rand.New(rand.NewSource(time.Now().UnixNano()))
)

type MarketDataService struct {
	logger *logrus.Logger
	redis  *redis.Client
}

type StockQuote struct {
	Symbol           string  `json:"symbol"`
	Price            float64 `json:"price"`
	PreviousClose    float64 `json:"previousClose"`
	Open             float64 `json:"open"`
	High             float64 `json:"high"`
	Low              float64 `json:"low"`
	Volume           int64   `json:"volume"`
	MarketCap        int64   `json:"marketCap"`
	PERatio          float64 `json:"peRatio"`
	EPS              float64 `json:"eps"`
	DividendYield    float64 `json:"dividendYield"`
	Beta             float64 `json:"beta"`
	LastUpdated      time.Time `json:"lastUpdated"`
	IsMarketOpen     bool    `json:"isMarketOpen"`
	Currency         string  `json:"currency"`
	Exchange         string  `json:"exchange"`
	CompanyName      string  `json:"companyName"`
	ChangePercent    float64 `json:"changePercent"`
	Change           float64 `json:"change"`
}

type YahooFinanceResponse struct {
	QuoteResponse struct {
		Result []struct {
			Symbol                          string  `json:"symbol"`
			RegularMarketPrice              float64 `json:"regularMarketPrice"`
			RegularMarketPreviousClose      float64 `json:"regularMarketPreviousClose"`
			RegularMarketOpen               float64 `json:"regularMarketOpen"`
			RegularMarketDayHigh            float64 `json:"regularMarketDayHigh"`
			RegularMarketDayLow             float64 `json:"regularMarketDayLow"`
			RegularMarketVolume             int64   `json:"regularMarketVolume"`
			MarketCap                       int64   `json:"marketCap"`
			TrailingPE                      float64 `json:"trailingPE"`
			EpsTrailingTwelveMonths         float64 `json:"epsTrailingTwelveMonths"`
			DividendYield                   float64 `json:"dividendYield"`
			Beta                            float64 `json:"beta"`
			RegularMarketTime               int64   `json:"regularMarketTime"`
			Currency                        string  `json:"currency"`
			FullExchangeName                string  `json:"fullExchangeName"`
			ShortName                       string  `json:"shortName"`
			RegularMarketChange             float64 `json:"regularMarketChange"`
			RegularMarketChangePercent      float64 `json:"regularMarketChangePercent"`
			MarketState                     string  `json:"marketState"`
		} `json:"result"`
	} `json:"quoteResponse"`
}

func NewMarketDataService(logger *logrus.Logger, redisClient *redis.Client) *MarketDataService {
	return &MarketDataService{
		logger: logger,
		redis:  redisClient,
	}
}

// 獲取實時股價
func (s *MarketDataService) GetStockQuote(symbol string) (*StockQuote, error) {
	// 首先檢查Redis緩存
	cacheKey := fmt.Sprintf("quote:%s", symbol)
	cached, err := s.redis.Get(context.Background(), cacheKey).Result()
	
	if err == nil {
		var quote StockQuote
		if json.Unmarshal([]byte(cached), &quote) == nil {
			// 檢查緩存是否過期（1分鐘）
			if time.Since(quote.LastUpdated) < time.Minute {
				s.logger.WithField("symbol", symbol).Debug("從緩存返回股價")
				return &quote, nil
			}
		}
	}

	// 從Yahoo Finance API獲取實時數據
	quote, err := s.fetchFromYahooFinance(symbol)
	if err != nil {
		s.logger.WithError(err).WithField("symbol", symbol).Error("獲取Yahoo Finance數據失敗")
		return nil, err
	}

	// 緩存結果
	quoteJSON, _ := json.Marshal(quote)
	s.redis.Set(context.Background(), cacheKey, quoteJSON, time.Minute*5)

	return quote, nil
}

// 從Yahoo Finance API獲取數據
func (s *MarketDataService) fetchFromYahooFinance(symbol string) (*StockQuote, error) {
	// Yahoo Finance API URL
	url := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s", symbol)
	
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// 設置請求頭
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Yahoo Finance API 返回狀態碼: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// 解析Yahoo Finance響應
	return s.parseYahooResponse(body, symbol)
}

// 解析Yahoo Finance響應
func (s *MarketDataService) parseYahooResponse(data []byte, symbol string) (*StockQuote, error) {
	var response struct {
		Chart struct {
			Result []struct {
				Meta struct {
					Currency              string  `json:"currency"`
					Symbol                string  `json:"symbol"`
					ExchangeName          string  `json:"exchangeName"`
					RegularMarketPrice    float64 `json:"regularMarketPrice"`
					PreviousClose         float64 `json:"previousClose"`
					ChartPreviousClose    float64 `json:"chartPreviousClose"`
					RegularMarketTime     int64   `json:"regularMarketTime"`
					CurrentTradingPeriod  struct {
						Regular struct {
							Start int64 `json:"start"`
							End   int64 `json:"end"`
						} `json:"regular"`
					} `json:"currentTradingPeriod"`
				} `json:"meta"`
				Indicators struct {
					Quote []struct {
						High   []float64 `json:"high"`
						Low    []float64 `json:"low"`
						Open   []float64 `json:"open"`
						Close  []float64 `json:"close"`
						Volume []int64   `json:"volume"`
					} `json:"quote"`
				} `json:"indicators"`
			} `json:"result"`
		} `json:"chart"`
	}

	if err := json.Unmarshal(data, &response); err != nil {
		return nil, fmt.Errorf("解析Yahoo Finance響應失敗: %v", err)
	}

	if len(response.Chart.Result) == 0 {
		return nil, fmt.Errorf("未找到股票數據: %s", symbol)
	}

	result := response.Chart.Result[0]
	meta := result.Meta

	// 計算當前交易時間
	marketTime := time.Unix(meta.RegularMarketTime, 0)
	isMarketOpen := s.isMarketOpen(marketTime)

	// 獲取最新價格數據
	var high, low, open, volume float64 = 0, 0, 0, 0
	if len(result.Indicators.Quote) > 0 {
		quote := result.Indicators.Quote[0]
		if len(quote.High) > 0 {
			high = quote.High[len(quote.High)-1]
		}
		if len(quote.Low) > 0 {
			low = quote.Low[len(quote.Low)-1]
		}
		if len(quote.Open) > 0 {
			open = quote.Open[len(quote.Open)-1]
		}
		if len(quote.Volume) > 0 {
			volume = float64(quote.Volume[len(quote.Volume)-1])
		}
	}

	// 計算變化
	change := meta.RegularMarketPrice - meta.PreviousClose
	changePercent := (change / meta.PreviousClose) * 100

	stockQuote := &StockQuote{
		Symbol:           strings.ToUpper(symbol),
		Price:            meta.RegularMarketPrice,
		PreviousClose:    meta.PreviousClose,
		Open:             open,
		High:             high,
		Low:              low,
		Volume:           int64(volume),
		LastUpdated:      marketTime,
		IsMarketOpen:     isMarketOpen,
		Currency:         meta.Currency,
		Exchange:         meta.ExchangeName,
		CompanyName:      symbol, // Yahoo Finance API不提供公司名稱，使用symbol代替
		Change:           change,
		ChangePercent:    changePercent,
	}

	s.logger.WithFields(logrus.Fields{
		"symbol": symbol,
		"price":  stockQuote.Price,
		"change": change,
		"changePercent": changePercent,
	}).Info("獲取實時股價成功")

	return stockQuote, nil
}

// 判斷市場是否開放
func (s *MarketDataService) isMarketOpen(marketTime time.Time) bool {
	now := time.Now()
	
	// 簡化判斷：週一到週五，美東時間9:30-16:00
	weekday := now.Weekday()
	if weekday == time.Saturday || weekday == time.Sunday {
		return false
	}

	// 檢查時間差，如果市場時間在30分鐘內，認為市場開放
	timeDiff := now.Sub(marketTime)
	return timeDiff >= 0 && timeDiff < 30*time.Minute
}

// 批量獲取股價
func (s *MarketDataService) GetMultipleQuotes(symbols []string) (map[string]*StockQuote, error) {
	quotes := make(map[string]*StockQuote)
	
	for _, symbol := range symbols {
		quote, err := s.GetStockQuote(symbol)
		if err != nil {
			s.logger.WithError(err).WithField("symbol", symbol).Warn("獲取股價失敗")
			continue
		}
		quotes[symbol] = quote
	}
	
	return quotes, nil
}

// 檢查價格是否符合成交條件
func (s *MarketDataService) CheckOrderExecution(symbol string, orderType string, orderPrice float64, side string) (bool, float64, error) {
	quote, err := s.GetStockQuote(symbol)
	if err != nil {
		return false, 0, err
	}

	currentPrice := quote.Price
	executed := false
	executionPrice := currentPrice

	// 首先檢查基本價格條件
	switch orderType {
	case "market":
		// 市價單始終符合條件
		executed = true
		executionPrice = currentPrice
		
	case "limit":
		if side == "buy" {
			// 買入限價單：當前價格 <= 限價時符合條件
			executed = currentPrice <= orderPrice
			executionPrice = currentPrice
		} else if side == "sell" {
			// 賣出限價單：當前價格 >= 限價時符合條件
			executed = currentPrice >= orderPrice
			executionPrice = currentPrice
		}
		
	case "stop":
		if side == "buy" {
			// 買入止損單：當前價格 >= 止損價時觸發
			executed = currentPrice >= orderPrice
			executionPrice = currentPrice
		} else if side == "sell" {
			// 賣出止損單：當前價格 <= 止損價時觸發
			executed = currentPrice <= orderPrice
			executionPrice = currentPrice
		}
	}

	// 如果基本條件不符合，直接返回
	if !executed {
		return false, currentPrice, nil
	}

	// 基本條件符合後，應用隨機成交率邏輯
	rand.Seed(time.Now().UnixNano())
	
	var fillRatio float64
	
	// GOOGL 特殊處理 - 70%-100%成交率
	if strings.ToUpper(symbol) == "GOOGL" {
		fillRatio = 0.7 + rand.Float64()*0.3 // 0.7-1.0
		s.logger.WithFields(logrus.Fields{
			"symbol": symbol,
			"fillRatio": fillRatio,
			"orderType": orderType,
			"side": side,
		}).Info("GOOGL訂單成交檢查 - 高成交率")
	} else {
		// 其他股票 - 30%-100%成交率
		fillRatio = 0.3 + rand.Float64()*0.7 // 0.3-1.0
		s.logger.WithFields(logrus.Fields{
			"symbol": symbol,
			"fillRatio": fillRatio,
			"orderType": orderType,
			"side": side,
		}).Info("其他股票成交檢查")
	}
	
	// >95%視為完全成交
	if fillRatio > 0.95 {
		s.logger.WithFields(logrus.Fields{
			"symbol": symbol,
			"fillRatio": fillRatio,
			"marketPrice": currentPrice,
			"orderPrice": orderPrice,
		}).Info("訂單完全成交")
		return true, executionPrice, nil
	}
	
	// 30%-95%範圍內的隨機成交
	if fillRatio > 0.3 {
		// 可以實現部分成交邏輯，目前簡化為完全成交
		s.logger.WithFields(logrus.Fields{
			"symbol": symbol,
			"fillRatio": fillRatio,
			"marketPrice": currentPrice,
			"orderPrice": orderPrice,
		}).Info("訂單成交")
		return true, executionPrice, nil
	}
	
	// 低於30%不成交
	s.logger.WithFields(logrus.Fields{
		"symbol": symbol,
		"fillRatio": fillRatio,
		"marketPrice": currentPrice,
		"orderPrice": orderPrice,
	}).Info("訂單未成交")
	return false, currentPrice, nil
}

// 獲取支持的股票列表
func (s *MarketDataService) GetSupportedStocks() []string {
	return []string{
		"AAPL",  // Apple
		"GOOGL", // Alphabet (Google)
		"MSFT",  // Microsoft
		"AMZN",  // Amazon
		"TSLA",  // Tesla
		"META",  // Meta (Facebook)
		"NFLX",  // Netflix
		"NVDA",  // NVIDIA
		"JPM",   // JPMorgan Chase
		"JNJ",   // Johnson & Johnson
		"V",     // Visa
		"PG",    // Procter & Gamble
		"MA",    // Mastercard
		"UNH",   // UnitedHealth
		"HD",    // Home Depot
		"DIS",   // Disney
		"PYPL",  // PayPal
		"BAC",   // Bank of America
		"VZ",    // Verizon
		"ADBE",  // Adobe
	}
} 