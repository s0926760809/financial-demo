-- 版本: 2.0 (模擬交易系統)

-- 創建股票信息表
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    sector VARCHAR(100),
    market_cap BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入支持的股票信息
INSERT INTO stocks (symbol, company_name, exchange, sector, market_cap) VALUES
    ('AAPL', 'Apple Inc.', 'NASDAQ', 'Technology', 3000000000000),
    ('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'Technology', 1800000000000),
    ('MSFT', 'Microsoft Corp.', 'NASDAQ', 'Technology', 2800000000000),
    ('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'Consumer Discretionary', 1500000000000),
    ('TSLA', 'Tesla Inc.', 'NASDAQ', 'Consumer Discretionary', 800000000000),
    ('META', 'Meta Platforms Inc.', 'NASDAQ', 'Technology', 750000000000),
    ('NFLX', 'Netflix Inc.', 'NASDAQ', 'Communication Services', 180000000000),
    ('NVDA', 'NVIDIA Corp.', 'NASDAQ', 'Technology', 1700000000000),
    ('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'Financial Services', 450000000000),
    ('JNJ', 'Johnson & Johnson', 'NYSE', 'Healthcare', 420000000000),
    ('V', 'Visa Inc.', 'NYSE', 'Financial Services', 480000000000),
    ('PG', 'Procter & Gamble Co.', 'NYSE', 'Consumer Staples', 350000000000),
    ('MA', 'Mastercard Inc.', 'NYSE', 'Financial Services', 350000000000),
    ('UNH', 'UnitedHealth Group Inc.', 'NYSE', 'Healthcare', 490000000000),
    ('HD', 'Home Depot Inc.', 'NYSE', 'Consumer Discretionary', 320000000000),
    ('DIS', 'Walt Disney Co.', 'NYSE', 'Communication Services', 180000000000),
    ('PYPL', 'PayPal Holdings Inc.', 'NASDAQ', 'Financial Services', 70000000000),
    ('BAC', 'Bank of America Corp.', 'NYSE', 'Financial Services', 280000000000),
    ('VZ', 'Verizon Communications Inc.', 'NYSE', 'Communication Services', 160000000000),
    ('ADBE', 'Adobe Inc.', 'NASDAQ', 'Technology', 220000000000)
ON CONFLICT (symbol) DO NOTHING;

-- 創建系統配置表
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入系統配置
INSERT INTO system_config (config_key, config_value, description) VALUES
    ('trading_enabled', 'true', '是否啟用交易功能'),
    ('market_open_time', '09:30', '市場開放時間 (美東時間)'),
    ('market_close_time', '16:00', '市場關閉時間 (美東時間)'),
    ('commission_rate', '0.0025', '交易手續費率 (0.25%)'),
    ('max_order_size', '10000', '單筆訂單最大數量'),
    ('initial_balance', '100000', '初始資金 (美元)'),
    ('yahoo_finance_enabled', 'true', '是否啟用Yahoo Finance API'),
    ('real_price_trading', 'true', '是否使用真實價格交易')
ON CONFLICT (config_key) DO NOTHING;

-- 創建用戶表 (簡化版)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(100),
    initial_balance DECIMAL(15,2) DEFAULT 100000.00,
    current_balance DECIMAL(15,2) DEFAULT 100000.00,
    total_trades INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入演示用戶
INSERT INTO users (user_id, email, display_name) VALUES
    ('demo_user', 'demo@example.com', 'Demo User'),
    ('test_user', 'test@example.com', 'Test User')
ON CONFLICT (user_id) DO NOTHING;

-- 創建市場時間表
CREATE TABLE IF NOT EXISTS market_schedule (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    is_trading_day BOOLEAN DEFAULT true,
    market_open TIME DEFAULT '09:30:00',
    market_close TIME DEFAULT '16:00:00',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入本週的交易日程
INSERT INTO market_schedule (date, is_trading_day, notes) VALUES
    (CURRENT_DATE, true, '今日交易'),
    (CURRENT_DATE + INTERVAL '1 day', true, '明日交易'),
    (CURRENT_DATE + INTERVAL '2 days', true, '後天交易')
ON CONFLICT (date) DO NOTHING;

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_market_schedule_date ON market_schedule(date);

-- 更新時間戳觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為表添加更新時間戳觸發器
DROP TRIGGER IF EXISTS update_stocks_updated_at ON stocks;
CREATE TRIGGER update_stocks_updated_at 
    BEFORE UPDATE ON stocks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入示例數據完成提示
INSERT INTO system_config (config_key, config_value, description) VALUES
    ('database_initialized', 'true', '數據庫已初始化標記')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

-- 輸出初始化完成信息
DO $$
BEGIN
    RAISE NOTICE '🎉 金融微服務模擬交易系統數據庫初始化完成!';
    RAISE NOTICE '📊 已創建 % 支持股票', (SELECT COUNT(*) FROM stocks);
    RAISE NOTICE '👥 已創建 % 演示用戶', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '⚙️  已配置 % 系統參數', (SELECT COUNT(*) FROM system_config);
    RAISE NOTICE '🚀 系統準備就緒，可開始模擬交易!';
END $$; 