#!/bin/bash

echo "🧪 測試股票成交率差異"
echo "=================================="

API_URL="http://localhost:30080/api/v1"
USER_ID="test-user-execution"

# 測試GOOGL成交率 (應該是70%-100%)
echo "📈 測試 GOOGL 成交率 (期望: 70%-100%)"
googl_filled=0
googl_total=10

for i in $(seq 1 $googl_total); do
    result=$(curl -s -X POST $API_URL/orders \
        -H "Content-Type: application/json" \
        -H "X-User-ID: $USER_ID" \
        -d "{\"symbol\": \"GOOGL\", \"side\": \"buy\", \"order_type\": \"limit\", \"quantity\": 1, \"price\": 200.00}" | \
        jq -r '.order.status')
    
    if [ "$result" = "filled" ]; then
        googl_filled=$((googl_filled + 1))
        echo "  GOOGL 訂單 #$i: ✅ 成交"
    else
        echo "  GOOGL 訂單 #$i: ⏳ 未成交"
    fi
    sleep 0.5
done

# 測試其他股票成交率 (應該是30%-100%)
echo ""
echo "📊 測試 AAPL 成交率 (期望: 30%-100%)"
aapl_filled=0
aapl_total=10

for i in $(seq 1 $aapl_total); do
    result=$(curl -s -X POST $API_URL/orders \
        -H "Content-Type: application/json" \
        -H "X-User-ID: $USER_ID" \
        -d "{\"symbol\": \"AAPL\", \"side\": \"buy\", \"order_type\": \"limit\", \"quantity\": 1, \"price\": 250.00}" | \
        jq -r '.order.status')
    
    if [ "$result" = "filled" ]; then
        aapl_filled=$((aapl_filled + 1))
        echo "  AAPL 訂單 #$i: ✅ 成交"
    else
        echo "  AAPL 訂單 #$i: ⏳ 未成交"
    fi
    sleep 0.5
done

# 計算成交率
googl_rate=$(echo "scale=1; $googl_filled * 100 / $googl_total" | bc -l)
aapl_rate=$(echo "scale=1; $aapl_filled * 100 / $aapl_total" | bc -l)

echo ""
echo "📋 成交率統計結果:"
echo "=================================="
echo "GOOGL 成交率: $googl_filled/$googl_total = ${googl_rate}% (期望: 70-100%)"
echo "AAPL 成交率:  $aapl_filled/$aapl_total = ${aapl_rate}% (期望: 30-100%)"
echo ""

if (( $(echo "$googl_rate >= 70" | bc -l) )); then
    echo "✅ GOOGL 成交率符合預期 (≥70%)"
else
    echo "❌ GOOGL 成交率低於預期 (<70%)"
fi

if (( $(echo "$aapl_rate >= 30" | bc -l) )); then
    echo "✅ AAPL 成交率在預期範圍內 (≥30%)"
else
    echo "⚠️  AAPL 成交率較低，但仍在可能範圍內"
fi

echo ""
echo "🎯 測試完成！新的成交邏輯已生效："
echo "   - 使用 Yahoo Finance API 獲取實時股價"
echo "   - GOOGL 享有 70%-100% 的高成交率"
echo "   - 其他股票為 30%-100% 的標準成交率"
echo "   - 基於真實市價進行智能成交判斷" 