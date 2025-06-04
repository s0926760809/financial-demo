package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// 訂單請求
type OrderRequest struct {
	Symbol      string  `json:"symbol" binding:"required"`
	Side        string  `json:"side" binding:"required,oneof=buy sell"`
	OrderType   string  `json:"order_type" binding:"required,oneof=market limit stop"`
	Quantity    float64 `json:"quantity" binding:"required,gt=0"`
	Price       float64 `json:"price"`
	TimeInForce string  `json:"time_in_force,omitempty"`
}

// 訂單修改請求
type OrderUpdateRequest struct {
	Quantity  *float64 `json:"quantity,omitempty"`
	Price     *float64 `json:"price,omitempty"`
	OrderType *string  `json:"order_type,omitempty"`
}

// 訂單
type Order struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Symbol       string    `json:"symbol"`
	Side         string    `json:"side"`
	OrderType    string    `json:"order_type"`
	Quantity     float64   `json:"quantity"`
	Price        float64   `json:"price"`
	Status       string    `json:"status"`
	FilledQty    float64   `json:"filled_qty"`
	RemainingQty float64   `json:"remaining_qty"`
	AvgPrice     float64   `json:"avg_price"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	TimeInForce  string    `json:"time_in_force"`
}

// 訂單響應
type OrderResponse struct {
	Order      *Order                 `json:"order"`
	Message    string                 `json:"message"`
	Success    bool                   `json:"success"`
	MarketData map[string]interface{} `json:"marketData,omitempty"`
}

// 投資組合
type Portfolio struct {
	UserID      string      `json:"user_id"`
	TotalValue  float64     `json:"total_value"`
	CashBalance float64     `json:"cash_balance"`
	TotalPL     float64     `json:"total_pl"`
	Positions   []Position  `json:"positions"`
	LastUpdated time.Time   `json:"last_updated"`
}

// 持倉
type Position struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Symbol       string    `json:"symbol"`
	Quantity     float64   `json:"quantity"`
	AvgPrice     float64   `json:"avg_price"`
	MarketValue  float64   `json:"market_value"`
	UnrealizedPL float64   `json:"unrealized_pl"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// 投資組合響應
type PortfolioResponse struct {
	Portfolio *Portfolio `json:"portfolio"`
	Message   string     `json:"message"`
	Success   bool       `json:"success"`
}

// 交易事件
type TradeEvent struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"order_id"`
	UserID    string    `json:"user_id"`
	EventType string    `json:"event_type"`
	Symbol    string    `json:"symbol"`
	Quantity  float64   `json:"quantity"`
	Price     float64   `json:"price"`
	Metadata  JSONField `json:"metadata"`
	CreatedAt time.Time `json:"created_at"`
}

// 風險評估
type RiskAssessment struct {
	OrderID    string    `json:"order_id"`
	UserID     string    `json:"user_id"`
	RiskScore  float64   `json:"risk_score"`
	RiskLevel  string    `json:"risk_level"`
	Approved   bool      `json:"approved"`
	Reasons    []string  `json:"reasons"`
	AssessedAt time.Time `json:"assessed_at"`
}

// 健康檢查
type HealthCheck struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Version   string            `json:"version"`
	Services  map[string]string `json:"services"`
}

// 錯誤響應
type ErrorResponse struct {
	Error   string    `json:"error"`
	Code    int       `json:"code"`
	Message string    `json:"message"`
	Time    time.Time `json:"time"`
}

// JSON字段類型，用於存儲任意JSON數據
type JSONField map[string]interface{}

func (j JSONField) Value() (driver.Value, error) {
	return json.Marshal(j)
}

func (j *JSONField) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, j)
	case string:
		return json.Unmarshal([]byte(v), j)
	default:
		return fmt.Errorf("cannot scan %T into JSONField", value)
	}
} 