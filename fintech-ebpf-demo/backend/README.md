# 金融微服務 Demo 系統

這是一個專門為演示 Kubernetes + eBPF + Tetragon 安全能力而設計的金融微服務系統。

## 🏗️ 系統架構

### 微服務組件

1. **Trading API** (端口 8080)
   - 交易訂單處理
   - 投資組合管理
   - 故意包含命令執行漏洞

2. **Risk Engine** (端口 8081)
   - 實時風險評估
   - CPU密集計算
   - 頻繁Redis訪問
   - 敏感文件讀取

3. **Payment Gateway** (端口 8082)
   - 支付處理
   - 外部API調用
   - DNS查詢測試
   - 信用卡信息處理

4. **Audit Service** (端口 8083)
   - 審計日誌記錄
   - 實時事件推送 (WebSocket)
   - 文件寫入操作
   - 日誌搜索和導出

### 支持服務

- **PostgreSQL**: 主數據庫
- **Redis**: 緩存和會話存儲
- **Prometheus**: 指標收集
- **Grafana**: 監控儀表板

## 🚀 快速開始

### 前置要求

- Docker & Docker Compose
- Go 1.21+ (如果本地開發)
- 至少 4GB RAM

### 啟動系統

```bash
# 克隆項目
git clone <repository>
cd fintech-ebpf-demo/backend

# 構建並啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f trading-api
```

### 服務健康檢查

```bash
# 檢查所有服務健康狀態
curl http://localhost:8080/health  # Trading API
curl http://localhost:8081/health  # Risk Engine
curl http://localhost:8082/health  # Payment Gateway
curl http://localhost:8083/health  # Audit Service
```

## 📊 監控和指標

### Prometheus 指標
- 訪問: http://localhost:9090
- 查看各服務的業務和安全指標

### Grafana 儀表板
- 訪問: http://localhost:3000
- 用戶名: admin
- 密碼: admin123

## 🔒 安全演示功能

### 故意的安全漏洞

1. **命令執行漏洞** (Trading API)
   ```bash
   curl -X POST http://localhost:8080/debug/execute \
     -H "Content-Type: application/json" \
     -d '{"command": "ls", "args": ["-la", "/root"]}'
   ```

2. **敏感配置暴露** (所有服務)
   ```bash
   curl http://localhost:8080/debug/config
   curl http://localhost:8081/debug/config
   ```

3. **文件讀取漏洞** (Risk Engine)
   ```bash
   curl http://localhost:8081/debug/files
   ```

4. **任意文件讀取** (Audit Service)
   ```bash
   curl -X POST http://localhost:8083/debug/sensitive \
     -H "Content-Type: application/json" \
     -d '{"file_path": "/etc/passwd"}'
   ```

5. **DNS查詢測試** (Payment Gateway)
   ```bash
   curl -X POST http://localhost:8082/debug/dns \
     -H "Content-Type: application/json" \
     -d '{"domain": "malicious-site.com"}'
   ```

## 🧪 API 測試示例

### 創建交易訂單

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user_123" \
  -d '{
    "symbol": "AAPL",
    "side": "buy",
    "order_type": "market",
    "quantity": 100,
    "price": 150.0
  }'
```

### 風險評估

```bash
curl -X POST http://localhost:8081/risk/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_123",
    "user_id": "user_123",
    "symbol": "AAPL",
    "side": "buy",
    "quantity": 100,
    "price": 150.0,
    "order_type": "market"
  }'
```

### 支付處理

```bash
curl -X POST http://localhost:8082/payment/process \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_123",
    "user_id": "user_123",
    "amount": 15000,
    "currency": "USD",
    "method": "credit_card",
    "card_number": "4532123456789012",
    "expiry_month": 12,
    "expiry_year": 2025,
    "cvv": "123"
  }'
```

### 審計日誌記錄

```bash
curl -X POST http://localhost:8083/audit/log \
  -H "Content-Type: application/json" \
  -d '{
    "service": "trading-api",
    "action": "order_create",
    "user_id": "user_123",
    "resource_id": "ord_123",
    "details": {
      "symbol": "AAPL",
      "amount": 15000
    },
    "severity": "INFO",
    "status": "SUCCESS"
  }'
```

## 🔍 eBPF 監控重點

### 系統調用監控
- 文件操作 (open, read, write)
- 網絡連接 (connect, bind, listen)
- 進程執行 (execve, fork, clone)

### 安全事件檢測
- 敏感文件訪問 (`/etc/passwd`, `/root/.ssh/*`)
- 可疑命令執行 (`curl`, `wget`, `nc`)
- 異常網絡活動
- 權限提升嘗試

### 業務邏輯監控
- 大額交易處理
- 風險評估計算
- 支付信息處理
- 審計日誌寫入

## 📁 項目結構

```
backend/
├── trading-api/          # 交易API服務
│   ├── main.go
│   ├── config/
│   ├── handlers/
│   ├── models/
│   ├── metrics/
│   └── Dockerfile
├── risk-engine/          # 風險引擎服務
│   ├── main.go
│   └── Dockerfile
├── payment-gateway/      # 支付網關服務
│   ├── main.go
│   └── Dockerfile
├── audit-service/        # 審計服務
│   ├── main.go
│   └── Dockerfile
├── docker-compose.yml    # 服務編排
└── README.md
```

## ⚠️ 安全警告

**這個系統包含故意的安全漏洞，僅用於演示目的。請勿在生產環境中使用！**

### 已知安全問題

1. 默認弱密碼
2. 命令注入漏洞
3. 路徑遍歷漏洞
4. 敏感信息泄露
5. 權限過度提升
6. 不安全的文件權限
7. 未驗證的用戶輸入

## 📝 開發注意事項

### 環境變量

- `DATABASE_HOST`: PostgreSQL主機
- `DATABASE_USER`: 數據庫用戶名
- `DATABASE_PASSWORD`: 數據庫密碼
- `REDIS_HOST`: Redis主機
- `REDIS_PASSWORD`: Redis密碼
- `GIN_MODE`: Gin框架模式 (debug/release)

### 日誌級別

- INFO: 一般操作日誌
- WARN: 安全警告事件
- ERROR: 系統錯誤

### 指標類型

- Counter: 累計計數器
- Gauge: 瞬時值
- Histogram: 分佈統計

## 🔄 下一步

1. 部署到Kubernetes集群
2. 配置Tetragon eBPF策略
3. 集成前端React應用
4. 設置安全測試場景
5. 創建演示腳本

---

**版本**: 1.0.0  
**維護者**: FinTech Security Team  
**更新日期**: 2023-12-01 