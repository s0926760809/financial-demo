# 金融微服務 eBPF 系統 - Helm 部署手冊

本手冊提供完整的 Helm 部署指南，包含鏡像建構、推送、部署和管理的所有步驟。

## 📋 目錄

- [前置需求](#前置需求)
- [鏡像管理](#鏡像管理)
- [Helm 部署](#helm-部署)
- [系統管理](#系統管理)
- [故障排除](#故障排除)
- [版本更新](#版本更新)

## 🔧 前置需求

### 1. 工具安裝
```bash
# 安裝 Docker
sudo apt-get update
sudo apt-get install docker.io

# 安裝 Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 安裝 kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### 2. Quay.io 認證設定
```bash
# 登入 Quay.io 鏡像倉庫
docker login quay.io
# 使用者名稱: s0926760809@gmail.com
# 密碼: Haste0809

# 驗證登入狀態
docker info | grep Username
```

### 3. Kubernetes 叢集連接
```bash
# 確保 kubectl 能連接到您的 Kubernetes 叢集
kubectl cluster-info
kubectl get nodes
```

## 🐳 鏡像管理

### 建構所有服務鏡像

#### 前端鏡像建構
```bash
cd frontend
docker build -t quay.io/s0926760809/fintech-frontend:latest .
docker push quay.io/s0926760809/fintech-frontend:latest
```

#### 後端微服務鏡像建構
```bash
# Trading API
cd backend/trading-api
docker build -t quay.io/s0926760809/fintech-trading-api:latest .
docker push quay.io/s0926760809/fintech-trading-api:latest

# Risk Engine
cd ../risk-engine
docker build -t quay.io/s0926760809/fintech-risk-engine:latest .
docker push quay.io/s0926760809/fintech-risk-engine:latest

# Payment Gateway
cd ../payment-gateway
docker build -t quay.io/s0926760809/fintech-payment-gateway:latest .
docker push quay.io/s0926760809/fintech-payment-gateway:latest

# Audit Service
cd ../audit-service
docker build -t quay.io/s0926760809/fintech-audit-service:latest .
docker push quay.io/s0926760809/fintech-audit-service:latest

# Tetragon Stream
cd ../tetragon-stream
docker build -t quay.io/s0926760809/fintech-tetragon-stream:latest .
docker push quay.io/s0926760809/fintech-tetragon-stream:latest
```

#### 批次建構腳本
```bash
#!/bin/bash
# 建立 build-and-push.sh 腳本

set -e

echo "🚀 開始建構並推送所有鏡像到 quay.io..."

# 前端
echo "📦 建構前端鏡像..."
cd frontend
docker build -t quay.io/s0926760809/fintech-frontend:latest .
docker push quay.io/s0926760809/fintech-frontend:latest
cd ..

# 後端服務
services=("trading-api" "risk-engine" "payment-gateway" "audit-service" "tetragon-stream")

for service in "${services[@]}"; do
    echo "📦 建構 $service 鏡像..."
    cd backend/$service
    docker build -t quay.io/s0926760809/fintech-$service:latest .
    docker push quay.io/s0926760809/fintech-$service:latest
    cd ../..
done

echo "✅ 所有鏡像建構並推送完成！"
```

## ⚡ Helm 部署

### 1. 準備部署環境

#### 建立命名空間
```bash
kubectl create namespace fintech-demo
kubectl config set-context --current --namespace=fintech-demo
```

#### 建立 Quay.io 拉取密鑰
```bash
kubectl create secret docker-registry quay-secret \
  --docker-server=quay.io \
  --docker-username=s0926760809@gmail.com \
  --docker-password=Haste0809 \
  --docker-email=s0926760809@gmail.com \
  --namespace=fintech-demo
```

#### 新增 Helm 倉庫
```bash
# 新增 Bitnami 倉庫 (用於 PostgreSQL 和 Redis)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### 2. 下載依賴項
```bash
cd k8s/helm/fintech-chart
helm dependency update
```

### 3. 部署系統

#### 完整部署
```bash
# 在專案根目錄執行
cd k8s/helm/fintech-chart

# 執行 Helm 部署
helm upgrade --install fintech-demo . \
  --namespace fintech-demo \
  --create-namespace \
  --wait \
  --timeout=600s
```

#### 自訂配置部署
```bash
# 使用自訂 values 檔案
helm upgrade --install fintech-demo . \
  --namespace fintech-demo \
  --values values.yaml \
  --set frontend.replicaCount=3 \
  --set postgresql.auth.password="your-secure-password" \
  --wait
```

### 4. 驗證部署

#### 檢查 Pod 狀態
```bash
kubectl get pods -n fintech-demo
kubectl get services -n fintech-demo
kubectl get ingress -n fintech-demo
```

#### 檢查日誌
```bash
# 檢查特定服務日誌
kubectl logs -f deployment/trading-api -n fintech-demo
kubectl logs -f deployment/frontend -n fintech-demo
```

#### 健康檢查
```bash
# 使用 port-forward 測試服務
kubectl port-forward service/frontend 8080:80 -n fintech-demo
kubectl port-forward service/trading-api-service 8081:8080 -n fintech-demo

# 在另一個終端測試
curl http://localhost:8080
curl http://localhost:8081/health
```

## 🔧 系統管理

### 查看部署狀態
```bash
# Helm 發布狀態
helm status fintech-demo -n fintech-demo

# 查看所有資源
kubectl get all -n fintech-demo

# 查看詳細資訊
helm get values fintech-demo -n fintech-demo
helm get manifest fintech-demo -n fintech-demo
```

### 擴展和調整

#### 水平擴展
```bash
# 擴展前端副本數
helm upgrade fintech-demo . \
  --namespace fintech-demo \
  --set frontend.replicaCount=5 \
  --reuse-values

# 擴展後端服務
helm upgrade fintech-demo . \
  --namespace fintech-demo \
  --set backend.replicaCount=3 \
  --reuse-values
```

#### 資源調整
```bash
# 調整資源限制
helm upgrade fintech-demo . \
  --namespace fintech-demo \
  --set backend.resources.limits.memory="1Gi" \
  --set backend.resources.limits.cpu="1000m" \
  --reuse-values
```

### 配置更新
```bash
# 更新 values.yaml 後重新部署
helm upgrade fintech-demo . \
  --namespace fintech-demo \
  --values values.yaml

# 重新啟動特定服務 (觸發滾動更新)
kubectl rollout restart deployment/trading-api -n fintech-demo
kubectl rollout restart deployment/frontend -n fintech-demo
```

## 🔄 版本更新

### 更新應用版本
```bash
# 1. 建構新版本鏡像
docker build -t quay.io/s0926760809/fintech-frontend:v2.0.0 frontend/
docker push quay.io/s0926760809/fintech-frontend:v2.0.0

# 2. 更新 Helm Chart
helm upgrade fintech-demo . \
  --namespace fintech-demo \
  --set frontend.image.tag="v2.0.0" \
  --reuse-values

# 3. 驗證更新
kubectl rollout status deployment/frontend -n fintech-demo
```

### 回滾版本
```bash
# 查看發布歷史
helm history fintech-demo -n fintech-demo

# 回滾到上一個版本
helm rollback fintech-demo 1 -n fintech-demo

# 驗證回滾
kubectl get pods -n fintech-demo
```

## 🛠️ 故障排除

### 常見問題和解決方案

#### 1. Pod 啟動失敗
```bash
# 檢查 Pod 詳細資訊
kubectl describe pod <pod-name> -n fintech-demo

# 檢查事件
kubectl get events -n fintech-demo --sort-by='.lastTimestamp'

# 檢查日誌
kubectl logs <pod-name> -n fintech-demo --previous
```

#### 2. 鏡像拉取失敗
```bash
# 檢查密鑰是否正確
kubectl get secrets -n fintech-demo
kubectl describe secret quay-secret -n fintech-demo

# 重新建立密鑰
kubectl delete secret quay-secret -n fintech-demo
kubectl create secret docker-registry quay-secret \
  --docker-server=quay.io \
  --docker-username=s0926760809@gmail.com \
  --docker-password=Haste0809 \
  --docker-email=s0926760809@gmail.com \
  --namespace=fintech-demo
```

#### 3. 服務連接問題
```bash
# 檢查服務端點
kubectl get endpoints -n fintech-demo

# 檢查網路政策
kubectl get networkpolicies -n fintech-demo

# 使用 kubectl proxy 測試連接
kubectl proxy
# 訪問: http://localhost:8001/api/v1/namespaces/fintech-demo/services/frontend/proxy/
```

#### 4. 資料庫連接問題
```bash
# 檢查 PostgreSQL 狀態
kubectl logs -f statefulset/fintech-demo-postgresql -n fintech-demo

# 檢查 Redis 狀態
kubectl logs -f statefulset/fintech-demo-redis-master -n fintech-demo

# 進入資料庫 Pod 進行調試
kubectl exec -it fintech-demo-postgresql-0 -n fintech-demo -- psql -U fintech_user -d fintech_demo
```

### 清理和重新部署
```bash
# 完全清理環境
helm uninstall fintech-demo -n fintech-demo
kubectl delete namespace fintech-demo

# 重新部署
kubectl create namespace fintech-demo
# 重新執行部署步驟...
```

## 📊 監控和維護

### 查看資源使用情況
```bash
# CPU 和記憶體使用量
kubectl top pods -n fintech-demo
kubectl top nodes

# 儲存使用量
kubectl get pvc -n fintech-demo
```

### 備份重要資料
```bash
# 匯出 Helm 配置
helm get values fintech-demo -n fintech-demo > backup-values.yaml

# 備份資料庫 (如果啟用持久化)
kubectl exec -n fintech-demo fintech-demo-postgresql-0 -- pg_dump -U fintech_user fintech_demo > db-backup.sql
```

## 📝 部署檢查清單

### 部署前檢查
- [ ] Docker 已安裝並可連接到 quay.io
- [ ] Kubectl 可連接到 Kubernetes 叢集
- [ ] Helm 3.x 已安裝
- [ ] 所有鏡像已建構並推送到 quay.io
- [ ] 命名空間已建立
- [ ] Docker registry 密鑰已建立

### 部署後驗證
- [ ] 所有 Pod 處於 Running 狀態
- [ ] 所有服務可正常訪問
- [ ] 資料庫連接正常
- [ ] Ingress 配置正確
- [ ] 監控和日誌正常運作

---

**最後更新**: 2025-01-28  
**版本**: 1.0.0  
**維護者**: FinTech eBPF Demo Team

**注意**: 本手冊將隨著部署方法的變更而持續更新。每次修改部署流程時請務必更新此文檔。