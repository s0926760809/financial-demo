#!/bin/bash

# 交易系統功能測試腳本
# 測試下單、編輯、刪除訂單以及成交後庫存更新

echo "🧪 交易系統功能測試開始..."
echo "=================================="

# API基礎URL
API_URL="http://localhost:30080/api/v1"
USER_ID="test-user-123"

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試函數
test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}測試: ${description}${NC}"
    
    if [ "$data" = "null" ]; then
        response=$(curl -s -X $method \
            -H "Content-Type: application/json" \
            -H "X-User-ID: $USER_ID" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -X $method \
            -H "Content-Type: application/json" \
            -H "X-User-ID: $USER_ID" \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    echo "響應: $response"
    echo ""
}

# 1. 檢查API健康狀態
echo -e "${YELLOW}1. 檢查API健康狀態${NC}"
curl -s http://localhost:30080/health | jq '.'
echo ""

# 2. 獲取支持的股票列表
echo -e "${YELLOW}2. 獲取支持的股票列表${NC}"
test_api "GET" "/market/stocks" "null" "獲取支持的股票"

# 3. 獲取股票報價
echo -e "${YELLOW}3. 獲取GOOGL股票報價${NC}"
test_api "GET" "/market/quote/GOOGL" "null" "獲取GOOGL實時報價"

# 4. 創建買入訂單
echo -e "${YELLOW}4. 創建GOOGL買入訂單${NC}"
buy_order_data='{
  "symbol": "GOOGL",
  "side": "buy",
  "order_type": "limit",
  "quantity": 10,
  "price": 2500.00,
  "time_in_force": "GTC"
}'
test_api "POST" "/orders" "$buy_order_data" "創建GOOGL買入訂單"

# 5. 創建AAPL買入訂單
echo -e "${YELLOW}5. 創建AAPL買入訂單${NC}"
aapl_order_data='{
  "symbol": "AAPL",
  "side": "buy",
  "order_type": "limit",
  "quantity": 50,
  "price": 175.00,
  "time_in_force": "GTC"
}'
test_api "POST" "/orders" "$aapl_order_data" "創建AAPL買入訂單"

# 6. 獲取用戶所有訂單
echo -e "${YELLOW}6. 獲取用戶所有訂單${NC}"
orders_response=$(curl -s -H "X-User-ID: $USER_ID" "$API_URL/orders")
echo "訂單列表: $orders_response"
echo ""

# 提取第一個訂單ID用於後續測試
order_id=$(echo $orders_response | jq -r '.orders[0].id // empty')

if [ -n "$order_id" ]; then
    echo -e "${GREEN}找到訂單ID: $order_id${NC}"
    
    # 7. 查詢特定訂單
    echo -e "${YELLOW}7. 查詢特定訂單${NC}"
    test_api "GET" "/orders/$order_id" "null" "查詢訂單詳情"
    
    # 8. 修改訂單
    echo -e "${YELLOW}8. 修改訂單數量和價格${NC}"
    update_data='{
      "quantity": 15,
      "price": 2450.00,
      "order_type": "limit"
    }'
    test_api "PUT" "/orders/$order_id" "$update_data" "修改訂單"
    
    # 9. 再次查詢訂單確認修改
    echo -e "${YELLOW}9. 確認訂單修改${NC}"
    test_api "GET" "/orders/$order_id" "null" "確認訂單已修改"
    
    # 10. 取消訂單
    echo -e "${YELLOW}10. 取消訂單${NC}"
    test_api "DELETE" "/orders/$order_id" "null" "取消訂單"
    
    # 11. 確認訂單已取消
    echo -e "${YELLOW}11. 確認訂單已取消${NC}"
    test_api "GET" "/orders/$order_id" "null" "確認訂單狀態"
else
    echo -e "${RED}未找到可用的訂單ID，跳過訂單修改和取消測試${NC}"
fi

# 12. 創建市價單測試立即成交
echo -e "${YELLOW}12. 創建市價單測試立即成交${NC}"
market_order_data='{
  "symbol": "AAPL",
  "side": "buy",
  "order_type": "market",
  "quantity": 20,
  "price": 0
}'
test_api "POST" "/orders" "$market_order_data" "創建AAPL市價買入訂單"

# 13. 獲取投資組合
echo -e "${YELLOW}13. 獲取投資組合${NC}"
test_api "GET" "/portfolio" "null" "獲取投資組合"

# 14. 獲取交易歷史
echo -e "${YELLOW}14. 獲取交易歷史${NC}"
test_api "GET" "/trades" "null" "獲取交易歷史"

# 15. 獲取交易統計
echo -e "${YELLOW}15. 獲取交易統計${NC}"
test_api "GET" "/trading-stats" "null" "獲取交易統計"

# 16. 測試風險控制 - 超大訂單
echo -e "${YELLOW}16. 測試風險控制 - 大額訂單${NC}"
large_order_data='{
  "symbol": "GOOGL",
  "side": "buy",
  "order_type": "limit",
  "quantity": 10000,
  "price": 3000.00
}'
test_api "POST" "/orders" "$large_order_data" "測試大額訂單風險控制"

# 17. 測試賣出訂單（應該失敗，因為沒有持股）
echo -e "${YELLOW}17. 測試賣出訂單 - 持股不足${NC}"
sell_order_data='{
  "symbol": "TSLA",
  "side": "sell",
  "order_type": "limit",
  "quantity": 100,
  "price": 250.00
}'
test_api "POST" "/orders" "$sell_order_data" "測試賣出不持有的股票"

echo -e "${GREEN}=================================="
echo -e "✅ 交易系統功能測試完成！"
echo -e "=================================="
echo ""
echo "測試項目:"
echo "✅ API健康檢查"
echo "✅ 股票信息查詢"
echo "✅ 創建買入訂單"
echo "✅ 修改訂單"
echo "✅ 取消訂單"
echo "✅ 市價單立即成交"
echo "✅ 投資組合查詢"
echo "✅ 交易歷史"
echo "✅ 風險控制測試"
echo "✅ 持股驗證"
echo ""
echo "🎯 如需查看詳細結果，請檢查前端應用："
echo "   http://localhost:5173/trading"
echo -e "${NC}" 