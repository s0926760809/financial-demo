# 🚀 金融微服務eBPF演示系統 - 腳本使用指南

## 📋 腳本總覽

| 腳本名稱 | 用途 | 特點 |
|---------|------|------|
| `quick_start.sh` | 標準啟動腳本 | 啟動所有可用服務，包含完整檢查 |
| `quick_start_fixed.sh` | 修復版啟動腳本 | 只啟動實際存在的服務 |
| `quick_stop.sh` | 智能停止腳本 | 安全停止，包含確認提示 |
| `force_stop.sh` | 強制停止腳本 | 立即停止，無需確認 |
| `start_trading_api.sh` | 單服務啟動 | 只啟動Trading API |
| `stop_system.sh` | 舊版停止腳本 | 由啟動腳本自動生成 |

## 🚀 啟動系統

### 方法一：使用修復版啟動腳本 (推薦)
```bash
./quick_start_fixed.sh
```

**特點：**
- ✅ 只啟動實際存在的服務 (Trading API + Frontend)
- ✅ 包含完整的依賴檢查
- ✅ 自動編譯和啟動
- ✅ 健康檢查驗證
- ✅ 提供測試命令

### 方法二：使用標準啟動腳本
```bash
./quick_start.sh
```

**特點：**
- ⚠️ 會嘗試啟動4個微服務 (部分可能不存在)
- ✅ 完整的系統檢查

### 方法三：只啟動 Trading API
```bash
./start_trading_api.sh
```

**適用場景：**
- 只需要後端API服務
- 前端已經在其他地方運行
- 開發調試單個服務

## 🛑 停止系統

### 方法一：智能停止 (推薦)
```bash
./quick_stop.sh
```

**特點：**
- 🔍 顯示當前系統狀態
- ⚠️ 需要用戶確認才執行
- 🧹 多層停止機制 (PID文件 → 端口 → 進程名)
- ✅ 自動清理臨時文件
- 📊 驗證停止結果

**停止步驟：**
1. 檢查並停止PID文件中的服務
2. 檢查並停止佔用端口的進程
3. 檢查並停止相關進程名
4. 清理PID文件和編譯文件
5. 驗證停止結果

### 方法二：強制停止 (緊急情況)
```bash
./force_stop.sh
```

**特點：**
- 🔫 立即強制殺死所有相關進程
- ❌ 無需確認，直接執行
- 🧹 自動清理文件
- ⚡ 速度最快

**適用場景：**
- 服務無響應
- 端口被佔用無法正常停止
- 緊急重啟需求

### 方法三：使用舊版停止腳本
```bash
./stop_system.sh
```

## 📊 檢查系統狀態

### 查看端口佔用
```bash
lsof -i :30080  # Trading API
lsof -i :5173   # Frontend
```

### 查看相關進程
```bash
ps aux | grep -E "(trading-api|vite|node)"
```

### 檢查服務健康
```bash
curl http://localhost:30080/health
curl http://localhost:5173
```

## 🔧 故障排除

### 問題：端口被佔用
```bash
# 查看佔用端口的進程
lsof -i :30080

# 強制停止
./force_stop.sh

# 或手動殺死進程
kill -9 $(lsof -ti :30080)
```

### 問題：服務啟動失敗
```bash
# 檢查日誌
cat logs/trading-api.log
cat logs/frontend.log

# 檢查編譯錯誤
cd backend/trading-api
go build .
```

### 問題：數據庫連接失敗
```bash
# 檢查PostgreSQL狀態
pg_isready -h localhost -p 5432

# 啟動PostgreSQL (macOS)
brew services start postgresql@14

# 檢查Redis狀態
redis-cli ping

# 啟動Redis (macOS)
brew services start redis
```

## 🎯 快速測試流程

### 1. 完整重啟測試
```bash
# 停止所有服務
./quick_stop.sh

# 重新啟動
./quick_start_fixed.sh

# 測試GOOGL訂單
curl -X POST http://localhost:30080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: demo_user" \
  -d '{"symbol": "GOOGL", "side": "buy", "order_type": "limit", "quantity": 5, "price": 170.00}'
```

### 2. 快速重啟 (緊急)
```bash
./force_stop.sh && ./quick_start_fixed.sh
```

## 📝 日誌文件位置

- `logs/trading-api.log` - Trading API 服務日誌
- `logs/frontend.log` - 前端服務日誌
- `logs/trading-api.pid` - Trading API 進程ID
- `logs/frontend.pid` - 前端進程ID

## 🔗 相關地址

- 前端界面: http://localhost:5173
- Trading API: http://localhost:30080
- API健康檢查: http://localhost:30080/health
- Prometheus指標: http://localhost:30080/metrics

## 💡 最佳實踐

1. **開發時**: 使用 `./quick_start_fixed.sh` 啟動系統
2. **調試時**: 查看 `logs/` 目錄下的日誌文件
3. **重啟時**: 先用 `./quick_stop.sh` 安全停止，再啟動
4. **緊急時**: 使用 `./force_stop.sh` 強制停止
5. **測試時**: 使用提供的curl命令測試API功能

---

**注意**: 所有腳本都需要在 `fintech-ebpf-demo` 項目根目錄下運行。 