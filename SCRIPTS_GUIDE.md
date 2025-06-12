# 腳本使用指南

## 📋 腳本概覽

本項目提供了完整的服務管理腳本，經過 v3.0.0 更新，已移除冗餘腳本，保留核心功能。

## 🚀 主要腳本

### 1. **項目根目錄腳本**

#### `quick_start.sh` - 快速啟動腳本
**位置**: `/Users/tujenwei/Desktop/finacial-demo/quick_start.sh`

```bash
# 基本啟動
./quick_start.sh

# 檢查狀態  
./quick_start.sh --status

# 停止服務
./quick_start.sh --stop

# 顯示幫助
./quick_start.sh --help
```

### 2. **項目內部腳本**

#### `start_services.sh` - 服務啟動腳本
**位置**: `fintech-ebpf-demo/start_services.sh`

```bash
# 啟動所有服務（Trading API、Risk API、Payment API、Audit API、Frontend）
./start_services.sh
```

**功能**:
- ✅ 檢查端口佔用並清理
- ✅ 按序啟動5個核心服務
- ✅ 等待服務就緒確認
- ✅ 生成PID文件用於管理
- ✅ 彩色日誌輸出

#### `stop_services.sh` - 服務停止腳本
**位置**: `fintech-ebpf-demo/stop_services.sh`

```bash
# 停止所有服務
./stop_services.sh

# 停止服務並清理日誌
./stop_services.sh --clean-logs
```

**功能**:
- ✅ 按PID文件優雅停止
- ✅ 端口清理作為備用方案
- ✅ 強制終止頑固進程
- ✅ 驗證服務確實停止
- ✅ 可選的日誌清理

#### `check_status.sh` - 狀態檢查腳本
**位置**: `fintech-ebpf-demo/check_status.sh`

```bash
# 基本狀態檢查
./check_status.sh

# 詳細診斷信息
./check_status.sh -v
```

**功能**:
- ✅ 核心服務狀態檢查
- ✅ 進程PID狀態驗證
- ✅ API功能測試
- ✅ 端口監聽狀態
- ✅ 日誌文件狀態
- ✅ 系統資源使用
- ✅ Tetragon eBPF狀態
- ✅ 詳細診斷模式

## 🗂️ 移除的腳本

以下腳本已在 v3.0.0 中移除，功能已整合到主要腳本中：

### 測試腳本（已移除）
- ❌ `test_tetragon_alerts.html`
- ❌ `test_websocket.js`
- ❌ `test_frontend_order.html`
- ❌ `test_security_features.sh`
- ❌ `test_portfolio_update.sh`
- ❌ `test_execution_rates.sh`
- ❌ `test_trading_system.sh`
- ❌ `test_alert_controls.html`

### 重複腳本（已移除）
- ❌ `quick_start_fixed.sh`
- ❌ `start_trading_api.sh`
- ❌ `stop_system.sh`
- ❌ `quick_stop.sh`
- ❌ `force_stop.sh`

## 📊 服務端口映射

| 服務 | 端口 | 描述 |
|------|------|------|
| Frontend | 3000 | React 前端應用 |
| Trading API | 30080 | 核心交易API + Tetragon事件 |
| Risk API | 30081 | 風險管理服務 |
| Payment API | 30082 | 支付處理服務 |
| Audit API | 30083 | 審計日誌服務 |

## 📁 日誌管理

### 日誌文件位置
```
fintech-ebpf-demo/logs/
├── trading-api.log    # Trading API 日誌
├── risk-api.log       # Risk API 日誌  
├── payment-api.log    # Payment API 日誌
├── audit-api.log      # Audit API 日誌
├── frontend.log       # Frontend 日誌
├── trading-api.pid    # Trading API PID
├── risk-api.pid       # Risk API PID
├── payment-api.pid    # Payment API PID  
├── audit-api.pid      # Audit API PID
└── frontend.pid       # Frontend PID
```

### 查看日誌
```bash
# 查看所有服務日誌
tail -f logs/*.log

# 查看特定服務日誌
tail -f logs/trading-api.log

# 查看錯誤日誌
grep -i error logs/*.log
```

## 🔧 故障排除

### 常見問題

#### 1. 端口被佔用
```bash
# 檢查端口使用
lsof -ti:30080

# 手動清理端口
lsof -ti:30080 | xargs kill -9
```

#### 2. 服務啟動失敗
```bash
# 檢查詳細狀態
./check_status.sh -v

# 查看服務日誌
tail -50 logs/trading-api.log
```

#### 3. PID文件不同步
```bash
# 清理PID文件
rm -f logs/*.pid

# 重新啟動服務
./stop_services.sh && ./start_services.sh
```

## 🎯 最佳實踐

### 開發工作流程
```bash
# 1. 檢查當前狀態
./check_status.sh

# 2. 停止現有服務
./stop_services.sh

# 3. 啟動所有服務
./start_services.sh

# 4. 驗證啟動狀態
./check_status.sh
```

### 生產部署
```bash
# 使用根目錄腳本快速部署
cd /path/to/project
./quick_start.sh

# 監控狀態
./quick_start.sh --status
```

### 維護操作
```bash
# 重啟所有服務
./stop_services.sh && ./start_services.sh

# 清理環境重新開始
./stop_services.sh --clean-logs && ./start_services.sh

# 詳細診斷
./check_status.sh -v
```

## 📈 功能特色

- 🔐 **Tetragon eBPF 集成**: 實時安全監控
- 📊 **微服務架構**: 5個獨立API服務
- 🚨 **可控告警系統**: 支持開關控制
- 🌙 **現代UI**: 暗色/亮色主題
- 📝 **完整日誌**: 結構化日誌管理
- ⚡ **快速部署**: 一鍵啟停腳本

---

## 📞 技術支持

如有問題，請檢查：
1. 運行 `./check_status.sh -v` 進行診斷
2. 查看相關服務日誌文件
3. 確認端口未被其他程序佔用
4. 檢查系統資源是否充足 