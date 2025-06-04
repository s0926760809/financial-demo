#!/bin/bash

echo "🚀 啟動Trading API服務..."

cd backend/trading-api

# 設置環境變量
export DATABASE_HOST=localhost
export DATABASE_USER=tujenwei
export DATABASE_PASSWORD=""
export DATABASE_NAME=fintech_db
export REDIS_HOST=localhost
export REDIS_PASSWORD=""
export SERVER_PORT=30080

# 編譯並啟動服務
echo "📦 編譯服務..."
go build -o trading-api .

if [ $? -eq 0 ]; then
    echo "✅ 編譯成功"
    echo "🚀 啟動服務..."
    ./trading-api
else
    echo "❌ 編譯失敗"
    exit 1
fi 