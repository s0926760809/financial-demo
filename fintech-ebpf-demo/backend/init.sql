-- 金融微服務數據庫初始化腳本
-- 創建基礎表結構用於交易、風險、支付和審計服務

-- 用戶表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    risk_level INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 賬戶表
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(20) DEFAULT 'trading',
    balance DECIMAL(15,2) DEFAULT 0.00,
    available_balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 股票信息表
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    exchange VARCHAR(20),
    sector VARCHAR(50),
    current_price DECIMAL(10,2),
    previous_close DECIMAL(10,2),
    market_cap BIGINT,
    volume BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 持倉表
CREATE TABLE IF NOT EXISTS holdings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    stock_id INTEGER REFERENCES stocks(id),
    symbol VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    avg_price DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_id)
);

-- 訂單表
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    stock_id INTEGER REFERENCES stocks(id),
    symbol VARCHAR(10) NOT NULL,
    order_type VARCHAR(20) NOT NULL, -- MARKET, LIMIT, STOP
    side VARCHAR(4) NOT NULL, -- BUY, SELL
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2),
    filled_quantity INTEGER DEFAULT 0,
    remaining_quantity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, FILLED, PARTIAL, CANCELLED, REJECTED
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    filled_date TIMESTAMP,
    commission DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 交易記錄表
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    user_id INTEGER REFERENCES users(id),
    symbol VARCHAR(10) NOT NULL,
    side VARCHAR(4) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    commission DECIMAL(10,2) DEFAULT 0.00,
    trade_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 風險指標表
CREATE TABLE IF NOT EXISTS risk_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    portfolio_value DECIMAL(15,2),
    var_95 DECIMAL(15,2), -- Value at Risk 95%
    beta DECIMAL(5,3),
    sharpe_ratio DECIMAL(5,3),
    volatility DECIMAL(5,3),
    max_drawdown DECIMAL(5,3),
    risk_score INTEGER,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 支付記錄表
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    payment_type VARCHAR(20) NOT NULL, -- DEPOSIT, WITHDRAWAL
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    reference_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING',
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 審計日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系統配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始股票數據
INSERT INTO stocks (symbol, name, exchange, sector, current_price, previous_close, market_cap, volume) VALUES
('AAPL', '蘋果公司', 'NASDAQ', '科技股', 175.43, 173.28, 2800000000000, 45678900),
('TSLA', '特斯拉', 'NASDAQ', '汽車股', 234.56, 240.23, 745000000000, 67890123),
('MSFT', '微軟', 'NASDAQ', '科技股', 345.67, 336.77, 2600000000000, 23456789),
('GOOGL', '谷歌', 'NASDAQ', '科技股', 2567.89, 2555.55, 1700000000000, 12345678),
('AMZN', '亞馬遜', 'NASDAQ', '科技股', 3245.12, 3231.45, 1650000000000, 8765432),
('NVDA', '英偉達', 'NASDAQ', '科技股', 890.45, 885.20, 2200000000000, 15678901)
ON CONFLICT (symbol) DO NOTHING;

-- 插入測試用戶
INSERT INTO users (username, email, password_hash, full_name, phone, risk_level) VALUES
('demo_user', 'demo@fintech.com', '$2a$10$example.hash.value', 'Demo User', '+1234567890', 7),
('test_trader', 'trader@fintech.com', '$2a$10$example.hash.value', 'Test Trader', '+1234567891', 8)
ON CONFLICT (username) DO NOTHING;

-- 插入測試賬戶
INSERT INTO accounts (user_id, account_number, balance, available_balance) VALUES
(1, 'ACC-20231201-001', 100000.00, 75000.00),
(2, 'ACC-20231201-002', 250000.00, 180000.00)
ON CONFLICT (account_number) DO NOTHING;

-- 插入測試持倉
INSERT INTO holdings (user_id, stock_id, symbol, quantity, avg_price, total_cost) VALUES
(1, 1, 'AAPL', 150, 165.50, 24825.00),
(1, 2, 'TSLA', 80, 245.00, 19600.00),
(1, 3, 'MSFT', 60, 330.00, 19800.00)
ON CONFLICT (user_id, stock_id) DO NOTHING;

-- 插入系統配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('trading_hours_start', '09:30', '交易開始時間'),
('trading_hours_end', '16:00', '交易結束時間'),
('max_position_size', '40', '單一持倉最大占比(%)'),
('commission_rate', '0.25', '交易手續費率(%)'),
('risk_var_threshold', '20000', 'VaR風險閾值'),
('max_daily_trades', '50', '每日最大交易次數')
ON CONFLICT (config_key) DO NOTHING;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 更新時間戳觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要的表添加更新觸發器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stocks_updated_at ON stocks;
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_holdings_updated_at ON holdings;
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 