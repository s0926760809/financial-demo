#!/bin/bash

# 金融eBPF演示系統 - 狀態檢查腳本
# 版本: v3.0.0
# 更新時間: 2025/01/06

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 圖標定義
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
GEAR="⚙️"

# 日誌函數
header() {
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================${NC}"
}

log() {
    echo -e "${GREEN}$1${NC}"
}

warn() {
    echo -e "${YELLOW}$1${NC}"
}

error() {
    echo -e "${RED}$1${NC}"
}

info() {
    echo -e "${BLUE}$1${NC}"
}

success() {
    echo -e "${GREEN}$CHECK $1${NC}"
}

fail() {
    echo -e "${RED}$CROSS $1${NC}"
}

# 檢查服務狀態
check_service() {
    local url=$1
    local name=$2
    local port=$3
    
    printf "%-20s " "$name:"
    
    # 檢查端口是否開放
    if ! lsof -ti:$port >/dev/null 2>&1; then
        fail "未運行 (端口 $port 未監聽)"
        return 1
    fi
    
    # 檢查HTTP響應
    if curl -s --connect-timeout 3 "$url" >/dev/null 2>&1; then
        success "運行中 (端口 $port)"
        return 0
    else
        warn "端口開放但HTTP無響應 (端口 $port)"
        return 1
    fi
}

# 檢查進程狀態
check_process() {
    local pid_file=$1
    local name=$2
    
    printf "%-20s " "$name:"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            success "運行中 (PID: $pid)"
            return 0
        else
            warn "PID文件存在但進程不存在"
            return 1
        fi
    else
        fail "PID文件不存在"
        return 1
    fi
}

# 檢查API功能
check_api_function() {
    local endpoint=$1
    local description=$2
    
    printf "%-25s " "$description:"
    
    local response=$(curl -s --connect-timeout 3 "$endpoint" 2>/dev/null)
    local status=$?
    
    if [ $status -eq 0 ] && [ -n "$response" ]; then
        success "正常"
        return 0
    else
        fail "異常"
        return 1
    fi
}

# 顯示日誌狀態
show_log_status() {
    header "$GEAR 日誌文件狀態"
    
    if [ -d "logs" ]; then
        for log_file in logs/*.log; do
            if [ -f "$log_file" ]; then
                local size=$(du -h "$log_file" | cut -f1)
                local lines=$(wc -l < "$log_file" 2>/dev/null || echo "0")
                printf "%-25s %8s (%s 行)\n" "$(basename "$log_file"):" "$size" "$lines"
            fi
        done
    else
        warn "logs 目錄不存在"
    fi
}

# 顯示系統資源
show_system_resources() {
    header "$GEAR 系統資源使用"
    
    # CPU 使用率
    local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    printf "%-20s %s%%\n" "CPU 使用率:" "$cpu_usage"
    
    # 內存使用率
    local memory_pressure=$(memory_pressure 2>/dev/null | head -1 || echo "N/A")
    printf "%-20s %s\n" "內存壓力:" "$memory_pressure"
    
    # 磁盤使用率
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}')
    printf "%-20s %s\n" "磁盤使用率:" "$disk_usage"
}

# 主函數
main() {
    echo -e "${PURPLE}$ROCKET 金融eBPF演示系統狀態檢查${NC}"
    echo -e "${PURPLE}時間: $(date)${NC}"
    echo ""
    
    # 檢查核心服務
    header "$GEAR 核心服務狀態"
    local services_ok=0
    local total_services=5
    
    check_service "http://localhost:30080/health" "Trading API" 30080 && ((services_ok++))
    check_service "http://localhost:30081/health" "Risk API" 30081 && ((services_ok++))
    check_service "http://localhost:30082/health" "Payment API" 30082 && ((services_ok++))
    check_service "http://localhost:30083/health" "Audit API" 30083 && ((services_ok++))
    check_service "http://localhost:3000" "Frontend" 3000 && ((services_ok++))
    
    echo ""
    if [ $services_ok -eq $total_services ]; then
        success "所有服務運行正常 ($services_ok/$total_services)"
    else
        warn "部分服務異常 ($services_ok/$total_services)"
    fi
    
    # 檢查進程狀態
    echo ""
    header "$GEAR 進程狀態"
    check_process "logs/trading-api.pid" "Trading API"
    check_process "logs/risk-api.pid" "Risk API"
    check_process "logs/payment-api.pid" "Payment API"
    check_process "logs/audit-api.pid" "Audit API"
    check_process "logs/frontend.pid" "Frontend"
    
    # 檢查API功能
    echo ""
    header "$GEAR API功能測試"
    check_api_function "http://localhost:30080/health" "Trading健康檢查"
    check_api_function "http://localhost:30080/api/v1/tetragon/statistics" "Tetragon統計"
    check_api_function "http://localhost:30080/api/v1/tetragon/events" "Tetragon事件"
    check_api_function "http://localhost:30081/health" "Risk健康檢查"
    check_api_function "http://localhost:30082/health" "Payment健康檢查"
    check_api_function "http://localhost:30083/health" "Audit健康檢查"
    
    # 檢查端口狀態
    echo ""
    header "$GEAR 端口監聽狀態"
    check_ports=(30080 30081 30082 30083 3000)
    for port in "${check_ports[@]}"; do
        printf "%-20s " "端口 $port:"
        if lsof -ti:$port >/dev/null 2>&1; then
            local process=$(lsof -ti:$port | head -1)
            local process_name=$(ps -p $process -o comm= 2>/dev/null || echo "未知")
            success "監聽中 (進程: $process_name)"
        else
            fail "未監聽"
        fi
    done
    
    # 顯示日誌狀態
    echo ""
    show_log_status
    
    # 顯示系統資源
    echo ""
    show_system_resources
    
    # 檢查Tetragon特定功能
    echo ""
    header "$GEAR Tetragon eBPF狀態"
    
    # 檢查tetra CLI工具
    printf "%-25s " "tetra CLI工具:"
    if command -v ./tetra >/dev/null 2>&1; then
        success "已安裝"
    else
        warn "未安裝 (運行 curl -L https://github.com/cilium/tetragon/releases/latest/download/tetra-darwin-amd64.tar.gz | tar -xz)"
    fi
    
    # 檢查WebSocket連接
    printf "%-25s " "WebSocket端點:"
    if timeout 3 bash -c "</dev/tcp/localhost/30080" 2>/dev/null; then
        success "可連接"
    else
        fail "無法連接"
    fi
    
    # 總結
    echo ""
    header "$INFO 系統總結"
    
    if [ $services_ok -eq $total_services ]; then
        success "系統運行正常，所有服務可用"
        info "訪問地址: http://localhost:3000"
        info "API文檔: http://localhost:30080/docs"
    else
        warn "系統部分功能異常，請檢查失敗的服務"
        info "啟動服務: ./start_services.sh"
        info "查看日誌: tail -f logs/*.log"
    fi
    
    echo ""
    info "更多操作:"
    echo "  ./start_services.sh  - 啟動所有服務"
    echo "  ./stop_services.sh   - 停止所有服務"
    echo "  ./check_status.sh    - 檢查系統狀態"
    echo "  ./check_status.sh -v - 詳細檢查"
    echo ""
}

# 如果使用 -v 參數，顯示詳細信息
if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
    # 詳細模式：顯示更多信息
    main
    
    echo ""
    header "$GEAR 詳細診斷信息"
    
    # 顯示網絡連接
    echo "活躍連接:"
    netstat -an | grep -E ":(3000|30080|30081|30082|30083)" | head -10
    
    # 顯示最近的錯誤日誌
    echo ""
    echo "最近的錯誤日誌:"
    for log_file in logs/*.log; do
        if [ -f "$log_file" ]; then
            echo "--- $(basename "$log_file") ---"
            tail -5 "$log_file" | grep -i error || echo "無錯誤"
        fi
    done
else
    main
fi 