#!/bin/bash

echo "🛑 停止金融微服務系統..."

# 停止服務
services=("trading-api" "frontend")

for service in "${services[@]}"; do
    if [ -f "logs/$service.pid" ]; then
        pid=$(cat logs/$service.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            echo "✅ 停止 $service (PID: $pid)"
        fi
        rm -f logs/$service.pid
    fi
done

# 額外檢查端口並殺死進程
for port in 30080 5173; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        kill $pid 2>/dev/null
        echo "✅ 停止端口 $port 的進程 (PID: $pid)"
    fi
done

echo "🏁 所有服務已停止"
