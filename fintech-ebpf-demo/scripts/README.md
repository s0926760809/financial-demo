# 腳本工具目錄

本目錄包含了金融eBPF演示系統的所有管理和測試腳本，按功能分類組織。

## 📁 目錄結構

```
scripts/
├── deployment/          # 部署相關腳本
│   ├── start_services.sh    # 啟動所有服務
│   ├── stop_services.sh     # 停止所有服務
│   ├── deploy-all.sh        # 完整部署腳本
│   └── quick_start.sh       # 快速啟動腳本
├── management/          # 系統管理腳本
│   ├── check_status.sh      # 狀態檢查腳本
│   └── service_manager.sh   # 服務管理器
├── monitoring/          # 監控相關腳本
│   ├── monitor_tetragon.sh  # Tetragon監控
│   └── log_analyzer.sh      # 日誌分析
├── testing/             # 測試相關腳本
│   └── unit-test/           # 單元測試
│       ├── test_all_apis.sh     # 所有API綜合測試
│       ├── test_trading_api.sh  # Trading API測試
│       └── reports/             # 測試報告目錄
├── utilities/           # 工具腳本
│   ├── cleanup.sh           # 系統清理
│   └── backup.sh            # 備份工具
└── README.md           # 本文檔
```

## 🚀 部署腳本

### 快速開始

```bash
# 從項目根目錄快速啟動
./scripts/deployment/quick_start.sh

# 或者在項目內部
./scripts/deployment/start_services.sh
```

### 腳本說明

- **`quick_start.sh`** - 項目統一入口點，包含依賴檢查
- **`start_services.sh`** - 啟動所有微服務（Go後端 + React前端）
- **`stop_services.sh`** - 停止所有服務，支持日誌清理
- **`deploy-all.sh`** - 完整的部署腳本，包含環境準備

## 🔧 管理腳本

### 狀態檢查

```bash
# 基本狀態檢查
./scripts/management/check_status.sh

# 詳細診斷
./scripts/management/check_status.sh -v
```

### 服務管理

```bash
# 使用服務管理器
./scripts/management/service_manager.sh
```

## 📊 監控腳本

### Tetragon監控

```bash
# 實時監控事件流
./scripts/monitoring/monitor_tetragon.sh monitor

# 查看統計信息
./scripts/monitoring/monitor_tetragon.sh stats

# 生成監控報告
./scripts/monitoring/monitor_tetragon.sh report
```

## 🧪 測試腳本

### API單元測試

```bash
# 執行所有API測試
./scripts/testing/unit-test/test_all_apis.sh

# 測試特定的Trading API
./scripts/testing/unit-test/test_trading_api.sh
```

### 測試報告

測試結果將保存在 `scripts/testing/unit-test/reports/` 目錄中：

- 綜合測試報告：`comprehensive_test_report_YYYYMMDD_HHMMSS.json`
- Trading API報告：`test_results_trading_api.json`

## 🛠️ 工具腳本

### 系統清理

```bash
# 安全清理（推薦）
./scripts/utilities/cleanup.sh safe

# 深度清理
./scripts/utilities/cleanup.sh deep

# 僅清理日誌
./scripts/utilities/cleanup.sh logs

# 檢查磁盤使用
./scripts/utilities/cleanup.sh check
```

### 備份工具

```bash
# 創建系統備份
./scripts/utilities/backup.sh
```

## 📋 使用建議

### 開發工作流程

1. **啟動系統**
   ```bash
   ./scripts/deployment/quick_start.sh
   ```

2. **檢查狀態**
   ```bash
   ./scripts/management/check_status.sh
   ```

3. **運行測試**
   ```bash
   ./scripts/testing/unit-test/test_all_apis.sh
   ```

4. **監控Tetragon**
   ```bash
   ./scripts/monitoring/monitor_tetragon.sh monitor
   ```

5. **系統清理**
   ```bash
   ./scripts/utilities/cleanup.sh safe
   ```

### 故障排除

1. **服務啟動失敗**
   ```bash
   # 檢查詳細狀態
   ./scripts/management/check_status.sh -v
   
   # 查看日誌
   tail -f logs/*.log
   
   # 重新啟動
   ./scripts/deployment/stop_services.sh
   ./scripts/deployment/start_services.sh
   ```

2. **API測試失敗**
   ```bash
   # 確保服務運行
   ./scripts/management/check_status.sh
   
   # 檢查端口
   lsof -i :30080
   ```

3. **性能問題**
   ```bash
   # 清理系統
   ./scripts/utilities/cleanup.sh safe
   
   # 檢查資源使用
   ./scripts/utilities/cleanup.sh check
   ```

## ⚙️ 配置說明

### 環境變數

腳本支持以下環境變數：

- `FINTECH_ENV` - 環境類型（development/production）
- `API_BASE_URL` - API基礎URL（默認：http://localhost:30080）
- `LOG_LEVEL` - 日誌級別（debug/info/warn/error）

### 端口配置

- Frontend: 3000
- Trading API: 30080
- Risk API: 30081
- Payment API: 30082
- Audit API: 30083

## 🔍 腳本功能對照表

| 功能 | 腳本路徑 | 用途 |
|------|----------|------|
| 快速啟動 | `deployment/quick_start.sh` | 統一入口，依賴檢查 |
| 啟動服務 | `deployment/start_services.sh` | 啟動所有微服務 |
| 停止服務 | `deployment/stop_services.sh` | 停止所有服務 |
| 狀態檢查 | `management/check_status.sh` | 系統健康檢查 |
| Tetragon監控 | `monitoring/monitor_tetragon.sh` | eBPF事件監控 |
| API測試 | `testing/unit-test/test_all_apis.sh` | 綜合API測試 |
| 系統清理 | `utilities/cleanup.sh` | 清理日誌和緩存 |

## 📝 開發指南

### 添加新腳本

1. 選擇合適的分類目錄
2. 使用統一的腳本模板
3. 添加適當的錯誤處理
4. 更新本README文檔

### 腳本模板

```bash
#!/bin/bash

# 腳本說明
# 版本: v1.0.0
# 用途: 描述腳本功能

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

main() {
    # 主要邏輯
    log "腳本開始執行"
}

main "$@"
```

## 🆘 技術支持

如遇問題，請：

1. 檢查 `logs/` 目錄中的詳細日誌
2. 運行 `./scripts/management/check_status.sh -v` 進行診斷
3. 查看各腳本的內置幫助信息（使用 `--help` 參數）

---

**注意**: 所有腳本都已設置為可執行權限，可直接運行。建議在執行前先查看腳本內容以了解具體功能。 