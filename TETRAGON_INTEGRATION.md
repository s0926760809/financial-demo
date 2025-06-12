# 🔍 Tetragon eBPF 安全監控系統 - 第一階段核心功能

## 📋 功能概覽

本系統成功實現了第一階段的三個核心功能，提供了完整的 eBPF 安全事件監控能力：

### ✅ 已實現功能

1. **🔗 後端實時事件 API 和 WebSocket**
2. **📊 前端實時事件展示組件**  
3. **⚠️ 基礎告警機制**

---

## 🔧 技術實現詳情

### 1. 後端實時事件 API 和 WebSocket

#### 🗂️ 核心文件
- `backend/trading-api/handlers/tetragon.go` - Tetragon 事件處理器
- `backend/trading-api/main.go` - 路由配置更新

#### 🌐 API 端點
```http
GET /api/v1/tetragon/events          # 獲取事件列表 (支持過濾)
GET /api/v1/tetragon/alerts          # 獲取安全告警列表
GET /api/v1/tetragon/statistics      # 獲取事件統計信息
GET /api/v1/tetragon/ws              # WebSocket 實時事件流
```

#### 📡 WebSocket 功能
- **實時事件推送**: 每2秒生成新的安全事件
- **連接管理**: 支持多客戶端同時連接
- **消息類型**:
  - `welcome` - 歡迎消息
  - `recent_events` - 最近事件列表
  - `security_event` - 實時安全事件

#### 🔍 事件類型支持
1. **進程執行事件** (`process_exec`)
   - 監控可疑命令執行 (curl, wget, nc, nmap)
   - 檢測危險參數和外部連接

2. **內核探針事件** (`process_kprobe`)
   - 監控敏感文件訪問 (/etc/passwd, /etc/shadow)
   - 跟蹤系統調用 (security_file_open)

### 2. 前端實時事件展示組件

#### 🗂️ 核心文件
- `frontend/src/components/TetragonEventStream.tsx` - 主事件流組件
- `frontend/src/pages/Security/index.tsx` - 安全頁面集成

#### 🎨 界面功能
- **📊 統計概覽**: 總事件數、活躍告警、關鍵事件、近期事件
- **🔧 控制面板**: 實時監控開關、過濾器、事件數量控制
- **📋 事件列表**: 實時更新的安全事件展示
- **⚠️ 告警展示**: 高危和關鍵事件的專門告警區域

#### 🎯 互動功能
- **實時過濾**: 按嚴重程度、事件類型過濾
- **連接狀態**: WebSocket 連接狀態實時顯示
- **自動通知**: 高危事件彈出通知提醒
- **響應式設計**: 支持不同屏幕尺寸

### 3. 基礎告警機制

#### ⚠️ 告警等級
- **🔴 CRITICAL**: 敏感文件訪問、系統安全文件操作
- **🟠 HIGH**: 可疑命令執行、外部網絡訪問
- **🟡 MEDIUM**: 一般安全事件
- **🟢 LOW**: 低風險事件

#### 📋 告警屬性
```json
{
  "id": "alert-1749176729",
  "timestamp": "2025-06-06T10:25:29+08:00",
  "severity": "CRITICAL",
  "title": "CRITICAL 安全事件檢測",
  "description": "敏感文件訪問: /etc/passwd",
  "action": "MONITOR",
  "status": "ACTIVE",
  "event": { /* 完整事件信息 */ }
}
```

---

## 🧪 測試驗證

### API 測試
```bash
# 測試事件 API
curl -s http://localhost:30080/api/v1/tetragon/events | jq

# 測試告警 API  
curl -s http://localhost:30080/api/v1/tetragon/alerts | jq

# 測試統計 API
curl -s http://localhost:30080/api/v1/tetragon/statistics | jq
```

### WebSocket 測試
```javascript
// WebSocket 連接測試
const ws = new WebSocket('ws://localhost:30080/api/v1/tetragon/ws');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

### 示例數據
```json
{
  "events": [
    {
      "timestamp": "2025-06-06T10:25:29+08:00",
      "event_type": "process_exec", 
      "severity": "HIGH",
      "description": "可疑命令執行: curl 訪問外部域名",
      "process_exec": {
        "process": {
          "pid": 12345,
          "binary": "/usr/bin/curl",
          "arguments": "http://malicious-domain.com",
          "pod": {
            "namespace": "fintech-demo",
            "name": "trading-api-deployment-abc123"
          }
        }
      }
    }
  ],
  "total": 2,
  "success": true
}
```

---

## 📊 性能指標

### 📈 實時統計示例
```json
{
  "statistics": {
    "total_events": 20,
    "total_alerts": 12,
    "active_alerts": 8,
    "recent_events_count": 12,
    "severity_breakdown": {
      "CRITICAL": 6,
      "HIGH": 6,
      "MEDIUM": 0,
      "LOW": 0
    },
    "event_type_breakdown": {
      "process_exec": 10,
      "process_kprobe": 10
    }
  }
}
```

### ⚡ 性能特點
- **事件處理**: 每2秒生成新事件
- **內存管理**: 最多保存1000個事件，100個告警
- **並發支持**: 支持多個 WebSocket 客戶端
- **過濾效率**: 實時事件過濾，無阻塞處理

---

## 🔗 系統整合

### 與 eBPF+Tetragon 的整合
1. **事件收集**: 優先嘗試從 kubectl 獲取 Tetragon 事件
2. **模擬模式**: kubectl 不可用時使用模擬事件用於演示
3. **數據格式**: 完全兼容 Tetragon 事件格式
4. **擴展性**: 預留接口支持真實 eBPF 數據

### 與現有系統的整合
- **安全頁面**: 新增 "Tetragon事件流" 標籤頁
- **API 統一**: 使用相同的路由前綴 `/api/v1/`
- **認證兼容**: 繼承現有的 CORS 和認證機制
- **監控集成**: 與現有監控系統並行運行

---

## 🔜 下一階段預期

基於第一階段的成功實現，下一階段可以考慮：

1. **真實 eBPF 整合**: 連接實際的 Tetragon 部署
2. **高級過濾**: 基於 Pod、命名空間、時間範圍的複雜過濾
3. **告警動作**: 自動阻止、隔離、通知等響應機制
4. **數據持久化**: 事件和告警的數據庫存儲
5. **分析儀表板**: 趨勢分析、威脅情報整合

---

## 🚀 啟動說明

### 後端啟動
```bash
cd backend/trading-api
go run . 
# 或
./trading-api
```

### 前端訪問
1. 訪問 http://localhost:3000/security
2. 點擊 "Tetragon事件流" 標籤頁
3. 觀察實時事件流和告警

### 日誌監控
```bash
tail -f backend/trading-api/trading-api.log
```

---

**✅ 第一階段核心功能已全部實現並測試通過！** 

# Tetragon eBPF 整合說明

## 系統架構圖

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 前端    │────│  Trading API    │────│   Kubernetes    │
│  (WebSocket)    │    │  (Go Backend)   │    │   + Tetragon    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Tetragon 原生監控 vs 演示系統對比

### 🔧 Tetragon 官方工具

#### tetra CLI - 官方命令行界面
```bash
# 安裝 tetra CLI
curl -L https://github.com/cilium/tetragon/releases/latest/download/tetra-linux-amd64.tar.gz | tar -xz
sudo mv tetra /usr/local/bin

# 實時查看事件
tetra getevents -o compact

# 過濾特定 Pod 的事件
tetra getevents --pods <pod-name>

# JSON 格式完整事件
tetra getevents
```

#### 內建 Prometheus Metrics
Tetragon 原生支援 Prometheus 指標：

```yaml
# Kubernetes 環境默認啟用
tetragon:
  prometheus:
    enabled: true  # 默認開啟
    port: 2112     # metrics 端口
    serviceMonitor:
      enabled: true  # Prometheus 自動發現
```

查看指標：
```bash
# Port forward metrics 端口
kubectl port-forward svc/tetragon 2112:2112

# 訪問 metrics 端點
curl localhost:2112/metrics
```

#### Grafana 整合
可以直接整合現有的 Grafana 和 Prometheus 堆棧。

### 🎯 演示系統優勢

#### 金融特定場景
- 針對交易、風控、合規等業務場景
- 自定義安全規則和告警邏輯
- 與微服務架構無縫整合

#### 現代化用戶體驗
- React 響應式 UI
- 實時 WebSocket 推送
- 交互式儀表板和過濾器

#### 企業級功能
- 多租戶支援
- 角色基礎存取控制
- 審計日誌和合規報告

### 🚀 混合使用方案

建議同時使用兩種方案以獲得最佳效果：

#### 1. 開發和調試階段
- 使用 `tetra CLI` 進行快速事件查看和調試
- 利用官方 Prometheus metrics 進行性能監控

#### 2. 生產監控階段
- 使用演示系統提供業務特定的監控儀表板
- 官方工具作為底層監控和故障排查工具

#### 3. 整合架構
```
┌─────────────────┐    ┌─────────────────┐
│  演示系統 UI    │    │  Grafana官方    │
│ (業務監控)      │    │ (系統監控)      │
└─────────────────┘    └─────────────────┘
         │                        │
         └────────┬─────────────────┘
                  │
         ┌─────────────────┐
         │   Tetragon      │
         │  (數據源)       │
         └─────────────────┘
```

#### 4. 具體實施步驟

**安裝 tetra CLI：**
```bash
# 在演示系統目錄中
curl -L https://github.com/cilium/tetragon/releases/latest/download/tetra-linux-amd64.tar.gz | tar -xz
sudo mv tetra /usr/local/bin

# 驗證安裝
tetra version
```

**配置 Prometheus 抓取：**
```yaml
# 在 prometheus.yml 中添加
- job_name: 'tetragon'
  static_configs:
    - targets: ['tetragon:2112']
```

**創建 Grafana 儀表板：**
- 導入 Tetragon 官方儀表板模板
- 配置與演示系統的數據關聯

這樣可以同時享受官方工具的強大功能和我們演示系統的定制化特性。 