#!/bin/bash

# Tetragon事件流服务启动脚本
# 用于解决实时安全事件日志问题

set -e

echo "🚀 启动Tetragon事件流服务..."

# 检查Go是否安装
if ! command -v go &> /dev/null; then
    echo "❌ Go未安装，请先安装Go 1.21+"
    exit 1
fi

# 检查kubectl是否安装
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl未安装，请先安装kubectl"
    exit 1
fi

# 检查是否在正确目录
if [ ! -f "backend/tetragon-stream/main.go" ]; then
    echo "❌ 未找到tetragon-stream源码，请在fintech-ebpf-demo目录下运行"
    exit 1
fi

# 切换到tetragon-stream目录
cd backend/tetragon-stream

# 初始化Go模块
if [ ! -f "go.sum" ]; then
    echo "📦 初始化Go模块..."
    go mod download
fi

# 设置环境变量
export PORT=8090
export KUBECONFIG=${KUBECONFIG:-~/.kube/config}

echo "🔧 配置信息:"
echo "  - 端口: $PORT"
echo "  - Kubeconfig: $KUBECONFIG"

# 启动服务
echo "🌟 启动Tetragon事件流服务在端口 $PORT..."
echo "💡 WebSocket端点: ws://localhost:$PORT/ws/events"
echo "💡 健康检查: http://localhost:$PORT/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 运行服务
go run main.go 