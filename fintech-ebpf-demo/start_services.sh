#!/bin/bash

echo "🚀 啟動金融交易系統"
echo "=============================="

# 停止現有進程
echo "停止現有服務..."
pkill -f "trading-api" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# 檢查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  端口 $port 已被占用"
        return 1
    else
        echo "✅ 端口 $port 可用"
        return 0
    fi
}

echo "檢查端口狀態..."
check_port 30080 || (echo "請手動停止占用30080端口的進程後重試" && exit 1)
check_port 5173 || (echo "請手動停止占用5173端口的進程後重試" && exit 1)

# 啟動後端API
echo "🔧 啟動後端API (端口 30080)..."
cd backend/trading-api
DATABASE_HOST=localhost \
DATABASE_USER=tujenwei \
DATABASE_PASSWORD="" \
DATABASE_NAME=fintech_db \
REDIS_HOST=localhost \
REDIS_PASSWORD="" \
PORT=30080 \
./trading-api > ../../logs/api.log 2>&1 &

API_PID=$!
echo "後端API PID: $API_PID"

# 等待後端啟動
echo "等待後端API啟動..."
for i in {1..10}; do
    if curl -s http://localhost:30080/health > /dev/null; then
        echo "✅ 後端API啟動成功"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ 後端API啟動失敗"
        kill $API_PID 2>/dev/null || true
        exit 1
    fi
    sleep 2
done

# 啟動前端
echo "🎨 啟動前端服務 (端口 5173)..."
cd ../../frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服務 PID: $FRONTEND_PID"

# 等待前端啟動
echo "等待前端服務啟動..."
for i in {1..15}; do
    if curl -s http://localhost:5173/ > /dev/null; then
        echo "✅ 前端服務啟動成功"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "❌ 前端服務啟動失敗"
        kill $API_PID $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 2
done

echo ""
echo "🎉 服務啟動完成！"
echo "=============================="
echo "前端: http://localhost:5173"
echo "後端API: http://localhost:30080"
echo "API健康檢查: http://localhost:30080/health"
echo ""
echo "📝 日誌文件:"
echo "- 後端: logs/api.log" 
echo "- 前端: logs/frontend.log"
echo ""
echo "要停止服務，請運行: ./stop_services.sh"

# 測試API代理
echo "🧪 測試API連接..."
sleep 3
TEST_RESULT=$(curl -s -X POST http://localhost:5173/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user" \
  -d '{"symbol": "AAPL", "side": "buy", "order_type": "market", "quantity": 1, "price": 200}' \
  | jq -r '.order.status // "error"' 2>/dev/null || echo "error")

if [ "$TEST_RESULT" = "filled" ] || [ "$TEST_RESULT" = "pending" ]; then
    echo "✅ API代理配置正常，訂單測試成功"
else
    echo "⚠️  API代理可能有問題，請檢查前端控制台"
fi

echo ""
echo "系統準備就緒！請打開瀏覽器訪問: http://localhost:5173" 