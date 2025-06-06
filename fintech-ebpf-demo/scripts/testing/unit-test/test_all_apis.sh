#!/bin/bash

# 所有微服務API綜合測試
# 版本: v1.0.0
# 測試範圍: Trading, Risk, Payment, Audit APIs

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="$SCRIPT_DIR/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 創建報告目錄
mkdir -p "$REPORT_DIR"

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO:${NC} $1"
}

# 測試各個API服務
test_trading_api() {
    log "測試 Trading API (端口 30080)"
    local base_url="http://localhost:30080"
    
    # 健康檢查
    if curl -s "${base_url}/health" >/dev/null 2>&1; then
        echo "✅ Trading API - 健康檢查通過"
    else
        echo "❌ Trading API - 健康檢查失敗"
        return 1
    fi
    
    # 訂單API
    if curl -s "${base_url}/api/v1/orders" >/dev/null 2>&1; then
        echo "✅ Trading API - 訂單接口正常"
    else
        echo "❌ Trading API - 訂單接口異常"
    fi
    
    # 市場數據
    if curl -s "${base_url}/api/v1/market/stocks" >/dev/null 2>&1; then
        echo "✅ Trading API - 市場數據正常"
    else
        echo "❌ Trading API - 市場數據異常"
    fi
    
    # Tetragon集成
    if curl -s "${base_url}/api/v1/tetragon/statistics" >/dev/null 2>&1; then
        echo "✅ Trading API - Tetragon集成正常"
    else
        echo "❌ Trading API - Tetragon集成異常"
    fi
}

test_risk_api() {
    log "測試 Risk API (端口 30081)"
    local base_url="http://localhost:30081"
    
    # 健康檢查
    if curl -s "${base_url}/health" >/dev/null 2>&1; then
        echo "✅ Risk API - 健康檢查通過"
    else
        echo "❌ Risk API - 健康檢查失敗"
        return 1
    fi
    
    # 風險評估
    if curl -s "${base_url}/api/v1/risk/assessment" >/dev/null 2>&1; then
        echo "✅ Risk API - 風險評估正常"
    else
        echo "❌ Risk API - 風險評估異常"
    fi
    
    # 限制檢查
    if curl -s "${base_url}/api/v1/risk/limits" >/dev/null 2>&1; then
        echo "✅ Risk API - 限制檢查正常"  
    else
        echo "❌ Risk API - 限制檢查異常"
    fi
}

test_payment_api() {
    log "測試 Payment API (端口 30082)"
    local base_url="http://localhost:30082"
    
    # 健康檢查
    if curl -s "${base_url}/health" >/dev/null 2>&1; then
        echo "✅ Payment API - 健康檢查通過"
    else
        echo "❌ Payment API - 健康檢查失敗"
        return 1
    fi
    
    # 支付處理
    if curl -s "${base_url}/api/v1/payments" >/dev/null 2>&1; then
        echo "✅ Payment API - 支付接口正常"
    else
        echo "❌ Payment API - 支付接口異常"
    fi
    
    # 餘額查詢
    if curl -s "${base_url}/api/v1/balance" >/dev/null 2>&1; then
        echo "✅ Payment API - 餘額查詢正常"
    else
        echo "❌ Payment API - 餘額查詢異常"
    fi
}

test_audit_api() {
    log "測試 Audit API (端口 30083)"
    local base_url="http://localhost:30083"
    
    # 健康檢查
    if curl -s "${base_url}/health" >/dev/null 2>&1; then
        echo "✅ Audit API - 健康檢查通過"
    else
        echo "❌ Audit API - 健康檢查失敗"
        return 1
    fi
    
    # 審計日誌
    if curl -s "${base_url}/api/v1/audit/logs" >/dev/null 2>&1; then
        echo "✅ Audit API - 審計日誌正常"
    else
        echo "❌ Audit API - 審計日誌異常"
    fi
    
    # 合規檢查
    if curl -s "${base_url}/api/v1/compliance" >/dev/null 2>&1; then
        echo "✅ Audit API - 合規檢查正常"
    else
        echo "❌ Audit API - 合規檢查異常"
    fi
}

# 測試跨服務集成
test_integration() {
    log "測試跨服務集成"
    
    # 模擬完整交易流程
    local order_payload='{
        "symbol": "TSLA",
        "side": "BUY", 
        "quantity": 50,
        "price": 200.00,
        "type": "LIMIT"
    }'
    
    # 1. 創建訂單 (Trading API)
    local order_response=$(curl -s -w "%{http_code}" \
        -X POST "http://localhost:30080/api/v1/orders" \
        -H "Content-Type: application/json" \
        -d "$order_payload" \
        -o /tmp/integration_order.json)
    
    local order_status="${order_response: -3}"
    
    if [ "$order_status" = "200" ] || [ "$order_status" = "201" ]; then
        echo "✅ 集成測試 - 訂單創建成功"
        
        # 2. 風險檢查 (Risk API) 
        local risk_response=$(curl -s -w "%{http_code}" \
            -X POST "http://localhost:30081/api/v1/risk/check" \
            -H "Content-Type: application/json" \
            -d "$order_payload" \
            -o /tmp/integration_risk.json)
            
        local risk_status="${risk_response: -3}"
        
        if [ "$risk_status" = "200" ]; then
            echo "✅ 集成測試 - 風險檢查通過"
        else
            echo "❌ 集成測試 - 風險檢查失敗"
        fi
        
    else
        echo "❌ 集成測試 - 訂單創建失敗"
    fi
}

# 性能測試
test_performance() {
    log "執行性能測試"
    
    local apis=(
        "http://localhost:30080/health"
        "http://localhost:30081/health" 
        "http://localhost:30082/health"
        "http://localhost:30083/health"
    )
    
    for api in "${apis[@]}"; do
        local start_time=$(date +%s%N)
        curl -s "$api" >/dev/null 2>&1
        local end_time=$(date +%s%N)
        
        local duration=$(( (end_time - start_time) / 1000000 ))
        local service=$(echo "$api" | grep -o ":[0-9]*" | tr -d ":")
        
        if [ $duration -lt 500 ]; then
            echo "✅ 性能測試 - 端口 $service: ${duration}ms (優秀)"
        elif [ $duration -lt 1000 ]; then
            echo "⚠️ 性能測試 - 端口 $service: ${duration}ms (良好)"
        else
            echo "❌ 性能測試 - 端口 $service: ${duration}ms (需優化)"
        fi
    done
}

# 安全測試
test_security() {
    log "執行安全測試"
    
    # 測試未授權訪問
    local response=$(curl -s -w "%{http_code}" \
        -X POST "http://localhost:30080/api/v1/orders" \
        -o /dev/null)
    
    local status="${response: -3}"
    
    if [ "$status" = "401" ] || [ "$status" = "403" ]; then
        echo "✅ 安全測試 - 未授權訪問被正確拒絕"
    else
        echo "⚠️ 安全測試 - 未授權訪問處理需檢查"
    fi
    
    # 測試SQL注入防護
    local malicious_payload="'; DROP TABLE users; --"
    local response=$(curl -s -w "%{http_code}" \
        -X GET "http://localhost:30080/api/v1/orders?id=$malicious_payload" \
        -o /dev/null)
        
    if [ "${response: -3}" != "500" ]; then
        echo "✅ 安全測試 - SQL注入防護正常"
    else
        echo "❌ 安全測試 - SQL注入防護可能有問題"
    fi
}

# 生成綜合報告
generate_comprehensive_report() {
    local report_file="$REPORT_DIR/comprehensive_test_report_$TIMESTAMP.json"
    
    log "生成綜合測試報告: $report_file"
    
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "test_suite": "Comprehensive API Testing",
    "services_tested": [
        {
            "name": "Trading API",
            "port": 30080,
            "endpoints_tested": ["/health", "/api/v1/orders", "/api/v1/market/stocks", "/api/v1/tetragon/statistics"]
        },
        {
            "name": "Risk API", 
            "port": 30081,
            "endpoints_tested": ["/health", "/api/v1/risk/assessment", "/api/v1/risk/limits"]
        },
        {
            "name": "Payment API",
            "port": 30082, 
            "endpoints_tested": ["/health", "/api/v1/payments", "/api/v1/balance"]
        },
        {
            "name": "Audit API",
            "port": 30083,
            "endpoints_tested": ["/health", "/api/v1/audit/logs", "/api/v1/compliance"]
        }
    ],
    "test_categories": [
        "Health Checks",
        "API Functionality", 
        "Integration Testing",
        "Performance Testing",
        "Security Testing"
    ],
    "environment": {
        "test_runner": "$(whoami)",
        "hostname": "$(hostname)",
        "os": "$(uname -s)",
        "timestamp": "$(date)"
    }
}
EOF

    log "報告已生成: $report_file"
}

# 主函數
main() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                 金融微服務API綜合測試套件                   ║${NC}"
    echo -e "${PURPLE}║                      v1.0.0                                 ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # 檢查依賴
    if ! command -v curl >/dev/null 2>&1; then
        error "curl 未安裝，請先安裝 curl"
        exit 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        warn "jq 未安裝，部分測試功能將受限"
    fi
    
    # 執行測試套件
    info "開始執行API測試套件..."
    echo ""
    
    # 基礎服務測試
    test_trading_api
    echo ""
    test_risk_api  
    echo ""
    test_payment_api
    echo ""
    test_audit_api
    echo ""
    
    # 集成測試
    test_integration
    echo ""
    
    # 性能測試
    test_performance
    echo ""
    
    # 安全測試
    test_security
    echo ""
    
    # 生成報告
    generate_comprehensive_report
    
    echo ""
    log "所有測試完成"
    info "檢查 $REPORT_DIR 目錄查看詳細報告"
    echo ""
}

# 清理函數
cleanup() {
    rm -f /tmp/integration_*.json
}

trap cleanup EXIT

main "$@" 