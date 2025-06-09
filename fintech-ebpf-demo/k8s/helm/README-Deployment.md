# Fintech Demo Helm 部署指南

## 概述

这个 Helm Chart 用于在 Kubernetes 集群上部署 Fintech 微服务演示系统，包括：

- 🖥️ **前端服务** (Frontend)
- 💹 **交易 API** (Trading API)
- ⚖️ **风险引擎** (Risk Engine) 
- 💳 **支付网关** (Payment Gateway)
- 📋 **审计服务** (Audit Service)

## 前置要求

- Kubernetes 集群 (已验证在 v1.31.4 上工作)
- Helm v3.x
- kubectl 配置正确
- 镜像推送到 Quay.io (或配置 imagePullSecrets)

## 快速开始

### 1. 测试部署 (使用 nginx 镜像)

```bash
cd k8s/helm
./deploy.sh
```

这将部署一个使用 nginx 镜像的测试版本，确保集群和 Helm Chart 工作正常。

### 2. 生产部署 (使用您的实际镜像)

```bash
cd k8s/helm
./deploy.sh --production
```

## 镜像配置

您的镜像地址：
- \`quay.io/s0926760809/fintech-demo/frontend:v1.0\`
- \`quay.io/s0926760809/fintech-demo/trading-api:v1.0\`
- \`quay.io/s0926760809/fintech-demo/risk-engine:v1.0\`
- \`quay.io/s0926760809/fintech-demo/payment-gateway:v1.0\`
- \`quay.io/s0926760809/fintech-demo/audit-service:v1.0\`

### 配置私有镜像仓库访问

如果您的 Quay.io 仓库是私有的，需要配置 imagePullSecrets：

1. **创建 Docker registry secret:**
```bash
kubectl create secret docker-registry quay-pull-secret \
  --docker-server=quay.io \
  --docker-username=您的用户名 \
  --docker-password=您的密码 \
  --docker-email=您的邮箱 \
  -n nginx-gateway
```

2. **更新 values-production.yaml:**
```yaml
imagePullSecrets:
  - name: quay-pull-secret
```

## 手动部署命令

### 安装
```bash
helm install fintech-demo fintech-chart \
  --namespace nginx-gateway \
  --values fintech-chart/values-production.yaml
```

### 升级
```bash
helm upgrade fintech-demo fintech-chart \
  --namespace nginx-gateway \
  --values fintech-chart/values-production.yaml
```

### 卸载
```bash
helm uninstall fintech-demo --namespace nginx-gateway
```

## 验证部署

### 检查 Pod 状态
```bash
kubectl get pods -n nginx-gateway | grep fintech-demo
```

### 检查服务状态
```bash
kubectl get services -n nginx-gateway | grep fintech-demo
```

### 查看日志
```bash
# 查看特定服务日志
kubectl logs -n nginx-gateway -l app.kubernetes.io/component=trading-api

# 查看所有服务日志
kubectl logs -n nginx-gateway -l app.kubernetes.io/instance=fintech-demo
```

## 访问服务

### 本地访问 (Port Forward)
```bash
# 前端服务
kubectl port-forward -n nginx-gateway svc/fintech-demo-fintech-chart-frontend 8080:80

# Trading API
kubectl port-forward -n nginx-gateway svc/fintech-demo-fintech-chart-trading-api 8081:8080
```

### 通过 Ingress 访问
编辑 \`values-production.yaml\` 中的 ingress 配置，然后访问 \`http://fintech-demo.local\`

## 故障排除

### 镜像拉取失败
如果看到 \`ErrImagePull\` 或 \`ImagePullBackOff\` 错误：

1. **检查镜像是否存在:**
```bash
docker pull quay.io/s0926760809/fintech-demo/trading-api:v1.0
```

2. **检查镜像是否公开或配置 imagePullSecrets**

3. **查看详细错误:**
```bash
kubectl describe pod <pod-name> -n nginx-gateway
```

### Pod 启动失败
```bash
# 查看 Pod 事件
kubectl describe pod <pod-name> -n nginx-gateway

# 查看应用日志
kubectl logs <pod-name> -n nginx-gateway
```

### 健康检查失败
确保您的应用服务：
- 在正确的端口监听 (3000 for frontend, 8080-8083 for backends)
- 提供 \`/health\` 端点 (后端服务)
- 在根路径 \`/\` 响应 (前端服务)

## 配置选项

### 资源限制
在 \`values-production.yaml\` 中调整：
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

### 副本数
```yaml
frontend:
  replicaCount: 2  # 运行2个副本
```

### 环境变量
```yaml
env:
  DATABASE_URL: "postgresql://user:pass@host:5432/db"
  REDIS_URL: "redis://redis:6379"
  LOG_LEVEL: "debug"
```

## 监控和观察

### 检查所有资源
```bash
kubectl get all -n nginx-gateway -l app.kubernetes.io/instance=fintech-demo
```

### 使用 Tetragon 监控 (如果已安装)
```bash
# 查看 eBPF 跟踪数据
tetra getevents
```

## 支持的集群环境

- ✅ 已在以下环境测试:
  - Kubernetes v1.31.4
  - 9 节点集群 (3 master + 6 worker)
  - Cilium CNI
  - Tetragon 已安装

## 🚀 部署状态 (最新更新)

### ✅ 已成功部署的微服务 (5/5 全部运行!)

1. **Frontend** - `quay.io/s0926760809/fintech-demo/frontend:v1.0` ✅ Running
2. **Trading API** - `quay.io/s0926760809/fintech-demo/trading-api:v1.0` ✅ Running
3. **Risk Engine** - `quay.io/s0926760809/fintech-demo/risk-engine:v1.0` ✅ Running  
4. **Payment Gateway** - `quay.io/s0926760809/fintech-demo/payment-gateway:v1.0` ✅ Running
5. **Audit Service** - `quay.io/s0926760809/fintech-demo/audit-service:v1.0` ✅ Running

### 🎯 服务名称优化

解决了前端nginx配置问题，通过简化服务名称：
- `frontend` (端口 80)
- `trading-api-service` (端口 8080)  
- `risk-engine-service` (端口 8081)
- `payment-gateway-service` (端口 8082)
- `audit-service-service` (端口 8083)

### 🔑 已配置的认证

- **Quay.io Pull Secret**: `quay-pull-secret` 已创建
- **用户**: s0926760809
- **镜像仓库**: quay.io/s0926760809/fintech-demo/*

### 🌐 网络配置

- **Namespace**: nginx-gateway
- **Ingress**: 已启用 (fintech-demo.local)
- **Load Balancer**: nginx-gateway-fabric (192.168.1.215)

### 📊 资源概览

```bash
# 检查部署状态
kubectl get pods -n nginx-gateway | grep fintech-demo

# 检查服务
kubectl get services -n nginx-gateway | grep fintech-demo

# 检查Ingress
kubectl get ingress -n nginx-gateway
```

### 🔗 服务访问 (使用简化的服务名称)

```bash
# Frontend (Web UI)
kubectl port-forward -n nginx-gateway svc/frontend 8080:80

# Trading API
kubectl port-forward -n nginx-gateway svc/trading-api-service 8081:8080

# Risk Engine  
kubectl port-forward -n nginx-gateway svc/risk-engine-service 8082:8081

# Payment Gateway
kubectl port-forward -n nginx-gateway svc/payment-gateway-service 8083:8082

# Audit Service
kubectl port-forward -n nginx-gateway svc/audit-service-service 8084:8083
```

### 🎯 集群环境

- **Kubernetes版本**: v1.31.4
- **节点数**: 9 (3 master + 6 worker)
- **CNI**: Cilium
- **eBPF监控**: Tetragon
- **部署工具**: Helm v3.18.2

## 下一步

1. ✅ **微服务部署** - 5/5 服务全部运行正常 🎉
2. ✅ **服务名称优化** - 解决了前端nginx配置问题
3. 📊 **配置监控** - 集成Tetragon和Prometheus
4. 🗄️ **数据库配置** - 部署PostgreSQL和Redis
5. 🚀 **CI/CD集成** - 配置自动化部署流水线
6. 🔒 **安全加固** - 配置RBAC和网络策略 