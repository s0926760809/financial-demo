package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP請求指標
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trading_api_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "trading_api_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// 業務指標
	OrdersCreated = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trading_api_orders_created_total",
			Help: "Total number of orders created",
		},
		[]string{"symbol", "side", "order_type"},
	)

	OrdersExecuted = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trading_api_orders_executed_total",
			Help: "Total number of orders executed",
		},
		[]string{"symbol", "side", "status"},
	)

	TradingVolume = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "trading_api_volume_total",
			Help: "Total trading volume",
		},
		[]string{"symbol"},
	)

	// 系統指標
	ActiveUsers = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "trading_api_active_users",
			Help: "Number of active users",
		},
	)

	DatabaseConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "trading_api_db_connections",
			Help: "Number of database connections",
		},
	)

	RedisConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "trading_api_redis_connections",
			Help: "Number of Redis connections",
		},
	)

	// 風險指標
	RiskAssessments = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trading_api_risk_assessments_total",
			Help: "Total number of risk assessments",
		},
		[]string{"risk_level", "approved"},
	)

	HighRiskOrders = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "trading_api_high_risk_orders_total",
			Help: "Total number of high risk orders",
		},
	)

	// 安全指標 - 用於演示監控
	SuspiciousActivity = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trading_api_suspicious_activity_total",
			Help: "Total number of suspicious activities detected",
		},
		[]string{"type", "severity"},
	)

	UnauthorizedAccess = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trading_api_unauthorized_access_total",
			Help: "Total number of unauthorized access attempts",
		},
		[]string{"endpoint", "user_agent"},
	)

	SensitiveDataAccess = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trading_api_sensitive_data_access_total",
			Help: "Total number of sensitive data access events",
		},
		[]string{"endpoint", "data_type"},
	)

	CommandExecutions = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "trading_api_command_executions_total",
			Help: "Total number of command executions - security risk",
		},
		[]string{"command", "success"},
	)
)

// 初始化指標
func InitMetrics() {
	// 設置一些初始值
	ActiveUsers.Set(0)
	DatabaseConnections.Set(10)
	RedisConnections.Set(5)
}

// 記錄HTTP請求指標
func RecordHTTPRequest(method, endpoint, status string, duration float64) {
	HTTPRequestsTotal.WithLabelValues(method, endpoint, status).Inc()
	HTTPRequestDuration.WithLabelValues(method, endpoint).Observe(duration)
}

// 記錄訂單指標
func RecordOrderCreated(symbol, side, orderType string) {
	OrdersCreated.WithLabelValues(symbol, side, orderType).Inc()
}

func RecordOrderExecuted(symbol, side, status string) {
	OrdersExecuted.WithLabelValues(symbol, side, status).Inc()
}

// 記錄風險指標
func RecordRiskAssessment(riskLevel string, approved bool) {
	approvedStr := "false"
	if approved {
		approvedStr = "true"
	}
	RiskAssessments.WithLabelValues(riskLevel, approvedStr).Inc()

	if riskLevel == "HIGH" {
		HighRiskOrders.Inc()
	}
}

// 記錄安全事件 - 用於演示eBPF監控
func RecordSuspiciousActivity(activityType, severity string) {
	SuspiciousActivity.WithLabelValues(activityType, severity).Inc()
}

func RecordUnauthorizedAccess(endpoint, userAgent string) {
	UnauthorizedAccess.WithLabelValues(endpoint, userAgent).Inc()
}

func RecordSensitiveDataAccess(endpoint, dataType string) {
	SensitiveDataAccess.WithLabelValues(endpoint, dataType).Inc()
}

func RecordCommandExecution(command string, success bool) {
	successStr := "false"
	if success {
		successStr = "true"
	}
	CommandExecutions.WithLabelValues(command, successStr).Inc()
}

// 更新系統指標
func UpdateActiveUsers(count float64) {
	ActiveUsers.Set(count)
}

func UpdateTradingVolume(symbol string, volume float64) {
	TradingVolume.WithLabelValues(symbol).Set(volume)
} 