#!/bin/bash

# Trading API 單元測試
# 版本: v1.0.0
# 測試覆蓋: 健康檢查、訂單管理、市場數據、Tetragon集成

set -e

# 配置
BASE_URL="http://localhost:30080"
TEST_RESULTS_FILE="test_results_trading_api.json"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 測試統計
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 日誌函數
log() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

# 執行測試並記錄結果
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    log "執行測試: $test_name"
    ((TOTAL_TESTS++))
    
    if $test_function; then
        success "$test_name"
        return 0
    else
        fail "$test_name"
        return 1
    fi
}

# 檢查API響應
check_api_response() {
    local url="$1"
    local expected_status="${2:-200}"
    local method="${3:-GET}"
    
    local response=$(curl -s -w "%{http_code}" -X "$method" "$url" -o /tmp/api_response.json)
    local status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        return 0
    else
        error "期望狀態碼 $expected_status，但收到 $status_code"
        return 1
    fi
}

# 測試1: 健康檢查
test_health_check() {
    check_api_response "$BASE_URL/health" "200"
}

# 測試2: API版本信息
test_api_version() {
    check_api_response "$BASE_URL/api/v1/version" "200"
}

# 測試3: 獲取所有訂單
test_get_orders() {
    check_api_response "$BASE_URL/api/v1/orders" "200"
}

# 測試4: 創建新訂單
test_create_order() {
    local payload='{
        "symbol": "AAPL",
        "side": "BUY",
        "quantity": 100,
        "price": 150.00,
        "type": "LIMIT"
    }'
    
    local response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/api/v1/orders" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        -o /tmp/create_order_response.json)
    
    local status_code="${response: -3}"
    
    if [ "$status_code" = "201" ] || [ "$status_code" = "200" ]; then
        return 0
    else
        error "創建訂單失敗，狀態碼: $status_code"
        return 1
    fi
}

# 測試5: 獲取股票數據
test_get_stocks() {
    check_api_response "$BASE_URL/api/v1/market/stocks" "200"
}

# 測試6: 獲取特定股票
test_get_specific_stock() {
    check_api_response "$BASE_URL/api/v1/market/stocks/AAPL" "200"
}

# 測試7: Tetragon統計
test_tetragon_statistics() {
    check_api_response "$BASE_URL/api/v1/tetragon/statistics" "200"
}

# 測試8: Tetragon事件
test_tetragon_events() {
    check_api_response "$BASE_URL/api/v1/tetragon/events" "200"
}

# 測試9: 無效端點
test_invalid_endpoint() {
    check_api_response "$BASE_URL/api/v1/invalid" "404"
}

# 測試10: POST到GET端點
test_method_not_allowed() {
    local response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/health" -o /dev/null)
    local status_code="${response: -3}"
    
    if [ "$status_code" = "405" ] || [ "$status_code" = "404" ]; then
        return 0
    else
        return 1
    fi
}

# 測試11: 獲取訂單歷史
test_order_history() {
    check_api_response "$BASE_URL/api/v1/orders/history" "200"
}

# 測試12: 獲取持倉信息
test_positions() {
    check_api_response "$BASE_URL/api/v1/positions" "200"
}

# 測試13: 安全測試端點
test_security_tests() {
    check_api_response "$BASE_URL/api/v1/security/tests" "200"
}

# 測試14: API性能測試
test_api_performance() {
    local start_time=$(date +%s%N)
    check_api_response "$BASE_URL/health" "200"
    local end_time=$(date +%s%N)
    
    local duration=$(( (end_time - start_time) / 1000000 )) # 轉換為毫秒
    
    if [ $duration -lt 1000 ]; then # 小於1秒
        log "API響應時間: ${duration}ms (良好)"
        return 0
    else
        warn "API響應時間: ${duration}ms (較慢)"
        return 1
    fi
}

# 測試15: JSON格式驗證
test_json_format() {
    curl -s "$BASE_URL/api/v1/orders" > /tmp/json_test.json
    
    if jq empty /tmp/json_test.json 2>/dev/null; then
        return 0
    else
        error "返回的不是有效的JSON格式"
        return 1
    fi
}

# 生成測試報告
generate_report() {
    local timestamp=$(date -Iseconds)
    local pass_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    
    cat > "$TEST_RESULTS_FILE" << EOF
{
    "timestamp": "$timestamp",
    "service": "Trading API",
    "base_url": "$BASE_URL",
    "total_tests": $TOTAL_TESTS,
    "passed_tests": $PASSED_TESTS,
    "failed_tests": $FAILED_TESTS,
    "pass_rate": $pass_rate,
    "test_results": [
EOF

    # 這裡可以添加詳細的測試結果...
    
    cat >> "$TEST_RESULTS_FILE" << EOF
    ]
}
EOF
    
    log "測試報告已生成: $TEST_RESULTS_FILE"
}

# 主測試流程
main() {
    log "開始 Trading API 單元測試"
    log "目標服務: $BASE_URL"
    echo ""
    
    # 檢查服務是否運行
    if ! curl -s "$BASE_URL/health" >/dev/null 2>&1; then
        error "Trading API 服務未運行或無法連接"
        exit 1
    fi
    
    # 執行所有測試
    run_test "健康檢查" test_health_check
    run_test "API版本信息" test_api_version
    run_test "獲取所有訂單" test_get_orders
    run_test "創建新訂單" test_create_order
    run_test "獲取股票數據" test_get_stocks
    run_test "獲取特定股票" test_get_specific_stock
    run_test "Tetragon統計" test_tetragon_statistics
    run_test "Tetragon事件" test_tetragon_events
    run_test "無效端點" test_invalid_endpoint
    run_test "方法不允許" test_method_not_allowed
    run_test "訂單歷史" test_order_history
    run_test "持倉信息" test_positions
    run_test "安全測試" test_security_tests
    run_test "API性能" test_api_performance
    run_test "JSON格式" test_json_format
    
    # 顯示結果
    echo ""
    log "測試完成"
    echo "────────────────────────────────"
    echo "總測試數: $TOTAL_TESTS"
    echo -e "通過: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "失敗: ${RED}$FAILED_TESTS${NC}"
    echo "通過率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo "────────────────────────────────"
    
    # 生成報告
    generate_report
    
    # 返回適當的退出代碼
    if [ $FAILED_TESTS -eq 0 ]; then
        success "所有測試通過"
        exit 0
    else
        error "有 $FAILED_TESTS 個測試失敗"
        exit 1
    fi
}

# 清理臨時文件
cleanup() {
    rm -f /tmp/api_response.json /tmp/create_order_response.json /tmp/json_test.json
}

trap cleanup EXIT

main "$@" 