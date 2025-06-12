# 金融微服務eBPF演示系統

這是一個功能完整的金融交易平台演示系統，包含前端React應用和四個Go微服務後端。系統使用真實的API連接，不再依賴模擬數據。

## 🏗️ 系統架構

### 前端 (React + TypeScript + Vite)
- **端口**: 5173
- **框架**: React 18 + TypeScript + Vite + Ant Design
- **頁面**: 儀表板、投資組合、交易、監控、設定
- **特性**: 實時數據更新、響應式設計、完整的API集成

### 後端微服務

| 服務名稱 | 端口 | 狀態 | 描述 |
|---------|------|------|------|
| **Trading API** | 30080 | ✅ 健康 | 交易訂單處理、投資組合管理、市場數據 |
| **Risk Engine** | 30081 | ✅ 健康 | 風險評估、限額控制、告警系統 |
| **Payment Gateway** | 30082 | ✅ 健康 | 支付處理、退款管理、外部API集成 |
| **Audit Service** | 30083 | ✅ 健康 | 審計日誌、合規監控、事件追蹤 |

## 🚀 快速開始

### 1. 啟動後端服務

每個服務都有自己的配置文件，確保正確的端口配置：

```bash
# 啟動所有後端服務
cd backend/trading-api && ./trading-api > trading-api.log 2>&1 &
cd ../risk-engine && ./risk-engine > risk-engine.log 2>&1 &
cd ../payment-gateway && ./main > payment-gateway.log 2>&1 &
cd ../audit-service && ./audit-service > audit-service.log 2>&1 &
```

### 2. 啟動前端

```bash
cd frontend
npm install
npm run dev
```

前端將在 http://localhost:5173 上運行

### 3. 驗證服務狀態

```bash
# 檢查所有服務健康狀態
curl http://localhost:30080/health  # Trading API
curl http://localhost:30081/health  # Risk Engine  
curl http://localhost:30082/health  # Payment Gateway
curl http://localhost:30083/health  # Audit Service
```

## 📊 功能特性

### 儀表板頁面
- ✅ **真實API集成** - 不再使用模擬數據
- 📈 投資組合數據來自 Trading API `/api/v1/portfolio`
- 📋 最近訂單來自 Trading API `/api/v1/orders?limit=10`
- 📊 交易統計來自 Trading API `/api/v1/trading-stats`
- 🔒 安全事件來自 Audit Service `/audit/search`
- ⏱️ **實時更新**: 投資組合(30s)、訂單(15s)、安全事件(20s)

### 監控頁面
- ✅ **真實服務監控** - 連接實際的微服務健康檢查
- 🏥 微服務健康狀態監控 (`/health` endpoints)
- 📈 系統指標來自 Prometheus metrics (`/metrics` endpoints)
- 🔄 **自動刷新**: 健康檢查(30s)、系統指標(15s)
- 🌐 **CORS支持** - 所有服務都支持跨域請求

### 其他頁面
- 📈 **投資組合頁面** - 真實API數據展示
- 💹 **交易頁面** - 完整的訂單管理功能
- ⚙️ **設定頁面** - 用戶配置和系統設置

## 🔧 技術配置

### 服務配置
每個服務都有獨立的 `config.yaml` 配置文件：

```yaml
# 示例配置 (Risk Engine)
server:
  port: "30081"
  host: "0.0.0.0"
  mode: "release"

database:
  host: "localhost"
  port: "5432"
  user: "postgres"
  password: "password"
  dbname: "fintech_demo"

redis:
  host: "localhost"
  port: "6379"
  password: ""
  db: 0
```

### CORS設置
所有後端服務都配置了CORS支持：
- **允許的來源**: `*` (所有來源)
- **允許的方法**: `GET, POST, PUT, DELETE, OPTIONS`
- **允許的頭部**: `Origin, Content-Type, Accept, Authorization, X-User-Id`

### API端點

#### Trading API (30080)
- `GET /health` - 健康檢查
- `GET /api/v1/portfolio` - 獲取投資組合
- `GET /api/v1/orders` - 獲取訂單列表
- `GET /api/v1/trading-stats` - 獲取交易統計
- `GET /metrics` - Prometheus指標

#### Risk Engine (30081)
- `GET /health` - 健康檢查
- `POST /risk/evaluate` - 風險評估
- `GET /risk/limits` - 風險限額
- `GET /metrics` - Prometheus指標

#### Payment Gateway (30082)
- `GET /health` - 健康檢查  
- `POST /payment/process` - 處理支付
- `GET /payment/status/:id` - 支付狀態
- `GET /metrics` - Prometheus指標

#### Audit Service (30083)
- `GET /health` - 健康檢查
- `GET /audit/search` - 搜索審計日誌
- `POST /audit/log` - 記錄審計事件
- `GET /metrics` - Prometheus指標

## 🐛 故障排除

### 常見問題

1. **服務無法啟動**
   ```bash
   # 檢查端口是否被佔用
   netstat -an | grep LISTEN | grep -E "(30080|30081|30082|30083)"
   
   # 檢查服務日誌
   cat backend/*/**.log
   ```

2. **前端CORS錯誤**
   - 確認所有後端服務已正確配置CORS
   - 檢查服務是否支持OPTIONS預檢請求

3. **前端顯示錯誤狀態**
   - 驗證所有服務的健康檢查端點
   - 確認服務運行在正確的端口上

### 服務狀態檢查

```bash
# 檢查所有服務進程
ps aux | grep -E "(trading-api|risk-engine|main|audit-service)" | grep -v grep

# 檢查端口監聽
netstat -an | grep LISTEN | grep -E "(30080|30081|30082|30083)"

# 測試健康檢查
for port in 30080 30081 30082 30083; do
  echo "Testing port $port:"
  curl -s http://localhost:$port/health | jq '.' || echo "Failed"
done
```

## 📈 監控和指標

### Prometheus指標
所有服務都暴露 `/metrics` 端點，提供：
- **請求計數和延遲**
- **系統資源使用情況**
- **業務特定指標**
- **錯誤率和可用性**

### 日誌記錄
- **結構化日誌** - 所有服務使用JSON格式
- **審計追蹤** - 完整的操作記錄
- **錯誤追蹤** - 詳細的錯誤信息和堆棧追蹤

## 🔐 安全特性

- **CORS保護** - 適當的跨域資源共享配置
- **請求驗證** - 輸入數據驗證和清理
- **審計日誌** - 所有操作的完整記錄
- **錯誤處理** - 安全的錯誤響應

## 🎯 下一步開發

- [ ] 添加用戶認證和授權
- [ ] 實現真實的數據庫集成
- [ ] 添加更多的監控指標
- [ ] 實現服務間通信安全
- [ ] 添加自動化測試

---

**最後更新**: 2025-06-05  
**狀態**: ✅ 所有服務正常運行，真實API集成完成