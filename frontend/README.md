# 金融微服務前端 - React 應用

## 🎯 階段3：React 前端開發

這是金融微服務 eBPF 演示系統的前端界面，使用 React + TypeScript 開發，提供現代化的金融交易界面和安全監控儀表板。

## 🏗️ 架構概述

```
┌─────────────────────────────────────────┐
│              React Frontend              │
├─────────────────────────────────────────┤
│  • 交易界面 (Trading Dashboard)          │
│  • 投資組合 (Portfolio View)            │
│  • 風險監控 (Risk Monitoring)           │
│  • 安全儀表板 (Security Dashboard)       │
│  • eBPF 事件監控 (eBPF Events)          │
└─────────────────────────────────────────┘
            │
            │ REST API + WebSocket
            ▼
┌─────────────────────────────────────────┐
│         Backend Microservices           │
│  (Kubernetes + Cilium + Tetragon)       │
└─────────────────────────────────────────┘
```

## 🚀 技術棧

### 核心框架
- **React 18** - 用戶界面框架
- **TypeScript** - 類型安全
- **Vite** - 快速構建工具
- **Tailwind CSS** - 現代化樣式框架

### 狀態管理
- **Zustand** - 輕量級狀態管理
- **React Query** - 服務器狀態管理

### UI 組件
- **Ant Design** - 企業級UI組件庫
- **Chart.js / Recharts** - 圖表可視化
- **React Spring** - 動畫效果

### 實時通信
- **Socket.IO Client** - WebSocket連接
- **EventSource** - SSE事件流

### 開發工具
- **ESLint + Prettier** - 代碼規範
- **Husky** - Git hooks
- **Jest + Testing Library** - 單元測試

## 📦 快速開始

### 環境要求
- Node.js 18+
- npm 或 yarn
- 已運行的後端微服務

### 安裝依賴
```bash
cd fintech-ebpf-demo/frontend
npm install
```

### 開發環境運行
```bash
# 啟動開發服務器
npm run dev

# 在瀏覽器中打開
# http://localhost:5173
```

### 生產構建
```bash
# 構建生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 🎨 界面功能

### 1. 交易儀表板 (Trading Dashboard)
- **實時市場數據** - 股價、成交量圖表
- **訂單管理** - 創建、修改、取消訂單
- **交易歷史** - 歷史交易記錄
- **快速交易** - 一鍵買賣功能

### 2. 投資組合 (Portfolio)
- **持倉概覽** - 當前持倉和收益
- **資產分配** - 餅圖顯示資產分布
- **收益曲線** - 歷史收益趨勢
- **風險分析** - 投資組合風險指標

### 3. 風險監控 (Risk Monitoring)
- **實時風險評分** - 動態風險指標
- **限額監控** - 交易限額使用情況
- **告警中心** - 風險告警和通知
- **風險報告** - 詳細風險分析報告

### 4. 安全儀表板 (Security Dashboard)
- **eBPF 事件流** - 實時安全事件
- **威脅檢測** - 異常行為識別
- **系統監控** - 系統調用和網絡活動
- **攻擊模擬** - 安全測試場景

### 5. 系統監控 (System Monitoring)
- **服務狀態** - 微服務健康狀況
- **性能指標** - CPU、內存、網絡使用率
- **日誌查看** - 實時日誌流
- **Prometheus 指標** - 業務和技術指標

## 🔒 安全演示功能

### 故意的前端安全問題（用於演示）
1. **XSS 漏洞示例** - 不安全的HTML渲染
2. **CSRF 模擬** - 跨站請求偽造演示
3. **敏感信息暴露** - 開發者工具中的敏感數據
4. **不安全的API調用** - 缺乏認證的請求

### eBPF 安全監控展示
- **實時事件可視化** - Tetragon事件流
- **攻擊場景觸發** - 一鍵觸發安全測試
- **系統調用監控** - 文件、網絡、進程活動
- **入侵檢測演示** - 模擬攻擊和防護

## 📊 數據可視化

### 圖表類型
- **實時折線圖** - 股價、風險評分趨勢
- **K線圖** - 股票價格走勢
- **餅圖** - 投資組合分配
- **熱力圖** - 風險矩陣
- **時間軸** - 安全事件時序

### 儀表板佈局
- **響應式設計** - 適配各種屏幕尺寸
- **可拖拽組件** - 自定義佈局
- **主題切換** - 明暗主題支持
- **多語言支持** - 中英文切換

## 🔄 實時功能

### WebSocket 連接
```typescript
// 交易數據訂閱
const tradingSocket = io('ws://localhost:30080');
tradingSocket.on('order_update', handleOrderUpdate);

// 風險評估事件
const riskSocket = io('ws://localhost:30081');
riskSocket.on('risk_alert', handleRiskAlert);

// 安全事件流
const securitySocket = io('ws://localhost:30083');
securitySocket.on('security_event', handleSecurityEvent);
```

### 事件類型
- **交易事件** - 訂單狀態變化
- **市場數據** - 實時價格更新
- **風險告警** - 風險閾值觸發
- **安全事件** - eBPF監控告警
- **系統狀態** - 服務健康變化

## 🧪 開發和測試

### 開發環境配置
```bash
# 環境變量配置
cp .env.example .env.local

# API端點配置
VITE_API_BASE_URL=http://localhost:30080
VITE_RISK_API_URL=http://localhost:30081
VITE_PAYMENT_API_URL=http://localhost:30082
VITE_AUDIT_API_URL=http://localhost:30083

# WebSocket配置
VITE_WS_TRADING_URL=ws://localhost:30080
VITE_WS_AUDIT_URL=ws://localhost:30083
```

### 測試命令
```bash
# 單元測試
npm run test

# 端到端測試
npm run test:e2e

# 組件測試
npm run test:component

# 代碼覆蓋率
npm run test:coverage
```

## 📁 項目結構

```
frontend/
├── src/
│   ├── components/          # 可復用組件
│   │   ├── common/         # 通用組件
│   │   ├── trading/        # 交易相關組件
│   │   ├── security/       # 安全監控組件
│   │   └── charts/         # 圖表組件
│   ├── pages/              # 頁面組件
│   │   ├── Dashboard/      # 主儀表板
│   │   ├── Trading/        # 交易頁面
│   │   ├── Portfolio/      # 投資組合
│   │   ├── Risk/           # 風險監控
│   │   └── Security/       # 安全儀表板
│   ├── hooks/              # 自定義hooks
│   ├── services/           # API服務
│   ├── stores/             # 狀態管理
│   ├── types/              # TypeScript類型
│   ├── utils/              # 工具函數
│   └── assets/             # 靜態資源
├── public/                 # 公共資源
├── tests/                  # 測試文件
├── docs/                   # 文檔
└── docker/                 # 容器化配置
```

## 🎬 演示場景

### 場景1：正常交易流程
1. 用戶登錄交易界面
2. 查看投資組合和市場數據
3. 創建股票買入訂單
4. 風險引擎評估通過
5. 訂單執行成功

### 場景2：風險控制觸發
1. 嘗試創建大額訂單
2. 風險評分超過閾值
3. 系統自動拒絕訂單
4. 顯示風險告警信息

### 場景3：安全攻擊模擬
1. 觸發命令注入攻擊
2. eBPF監控檢測到異常
3. Tetragon記錄安全事件
4. 安全儀表板顯示告警

### 場景4：系統監控
1. 查看微服務健康狀態
2. 監控系統資源使用
3. 分析性能指標趨勢
4. 檢查日誌和事件

## 🔄 部署

### Docker 部署
```bash
# 構建前端鏡像
docker build -t fintech-demo/frontend:latest .

# 運行容器
docker run -p 3000:3000 fintech-demo/frontend:latest
```

### Kubernetes 部署
```bash
# 部署到集群
kubectl apply -f k8s/frontend-deployment.yaml

# 訪問應用
kubectl port-forward svc/frontend-service 3000:3000
```

## 🔄 下一步

完成前端開發後，將進入：
- **階段4**: 攻擊場景腳本開發
- **階段5**: 完整演示環境整合

---

**版本**: 3.0.0  
**階段**: React 前端開發  
**更新日期**: 2023-12-01 