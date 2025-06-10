# 金融微服務 eBPF 演示系統 - Helm Chart

## 📋 概覽

本目錄包含用於部署金融微服務 eBPF 安全演示系統的完整 Helm Chart 配置。系統採用微服務架構，包含前端應用和多個後端服務，專為展示 Kubernetes 上的 eBPF 安全監控功能而設計。

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Ingress Controller                       │
│                (fintech-demo.local)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      ▼               ▼               ▼
┌─────────────┐ ┌────────────┐ ┌──────────────┐
│   Frontend  │ │ Trading API│ │ Risk Engine  │
│   (React)   │ │    (Go)    │ │    (Go)      │
│   Port: 80  │ │ Port: 8080 │ │ Port: 8081   │
└─────────────┘ └────────────┘ └──────────────┘
                      │               │
      ┌───────────────┼───────────────┼──────────────┐
      │               │               │              │
      ▼               ▼               ▼              ▼
┌─────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐
│Payment Gate │ │Audit Service│ │ PostgreSQL  │ │   Redis    │
│    (Go)     │ │   (Go)     │ │ (Database)   │ │  (Cache)   │
│ Port: 8082  │ │Port: 8083  │ │ Port: 5432   │ │Port: 6379  │
└─────────────┘ └────────────┘ └──────────────┘ └────────────┘
```

## 📁 目錄結構

```
k8s/helm/
├── fintech-chart/                  # 主要 Helm Chart
│   ├── Chart.yaml                  # Chart 元數據
│   ├── values.yaml                 # 預設配置 (開發環境)
│   ├── values-production.yaml      # 生產環境配置
│   └── templates/                  # Kubernetes 模板
│       ├── _helpers.tpl            # 輔助模板函數
│       ├── serviceaccount.yaml     # 服務帳戶
│       ├── configmap.yaml          # 配置映射
│       ├── secrets.yaml            # 敏感數據
│       ├── frontend-deployment.yaml # 前端部署
│       ├── backend-deployments.yaml # 後端微服務部署
│       ├── services.yaml           # 服務定義
│       ├── ingress.yaml            # Ingress 配置
│       ├── networkpolicy.yaml      # 網路策略 (eBPF演示)
│       └── hpa.yaml                # 水平擴縮配置
├── deploy.sh                       # 自動化部署腳本
├── DEPLOYMENT_GUIDE.md             # 完整部署指南
└── README.md                       # 本文件
```

## 🚀 快速開始

### 1. 前置需求
- Kubernetes 1.25+
- Helm 3.8+
- Docker (用於構建映像)
- kubectl 已配置

### 2. 一鍵部署 (推薦)
```bash
# 進入 helm 目錄
cd fintech-ebpf-demo/k8s/helm

# 執行自動化部署腳本
./deploy.sh

# 查看幫助
./deploy.sh --help
```

### 3. 手動部署
```bash
# 構建映像
export IMAGE_TAG="v$(date +%Y%m%d-%H%M%S)"
./k8s/ci/build-images.sh

# 部署應用
helm install fintech-demo ./fintech-chart \
  --set global.imageTag=${IMAGE_TAG} \
  --create-namespace \
  --namespace fintech-demo
```

## ⚙️ 配置說明

### 環境配置

#### 開發環境 (`values.yaml`)
- 單一副本部署
- 啟用內建數據庫
- 使用 NodePort 或 port-forward 訪問
- 較低的資源限制

#### 生產環境 (`values-production.yaml`)
- 多副本高可用部署
- 外部數據庫配置
- TLS 和安全強化
- 自動擴縮和監控

### 主要配置項

```yaml
# 全域設定
global:
  imageRegistry: "quay.io/s0926760809/fintech-demo"
  imageTag: "latest"
  imagePullPolicy: Always
  namespace: fintech-demo

# 前端配置
frontend:
  enabled: true
  replicaCount: 2
  service:
    type: ClusterIP
    port: 80

# 後端微服務配置
tradingApi:
  enabled: true
  replicaCount: 2
  service:
    port: 8080

# 自動擴縮配置
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

## 🔧 自定義部署

### 部署特定環境
```bash
# 開發環境
./deploy.sh -e development -n fintech-dev

# 生產環境
./deploy.sh -e production -n fintech-prod

# 使用自定義映像標籤
./deploy.sh -t v1.2.3

# 跳過映像構建
./deploy.sh --skip-build
```

### 覆寫配置
```bash
# 使用自定義值
helm install fintech-demo ./fintech-chart \
  --set global.imageTag=v1.0.0 \
  --set frontend.replicaCount=3 \
  --set tradingApi.resources.limits.cpu=2000m
```

## 🔍 監控與維護

### 檢查部署狀態
```bash
# 查看 Pod 狀態
kubectl get pods -n fintech-demo

# 檢查服務
kubectl get services -n fintech-demo

# 查看 Helm 發布
helm status fintech-demo -n fintech-demo
```

### 查看日誌
```bash
# 前端日誌
kubectl logs -f deployment/fintech-demo-frontend -n fintech-demo

# 交易API日誌
kubectl logs -f deployment/fintech-demo-trading-api -n fintech-demo

# 所有服務日誌
kubectl logs -f -l app.kubernetes.io/instance=fintech-demo -n fintech-demo
```

### 訪問應用
```bash
# Port Forward (開發環境)
kubectl port-forward service/frontend 8080:80 -n fintech-demo
# 瀏覽器訪問: http://localhost:8080

# Ingress (配置後)
echo "127.0.0.1 fintech-demo.local" | sudo tee -a /etc/hosts
# 瀏覽器訪問: http://fintech-demo.local
```

## 🛠️ 故障排除

### 常見問題及解決方案

#### Pod 啟動失敗
```bash
# 檢查 Pod 詳情
kubectl describe pod <pod-name> -n fintech-demo

# 查看事件
kubectl get events -n fintech-demo --sort-by='.lastTimestamp'
```

#### 映像拉取失敗
```bash
# 檢查 imagePullSecrets
kubectl get secrets -n fintech-demo

# 驗證映像是否存在
docker pull quay.io/s0926760809/fintech-demo/frontend:latest
```

#### 服務連接問題
```bash
# DNS 解析測試
kubectl run debug --image=busybox -it --rm --restart=Never -- nslookup trading-api-service.fintech-demo.svc.cluster.local

# 服務端點檢查
kubectl get endpoints -n fintech-demo
```

## 🔐 安全考量

### eBPF 安全功能
本系統專為展示以下 eBPF 安全功能而設計：

1. **網路流量監控**: 透過 NetworkPolicy 控制流量
2. **系統調用追蹤**: 監控容器內的系統調用
3. **文件訪問審計**: 記錄敏感文件訪問
4. **容器逃逸檢測**: 檢測異常的容器行為

### 安全最佳實踐
- 所有容器以非 root 用戶運行
- 啟用 Pod Security Standards
- 配置 NetworkPolicy 限制網路訪問
- 使用 Secrets 管理敏感數據
- 定期更新映像和依賴

## 📈 擴縮與升級

### 手動擴縮
```bash
# 擴展前端副本
kubectl scale deployment fintech-demo-frontend --replicas=5 -n fintech-demo

# 擴展交易API副本
kubectl scale deployment fintech-demo-trading-api --replicas=3 -n fintech-demo
```

### 升級部署
```bash
# 升級到新版本
helm upgrade fintech-demo ./fintech-chart \
  --set global.imageTag=v1.1.0 \
  --namespace fintech-demo

# 回滾到前一版本
helm rollback fintech-demo 1 -n fintech-demo
```

### 自動擴縮 (HPA)
```bash
# 檢查 HPA 狀態
kubectl get hpa -n fintech-demo

# 查看擴縮歷史
kubectl describe hpa fintech-demo-frontend-hpa -n fintech-demo
```

## 🗑️ 清理

### 卸載應用
```bash
# 刪除 Helm 發布
helm uninstall fintech-demo -n fintech-demo

# 刪除 namespace
kubectl delete namespace fintech-demo

# 清理本地映像
docker system prune -a
```

## 📚 相關文檔

- [完整部署指南](./DEPLOYMENT_GUIDE.md) - 詳細的部署步驟和配置說明
- [映像構建文檔](../ci/README.md) - 映像構建和推送流程
- [eBPF 集成文檔](../../TETRAGON_INTEGRATION.md) - eBPF 安全功能說明
- [故障排除指南](../../docs/troubleshooting.md) - 常見問題解決方案

## 🤝 貢獻

歡迎提交 Issues 和 Pull Requests 來改進此專案。在提交之前，請確保：

1. 測試您的更改
2. 更新相關文檔
3. 遵循代碼規範

## 📄 許可證

本專案採用 MIT 許可證。詳見 [LICENSE](../../LICENSE) 文件。

---

**⚠️ 重要提醒**: 此系統僅用於演示和教育目的。請勿在生產環境中使用而未進行適當的安全配置和測試。 