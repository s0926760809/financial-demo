#!/bin/bash

echo "🧪 測試投資組合更新功能"
echo "============================="

API_URL="http://localhost:30080/api/v1"
USER_ID="demo-user-123"

# 檢查API健康狀態
echo "📌 檢查API健康狀態..."
curl -s $API_URL/../health | jq '.status' | grep -q "ok" && echo "✅ API運行正常" || (echo "❌ API未運行" && exit 1)

# 1. 檢查初始投資組合
echo ""
echo "1️⃣ 查看初始投資組合"
echo "-------------------"
initial_portfolio=$(curl -s -X GET $API_URL/portfolio -H "X-User-ID: $USER_ID")
echo "$initial_portfolio" | jq '{
  cashBalance: .portfolio.cashBalance,
  totalValue: .portfolio.totalValue,
  positions: .portfolio.positions
}'

initial_cash=$(echo "$initial_portfolio" | jq -r '.portfolio.cashBalance')
echo "初始現金餘額: $${initial_cash}"

# 2. 買入股票
echo ""
echo "2️⃣ 買入 GOOGL 股票"
echo "-------------------"
order_result=$(curl -s -X POST $API_URL/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: $USER_ID" \
  -d '{
    "symbol": "GOOGL",
    "side": "buy",
    "order_type": "market",
    "quantity": 5,
    "price": 200.00
  }')

echo "$order_result" | jq '{
  status: .order.status,
  symbol: .order.symbol,
  side: .order.side,
  quantity: .order.quantity,
  message: .message
}'

order_status=$(echo "$order_result" | jq -r '.order.status')

if [ "$order_status" = "filled" ]; then
  echo "✅ 訂單成交成功"
else
  echo "⏳ 訂單狀態: $order_status"
fi

# 3. 檢查更新後的投資組合
echo ""
echo "3️⃣ 查看更新後的投資組合"
echo "-------------------------"
sleep 2  # 等待系統更新
updated_portfolio=$(curl -s -X GET $API_URL/portfolio -H "X-User-ID: $USER_ID")

echo "$updated_portfolio" | jq '{
  cashBalance: .portfolio.cashBalance,
  totalValue: .portfolio.totalValue,
  positions: .portfolio.positions
}'

updated_cash=$(echo "$updated_portfolio" | jq -r '.portfolio.cashBalance')
googl_position=$(echo "$updated_portfolio" | jq -r '.portfolio.positions.GOOGL // empty')

echo ""
echo "📊 對比結果:"
echo "初始現金: $${initial_cash}"
echo "更新後現金: $${updated_cash}"

if [ ! -z "$googl_position" ] && [ "$googl_position" != "null" ]; then
  googl_quantity=$(echo "$updated_portfolio" | jq -r '.portfolio.positions.GOOGL.quantity')
  googl_value=$(echo "$updated_portfolio" | jq -r '.portfolio.positions.GOOGL.marketValue')
  echo "✅ GOOGL 持倉: ${googl_quantity} 股，市值: $${googl_value}"
  echo "✅ 投資組合更新成功！"
else
  echo "❌ GOOGL 持倉未找到"
  echo "❌ 投資組合更新失敗！"
fi

# 4. 再次買入不同股票測試
echo ""
echo "4️⃣ 買入 AAPL 股票測試"
echo "---------------------"
aapl_order=$(curl -s -X POST $API_URL/orders \
  -H "Content-Type: application/json" \
  -H "X-User-ID: $USER_ID" \
  -d '{
    "symbol": "AAPL",
    "side": "buy",
    "order_type": "limit",
    "quantity": 10,
    "price": 250.00
  }')

echo "$aapl_order" | jq '{
  status: .order.status,
  symbol: .order.symbol,
  message: .message
}'

# 5. 最終投資組合檢查
echo ""
echo "5️⃣ 最終投資組合狀態"
echo "-------------------"
sleep 2
final_portfolio=$(curl -s -X GET $API_URL/portfolio -H "X-User-ID: $USER_ID")

echo "$final_portfolio" | jq '{
  cashBalance: .portfolio.cashBalance,
  totalValue: .portfolio.totalValue,
  totalPL: .portfolio.totalPL,
  positionCount: (.portfolio.positions | length),
  positions: .portfolio.positions
}'

position_count=$(echo "$final_portfolio" | jq '.portfolio.positions | length')
echo ""
echo "📈 總結:"
echo "持倉數量: $position_count 個股票"
echo "最終總價值: $(echo "$final_portfolio" | jq -r '.portfolio.totalValue')"

if [ "$position_count" -gt 0 ]; then
  echo "✅ 投資組合功能正常工作！"
else
  echo "⚠️  投資組合沒有持倉，請檢查買入邏輯"
fi 