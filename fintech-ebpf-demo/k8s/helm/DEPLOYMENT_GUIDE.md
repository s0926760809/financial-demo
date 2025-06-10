# 金融微服務 eBPF 演示系統 - Helm 部署指南

## 概述

本指南提供完整的 Kubernetes 部署流程，使用 Helm Chart 部署金融微服務 eBPF 安全演示系統。

## 系統架構

本系統包含以下組件：
- **前端服務**: React 應用程式 (Nginx)
- **交易 API**: 交易處理微服務 (Go)
- **風險引擎**: 風險評估微服務 (Go)
- **支付網關**: 支付處理微服務 (Go)
- **審計服務**: 審計日誌微服務 (Go)
- **PostgreSQL**: 主要數據庫
- **Redis**: 緩存和會話存儲

## 前置需求

### 1. 軟體依賴
```bash
# Kubernetes 集群 (v1.25+)
kubectl version --client

# Helm 3.8+
helm version

# Docker (用於構建映像)
docker version
```

### 2. 集群要求
- Kubernetes 1.25 或更高版本
- 至少 3 個工作節點
- 每個節點至少 4GB RAM, 2 CPU
- 支援 LoadBalancer 或 Ingress Controller
- 可選：Cilium CNI (用於 eBPF 功能)

### 3. 準備 Namespace
```bash
# 創建 namespace
kubectl create namespace fintech-demo

# 設置為預設 namespace (可選)
kubectl config set-context --current --namespace=fintech-demo
```

## 部署步驟

### 步驟 1: 構建和推送映像

```bash
# 設置環境變數
export DOCKER_REGISTRY="quay.io/s0926760809/fintech-demo"
export IMAGE_TAG="v$(date +%Y%m%d-%H%M%S)"

# 執行映像構建腳本
cd /Users/tujenwei/Desktop/finacial-demo/fintech-ebpf-demo
chmod +x k8s/ci/build-images.sh
./k8s/ci/build-images.sh
```

### 步驟 2: 配置 Image Pull Secret (如果使用私有倉庫)

```bash
# 創建 Docker registry secret
kubectl create secret docker-registry quay-pull-secret \
  --docker-server=quay.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_PASSWORD \
  --docker-email=YOUR_EMAIL \
  --namespace=fintech-demo
```

### 步驟 3: 更新 Helm Dependencies (如果需要)

```bash
cd k8s/helm/fintech-chart
helm dependency update
```

### 步驟 4: 驗證 Helm Chart

```bash
# 檢查 Chart 語法
helm lint ./k8s/helm/fintech-chart

# 檢查生成的 YAML
helm template fintech-demo ./k8s/helm/fintech-chart \
  --set global.imageTag=${IMAGE_TAG} \
  --namespace fintech-demo
```

### 步驟 5: 部署應用程式

#### 開發環境部署
```bash
# 首次安裝
helm install fintech-demo ./k8s/helm/fintech-chart \
  --set global.imageTag=${IMAGE_TAG} \
  --create-namespace \
  --namespace fintech-demo

# 更新現有部署
helm upgrade fintech-demo ./k8s/helm/fintech-chart \
  --set global.imageTag=${IMAGE_TAG} \
  --namespace fintech-demo
```

#### 生產環境部署
```bash
# 使用生產環境配置
helm install fintech-demo ./k8s/helm/fintech-chart \
  --values ./k8s/helm/fintech-chart/values-production.yaml \
  --set global.imageTag=${IMAGE_TAG} \
  --create-namespace \
  --namespace fintech-prod
```

### 步驟 6: 驗證部署

```bash
# 檢查 Pod 狀態
kubectl get pods -n fintech-demo

# 檢查 Service 狀態
kubectl get services -n fintech-demo

# 檢查 Ingress 狀態
kubectl get ingress -n fintech-demo

# 查看部署詳情
helm status fintech-demo -n fintech-demo
```

### 步驟 7: 設置本地訪問

#### 方法 1: Port Forward
```bash
# 前端服務
kubectl port-forward service/frontend 8080:80 -n fintech-demo

# 瀏覽器訪問: http://localhost:8080
```

#### 方法 2: Ingress (推薦)
```bash
# 添加本地 DNS 記錄
echo "127.0.0.1 fintech-demo.local" | sudo tee -a /etc/hosts

# 如果使用 kind 集群，需要額外配置端口映射
# 請參考 kind 配置文件
```

## 配置說明

### 主要配置文件

#### values.yaml
- 開發和測試環境的預設配置
- 包含所有服務的基本設定
- 啟用內建的 PostgreSQL 和 Redis

#### values-production.yaml
- 生產環境的優化配置
- 增加副本數和資源限制
- 使用外部數據庫
- 啟用 TLS 和安全設定

### 重要配置項

#### 映像配置
```yaml
global:
  imageRegistry: "quay.io/s0926760809/fintech-demo"
  imageTag: "latest"
  imagePullPolicy: Always
```

#### 資源配置
```yaml
frontend:
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi
```

#### 自動擴縮配置
```yaml
frontend:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 80
```

## 監控和日誌

### 檢查應用程式健康狀態
```bash
# 檢查所有 Pod 的健康狀態
kubectl get pods -n fintech-demo -o wide

# 查看特定服務的日誌
kubectl logs -f deployment/fintech-demo-trading-api -n fintech-demo

# 查看服務端點
kubectl get endpoints -n fintech-demo
```

### 服務健康檢查端點
- Frontend: `http://frontend/health`
- Trading API: `http://trading-api-service:8080/health`
- Risk Engine: `http://risk-engine-service:8081/health`
- Payment Gateway: `http://payment-gateway-service:8082/health`
- Audit Service: `http://audit-service:8083/health`

## 故障排除

### 常見問題

#### 1. Pod 啟動失敗
```bash
# 查看 Pod 詳情
kubectl describe pod <pod-name> -n fintech-demo

# 查看 Pod 日誌
kubectl logs <pod-name> -n fintech-demo
```

#### 2. 映像拉取失敗
```bash
# 檢查 ImagePullSecret
kubectl get secrets -n fintech-demo

# 測試映像拉取
kubectl run test-pod --image=quay.io/s0926760809/fintech-demo/frontend:latest \
  --dry-run=client -o yaml
```

#### 3. 服務連接問題
```bash
# 檢查 Service DNS
kubectl exec -it <pod-name> -n fintech-demo -- nslookup trading-api-service

# 測試服務連接
kubectl exec -it <pod-name> -n fintech-demo -- curl http://trading-api-service:8080/health
```

#### 4. Ingress 問題
```bash
# 檢查 Ingress Controller
kubectl get pods -n nginx-system  # 或相應的 namespace

# 檢查 Ingress 規則
kubectl describe ingress fintech-demo-ingress -n fintech-demo
```

## 升級和回滾

### 升級部署
```bash
# 升級到新版本
helm upgrade fintech-demo ./k8s/helm/fintech-chart \
  --set global.imageTag=v1.2.0 \
  --namespace fintech-demo

# 查看升級狀態
helm status fintech-demo -n fintech-demo
```

### 回滾部署
```bash
# 查看發布歷史
helm history fintech-demo -n fintech-demo

# 回滾到前一版本
helm rollback fintech-demo 1 -n fintech-demo
```

## 卸載

### 完全卸載應用程式
```bash
# 刪除 Helm 發布
helm uninstall fintech-demo -n fintech-demo

# 刪除 namespace (可選)
kubectl delete namespace fintech-demo

# 清理 Docker 映像 (可選)
docker system prune -a
```

## 安全注意事項

### 生產環境檢查清單
- [ ] 使用專用的 namespace
- [ ] 配置 NetworkPolicy
- [ ] 使用非 root 用戶運行容器
- [ ] 啟用 Pod Security Standards
- [ ] 配置 RBAC 權限
- [ ] 使用 TLS 加密通信
- [ ] 定期更新映像和依賴
- [ ] 監控安全事件

### eBPF 安全功能
本系統設計用於展示 eBPF 安全監控功能：
- 網路流量監控
- 系統調用追蹤
- 文件訪問審計
- 容器逃逸檢測

## 支援

如有問題，請檢查：
1. [部署日誌](./logs/)
2. [常見問題解答](./FAQ.md)
3. [Github Issues](https://github.com/fintech-security/ebpf-demo/issues)

---

**注意**: 此系統僅用於演示和教育目的，請勿用於生產環境而未進行適當的安全配置。 