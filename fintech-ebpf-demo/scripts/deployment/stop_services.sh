#!/bin/bash

# 金融eBPF演示系統 - 服務停止腳本
# 版本: v3.0.0
# 更新時間: 2025/01/06

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
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

# 停止特定PID
stop_service_by_pid() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            info "停止 $service_name (PID: $pid)..."
            kill $pid 2>/dev/null || true
            sleep 2
            
            # 如果進程仍在運行，強制終止
            if ps -p $pid > /dev/null 2>&1; then
                warn "強制終止 $service_name..."
                kill -9 $pid 2>/dev/null || true
            fi
            log "$service_name 已停止"
        else
            warn "$service_name PID文件存在但進程不存在"
        fi
        rm -f "$pid_file"
    else
        info "$service_name PID文件不存在，嘗試按名稱停止..."
        pkill -f "$service_name" 2>/dev/null || true
    fi
}

# 停止端口上的服務
stop_service_by_port() {
    local port=$1
    local service_name=$2
    
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        info "停止端口 $port 上的 $service_name..."
        echo $pids | xargs kill 2>/dev/null || true
        sleep 1
        
        # 檢查是否仍在運行，強制終止
        local remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            warn "強制終止端口 $port 上的進程..."
            echo $remaining_pids | xargs kill -9 2>/dev/null || true
        fi
        log "端口 $port 已釋放"
    fi
}

# 主函數
main() {
    log "🛑 停止金融eBPF演示系統..."
    
    # 檢查日誌目錄
    if [ ! -d "logs" ]; then
        mkdir -p logs
    fi
    
    # 按PID文件停止服務
    info "按PID文件停止服務..."
    stop_service_by_pid "logs/trading-api.pid" "Trading API"
    stop_service_by_pid "logs/risk-api.pid" "Risk API"
    stop_service_by_pid "logs/payment-api.pid" "Payment API"
    stop_service_by_pid "logs/audit-api.pid" "Audit API"
    stop_service_by_pid "logs/frontend.pid" "Frontend"
    
    # 按端口停止服務（備用方法）
    info "檢查並清理端口..."
    stop_service_by_port 30080 "Trading API"
    stop_service_by_port 30081 "Risk API"
    stop_service_by_port 30082 "Payment API"
    stop_service_by_port 30083 "Audit API"
    stop_service_by_port 3000 "Frontend"
    stop_service_by_port 5173 "Vite Dev Server"
    
    # 額外清理（按進程名稱）
    info "清理相關進程..."
    pkill -f "trading-api" 2>/dev/null || true
    pkill -f "risk-api" 2>/dev/null || true
    pkill -f "payment-api" 2>/dev/null || true
    pkill -f "audit-api" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    
    # 等待進程完全停止
    sleep 2
    
    # 驗證服務已停止
    info "驗證服務狀態..."
    check_service_stopped() {
        local port=$1
        local name=$2
        if lsof -ti:$port >/dev/null 2>&1; then
            warn "$name 仍在運行 (端口 $port)"
            return 1
        else
            log "$name 已停止 ✓"
            return 0
        fi
    }
    
    check_service_stopped 30080 "Trading API"
    check_service_stopped 30081 "Risk API"
    check_service_stopped 30082 "Payment API"
    check_service_stopped 30083 "Audit API"
    check_service_stopped 3000 "Frontend"
    
    # 清理日誌（可選）
    if [ "$1" = "--clean-logs" ]; then
        info "清理日誌文件..."
        rm -f logs/*.log logs/*.pid
        log "日誌已清理"
    fi
    
    echo ""
    log "🎉 系統已完全停止！"
    echo ""
    info "服務狀態:"
    echo "  📊 Trading API: 已停止"
    echo "  ⚠️  Risk API:   已停止"
    echo "  💳 Payment API: 已停止"
    echo "  📝 Audit API:   已停止"
    echo "  💻 Frontend:    已停止"
    echo ""
    info "重新啟動系統: ./start_services.sh"
    info "清理日誌: ./stop_services.sh --clean-logs"
    echo ""
}

# 執行主函數
main "$@" 