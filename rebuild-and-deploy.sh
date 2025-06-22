#!/bin/bash

# FinTech eBPF Demo 重建和部署脚本
# 构建并推送所有微服务镜像，然后部署到 K8s

set -e

# 配置
REGISTRY="quay.io/s0926760809"
VERSION="v4.8"
NAMESPACE="fintech-demo"
RELEASE_NAME="fintech-demo"
CHART_PATH="k8s/helm/fintech-chart"

# 微服务列表
BACKEND_SERVICES=("trading-api" "risk-engine" "payment-gateway" "audit-service" "tetragon-stream")
FRONTEND_SERVICE="frontend"

echo "🚀 开始重建 FinTech eBPF Demo 所有镜像..."
echo "📦 Registry: $REGISTRY"
echo "🏷️  Version: $VERSION"
echo "🔧 Backend Services: ${BACKEND_SERVICES[*]}"
echo "🎨 Frontend Service: $FRONTEND_SERVICE"

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行或无权限访问"
    exit 1
fi

# 检查kubectl连接
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "❌ 无法连接到Kubernetes集群"
    exit 1
fi

# 检查Helm
if ! command -v helm &> /dev/null; then
    echo "❌ Helm 未安装"
    exit 1
fi

echo ""
echo "=== 第一阶段：构建后端微服务镜像 ==="

# 构建后端服务
for service in "${BACKEND_SERVICES[@]}"; do
    echo ""
    echo "📦 构建 $service..."
    
    cd backend/$service
    
    # 构建镜像
    if [ "$service" = "tetragon-stream" ]; then
        # tetragon-stream 使用不同的镜像名称
        docker build -t $REGISTRY/tetragon-stream:$VERSION .
        echo "📤 推送 tetragon-stream:$VERSION..."
        docker push $REGISTRY/tetragon-stream:$VERSION
        docker tag $REGISTRY/tetragon-stream:$VERSION $REGISTRY/tetragon-stream:latest
        docker push $REGISTRY/tetragon-stream:latest
    else
        # 其他后端服务使用 fintech-demo 前缀
        docker build -t $REGISTRY/fintech-demo/$service:$VERSION .
        echo "📤 推送 $service:$VERSION..."
        docker push $REGISTRY/fintech-demo/$service:$VERSION
        docker tag $REGISTRY/fintech-demo/$service:$VERSION $REGISTRY/fintech-demo/$service:latest
        docker push $REGISTRY/fintech-demo/$service:latest
    fi
    
    echo "✅ $service 构建完成"
    cd ../..
done

echo ""
echo "=== 第二阶段：构建前端应用 ==="

cd frontend

# 清理并重新安装依赖
echo "🧹 清理前端依赖..."
rm -rf node_modules package-lock.json dist .vite || true

echo "📦 安装前端依赖..."
npm install

# 构建前端
echo "🏗️  构建前端应用..."
npm run build

# 构建Docker镜像
echo "🐳 构建前端Docker镜像..."
docker build -t $REGISTRY/frontend:$VERSION .

# 推送镜像
echo "📤 推送前端镜像..."
docker push $REGISTRY/frontend:$VERSION
docker tag $REGISTRY/frontend:$VERSION $REGISTRY/frontend:latest
docker push $REGISTRY/frontend:latest

echo "✅ 前端构建完成"
cd ..

echo ""
echo "=== 第三阶段：更新 Helm values 并部署 ==="

# 创建命名空间（如果不存在）
echo "🔧 检查命名空间..."
if ! kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
    echo "📦 创建命名空间: $NAMESPACE"
    kubectl create namespace $NAMESPACE
else
    echo "✅ 命名空间已存在: $NAMESPACE"
fi

# 添加依赖的Helm仓库
echo "📦 添加Helm仓库..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 检查Chart语法
echo "🔍 验证Helm Chart..."
helm lint $CHART_PATH

# 部署或升级，使用 --set 参数指定新版本
echo "🚀 部署应用..."
if helm list -n $NAMESPACE | grep -q $RELEASE_NAME; then
    echo "🔄 升级现有部署..."
    helm upgrade $RELEASE_NAME $CHART_PATH \
        --namespace $NAMESPACE \
        --set frontend.image.tag=$VERSION \
        --set tetragonStream.image.tag=$VERSION \
        --set backendServices[0].image.tag=$VERSION \
        --set backendServices[1].image.tag=$VERSION \
        --set backendServices[2].image.tag=$VERSION \
        --set backendServices[3].image.tag=$VERSION \
        --timeout 10m \
        --wait \
        --debug
else
    echo "🆕 首次部署..."
    helm install $RELEASE_NAME $CHART_PATH \
        --namespace $NAMESPACE \
        --set frontend.image.tag=$VERSION \
        --set tetragonStream.image.tag=$VERSION \
        --set backendServices[0].image.tag=$VERSION \
        --set backendServices[1].image.tag=$VERSION \
        --set backendServices[2].image.tag=$VERSION \
        --set backendServices[3].image.tag=$VERSION \
        --timeout 10m \
        --wait \
        --debug
fi

# 等待Pod就绪
echo "⏳ 等待Pod启动..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=$RELEASE_NAME -n $NAMESPACE --timeout=300s || true

echo ""
echo "=== 第四阶段：验证部署状态 ==="

# 显示部署状态
echo ""
echo "📊 Pod状态:"
kubectl get pods -n $NAMESPACE -o wide

echo ""
echo "🔍 服务状态:"
kubectl get svc -n $NAMESPACE

echo ""
echo "📋 Helm发布信息:"
helm list -n $NAMESPACE

echo ""
echo "🔍 验证镜像版本:"
kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

echo ""
echo "🎉 重建和部署完成！"

echo ""
echo "🔧 验证命令:"
echo "  - 查看Pod状态: kubectl get pods -n $NAMESPACE"
echo "  - 查看日志: kubectl logs -f deployment/frontend -n $NAMESPACE"
echo "  - 端口转发: kubectl port-forward svc/frontend-service 3000:80 -n $NAMESPACE"
echo "  - 访问应用: http://localhost:3000"

echo ""
echo "🐛 调试命令:"
echo "  - 描述Pod: kubectl describe pod <pod-name> -n $NAMESPACE"
echo "  - 进入容器: kubectl exec -it <pod-name> -n $NAMESPACE -- /bin/sh"
echo "  - 查看事件: kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'"

echo ""
echo "📋 构建的镜像:"
echo "  - $REGISTRY/frontend:$VERSION"
echo "  - $REGISTRY/tetragon-stream:$VERSION"
for service in "trading-api" "risk-engine" "payment-gateway" "audit-service"; do
    echo "  - $REGISTRY/fintech-demo/$service:$VERSION"
done 