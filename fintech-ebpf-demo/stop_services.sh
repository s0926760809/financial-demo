#!/bin/bash

echo "🛑 停止金融交易系統服務"
echo "========================"

# 停止進程
echo "停止前端服務..."
pkill -f "vite" 2>/dev/null && echo "✅ 前端服務已停止" || echo "ℹ️  前端服務未運行"

echo "停止後端API..."
pkill -f "trading-api" 2>/dev/null && echo "✅ 後端API已停止" || echo "ℹ️  後端API未運行"

# 等待進程完全停止
sleep 2

# 檢查端口狀態
check_port_free() {
    local port=$1
    if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ 端口 $port 已釋放"
    else
        echo "⚠️  端口 $port 仍被占用"
    fi
}

echo "檢查端口狀態..."
check_port_free 5173
check_port_free 30080

echo ""
echo "所有服務已停止！" 