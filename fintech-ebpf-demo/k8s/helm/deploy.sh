#!/bin/bash
# Fintech Demo 部署脚本

set -e

NAMESPACE="nginx-gateway"
RELEASE_NAME="fintech-demo"
CHART_PATH="fintech-chart"

# 检查命令行参数
if [ "$1" = "--production" ]; then
    echo "🚀 部署生产环境配置..."
    VALUES_FILE="fintech-chart/values-production.yaml"
    
    echo "⚠️  注意: 使用生产配置需要确保："
    echo "   1. Quay.io 镜像是公开的，或者"
    echo "   2. 已配置正确的 imagePullSecrets"
    echo "   3. 镜像确实存在并可访问"
    echo ""
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "🧪 部署测试环境配置..."
    VALUES_FILE="fintech-chart/values.yaml"
fi

# 检查 Helm 是否安装
if ! command -v helm &> /dev/null; then
    echo "❌ Helm 未安装，请先安装 Helm"
    exit 1
fi

# 检查 kubectl 是否可用
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ 无法连接到 Kubernetes 集群，请检查 kubectl 配置"
    exit 1
fi

# 检查 Chart 是否存在
if [ ! -d "$CHART_PATH" ]; then
    echo "❌ Helm Chart 目录不存在: $CHART_PATH"
    exit 1
fi

# 验证 Chart
echo "🔍 验证 Helm Chart..."
helm lint "$CHART_PATH"

# 检查是否已有同名 release
if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
    echo "📦 发现已存在的部署，将执行升级..."
    helm upgrade "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE" \
        --wait \
        --timeout=300s
else
    echo "📦 执行全新部署..."
    helm install "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        --values "$VALUES_FILE" \
        --wait \
        --timeout=300s
fi

echo "✅ 部署完成!"

# 显示部署状态
echo ""
echo "📊 部署状态:"
kubectl get pods -n "$NAMESPACE" | grep "$RELEASE_NAME"

echo ""
echo "🌐 服务状态:"
kubectl get services -n "$NAMESPACE" | grep "$RELEASE_NAME"

# 显示访问信息
echo ""
echo "🔗 访问信息:"
echo "   - 前端服务: kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME-fintech-chart-frontend 8080:80"
echo "   - Trading API: kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME-fintech-chart-trading-api 8081:8080"

if [ "$1" = "--production" ]; then
    echo ""
    echo "🎯 生产环境配置已部署，请确保:"
    echo "   1. 检查所有 Pod 状态: kubectl get pods -n $NAMESPACE"
    echo "   2. 查看日志: kubectl logs -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME"
    echo "   3. 配置 Ingress 或 LoadBalancer 以暴露服务"
fi 