#!/bin/bash

# 🎛️ 金融微服務eBPF演示系統 - 統一服務管理器
# 版本: 3.0
# 整合所有服務管理功能到一個腳本中

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 圖標
CHECK="✅"
CROSS="❌"
ROCKET="🚀"
GEAR="⚙️"
STOP="🛑"
CLEAN="🧹"
SEARCH="🔍"
STATUS="📊"
RESTART="🔄"

# 服務配置
SERVICES=(
    "trading-api:30080:backend/trading-api"
    "frontend:5173:frontend"
)

# 日誌目錄
LOG_DIR="logs"
PID_DIR="logs"

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║             🎛️  金融微服務eBPF演示系統管理器                   ║"
    echo "║                        版本 3.0                              ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_help() {
    echo -e "${BOLD}使用方法:${NC}"
    echo "  ./service_manager.sh <command> [options]"
    echo ""
    echo -e "${BOLD}命令:${NC}"
    echo -e "  ${GREEN}start${NC}      - 啟動所有服務"
    echo -e "  ${RED}stop${NC}       - 停止所有服務" 
    echo -e "  ${BLUE}restart${NC}    - 重啟所有服務"
    echo -e "  ${YELLOW}status${NC}     - 查看服務狀態"
    echo -e "  ${PURPLE}logs${NC}       - 查看服務日誌"
    echo -e "  ${CYAN}clean${NC}      - 清理臨時文件"
    echo -e "  ${GEAR}health${NC}     - 健康檢查"
    echo -e "  ${ROCKET}quick${NC}      - 快速重啟(force stop + start)"
    echo ""
    echo -e "${BOLD}選項:${NC}"
    echo -e "  ${YELLOW}-f, --force${NC}     - 強制執行(適用於stop/restart)"
    echo -e "  ${YELLOW}-v, --verbose${NC}   - 顯示詳細信息"
    echo -e "  ${YELLOW}-h, --help${NC}      - 顯示此幫助信息"
    echo ""
    echo -e "${BOLD}示例:${NC}"
    echo "  ./service_manager.sh start           # 啟動所有服務"
    echo "  ./service_manager.sh stop --force    # 強制停止所有服務"
    echo "  ./service_manager.sh restart         # 重啟所有服務"
    echo "  ./service_manager.sh status          # 查看狀態"
    echo "  ./service_manager.sh logs trading-api # 查看特定服務日誌"
}

print_step() {
    echo -e "${BLUE}${GEAR} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# 檢查依賴
check_dependencies() {
    print_step "檢查系統依賴..."
    
    local missing_deps=()
    
    command -v go >/dev/null 2>&1 || missing_deps+=("Go 1.20+")
    command -v node >/dev/null 2>&1 || missing_deps+=("Node.js 18+")
    command -v psql >/dev/null 2>&1 || missing_deps+=("PostgreSQL 14+")
    command -v redis-cli >/dev/null 2>&1 || missing_deps+=("Redis")
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "缺少必要依賴: ${missing_deps[*]}"
        echo -e "${YELLOW}macOS 安裝命令: brew install postgresql@14 redis go node${NC}"
        exit 1
    fi
    
    print_success "所有依賴已安裝"
}

# 檢查並啟動數據庫服務
ensure_database_services() {
    print_step "檢查數據庫服務..."
    
    # PostgreSQL
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_warning "PostgreSQL未運行，嘗試啟動..."
        if command -v brew >/dev/null 2>&1; then
            brew services start postgresql@14 >/dev/null 2>&1 || true
        fi
        sleep 2
    fi
    
    # Redis  
    if ! redis-cli ping >/dev/null 2>&1; then
        print_warning "Redis未運行，嘗試啟動..."
        if command -v brew >/dev/null 2>&1; then
            brew services start redis >/dev/null 2>&1 || true
        fi
        sleep 2
    fi
    
    print_success "數據庫服務已就緒"
}

# 初始化數據庫
init_database() {
    print_step "檢查數據庫初始化..."
    
    if ! psql -lqt | cut -d \| -f 1 | grep -qw fintech_db; then
        print_step "創建數據庫 fintech_db..."
        createdb fintech_db
    fi
    
    if [ -f "init.sql" ] && ! psql -d fintech_db -c "SELECT 1 FROM stocks LIMIT 1;" >/dev/null 2>&1; then
        print_step "初始化數據庫數據..."
        psql -d fintech_db -f init.sql >/dev/null 2>&1
    fi
    
    print_success "數據庫已就緒"
}

# 獲取服務PID
get_service_pid() {
    local service_name="$1"
    local pid_file="$PID_DIR/$service_name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file" 2>/dev/null)
        if [ ! -z "$pid" ] && ps -p "$pid" >/dev/null 2>&1; then
            echo "$pid"
            return 0
        fi
    fi
    
    return 1
}

# 檢查端口是否被佔用
check_port() {
    local port="$1"
    lsof -i ":$port" >/dev/null 2>&1
}

# 等待端口就緒
wait_for_port() {
    local port="$1"
    local timeout="${2:-30}"
    local count=0
    
    while [ $count -lt $timeout ]; do
        if check_port "$port"; then
            return 0
        fi
        sleep 1
        ((count++))
    done
    
    return 1
}

# 啟動Trading API
start_trading_api() {
    print_step "啟動 Trading API..."
    
    if check_port 30080; then
        print_warning "Trading API 端口 30080 已被佔用"
        return 0
    fi
    
    if [ ! -d "backend/trading-api" ]; then
        print_error "未找到 backend/trading-api 目錄"
        return 1
    fi
    
    # 設置環境變量
    export DATABASE_HOST=localhost
    export DATABASE_USER=${USER}
    export DATABASE_PASSWORD=""
    export DATABASE_NAME=fintech_db
    export REDIS_HOST=localhost
    export REDIS_PASSWORD=""
    export SERVER_PORT=30080
    
    mkdir -p "$LOG_DIR"
    
    cd backend/trading-api
    print_step "編譯 Trading API..."
    if go build -o trading-api . >/dev/null 2>&1; then
        print_success "Trading API 編譯成功"
        
        # 啟動服務
        nohup ./trading-api >"../../$LOG_DIR/trading-api.log" 2>&1 &
        echo $! >"../../$PID_DIR/trading-api.pid"
        cd ../..
        
        if wait_for_port 30080 10; then
            if curl -s http://localhost:30080/health >/dev/null 2>&1; then
                print_success "Trading API 啟動成功"
                return 0
            fi
        fi
        print_error "Trading API 啟動失敗"
        return 1
    else
        print_error "Trading API 編譯失敗"
        cd ../..
        return 1
    fi
}

# 啟動前端
start_frontend() {
    print_step "啟動前端服務..."
    
    if check_port 5173; then
        print_warning "前端端口 5173 已被佔用"
        return 0
    fi
    
    if [ ! -d "frontend" ]; then
        print_error "未找到 frontend 目錄"
        return 1
    fi
    
    mkdir -p "$LOG_DIR"
    
    cd frontend
    if [ ! -d "node_modules" ]; then
        print_step "安裝前端依賴..."
        npm install >/dev/null 2>&1
    fi
    
    print_step "啟動前端開發服務器..."
    nohup npm run dev >"../$LOG_DIR/frontend.log" 2>&1 &
    echo $! >"../$PID_DIR/frontend.pid"
    cd ..
    
    if wait_for_port 5173 15; then
        print_success "前端服務啟動成功"
        return 0
    else
        print_error "前端服務啟動失敗"
        return 1
    fi
}

# 停止服務
stop_service() {
    local service_name="$1"
    local force="${2:-false}"
    
    local pid=$(get_service_pid "$service_name" 2>/dev/null || echo "")
    
    if [ ! -z "$pid" ]; then
        print_step "停止 $service_name (PID: $pid)"
        
        if [ "$force" = "true" ]; then
            kill -9 "$pid" 2>/dev/null || true
        else
            kill "$pid" 2>/dev/null || true
            sleep 2
            
            if ps -p "$pid" >/dev/null 2>&1; then
                print_warning "$service_name 未響應，強制停止"
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        
        rm -f "$PID_DIR/$service_name.pid"
        print_success "$service_name 已停止"
        return 0
    else
        print_warning "$service_name 未在運行"
        return 1
    fi
}

# 通過端口停止進程
force_stop_by_ports() {
    local ports=(30080 5173)
    local stopped=0
    
    for port in "${ports[@]}"; do
        local pid=$(lsof -ti ":$port" 2>/dev/null || echo "")
        if [ ! -z "$pid" ]; then
            print_step "強制停止端口 $port 的進程 (PID: $pid)"
            kill -9 "$pid" 2>/dev/null || true
            ((stopped++))
        fi
    done
    
    if [ $stopped -gt 0 ]; then
        print_success "強制停止了 $stopped 個進程"
    fi
}

# 服務狀態檢查
check_service_status() {
    local service_name="$1"
    local port="$2"
    
    local pid=$(get_service_pid "$service_name" 2>/dev/null || echo "")
    local port_status="❌"
    local health_status="❌"
    
    if [ ! -z "$pid" ]; then
        if check_port "$port"; then
            port_status="✅"
            
            case "$service_name" in
                "trading-api")
                    if curl -s http://localhost:$port/health >/dev/null 2>&1; then
                        health_status="✅"
                    fi
                    ;;
                "frontend")
                    if curl -s http://localhost:$port >/dev/null 2>&1; then
                        health_status="✅"
                    fi
                    ;;
            esac
        fi
        
        echo -e "  ${service_name}: PID=${pid} Port=${port_status} Health=${health_status}"
    else
        echo -e "  ${service_name}: ${RED}未運行${NC}"
    fi
}

# 命令處理函數
cmd_start() {
    print_banner
    echo -e "${ROCKET} 啟動所有服務...\n"
    
    check_dependencies
    ensure_database_services
    init_database
    
    start_trading_api
    start_frontend
    
    echo ""
    print_success "所有服務已啟動"
    echo ""
    echo -e "${BOLD}服務地址:${NC}"
    echo -e "  前端界面: ${CYAN}http://localhost:5173${NC}"
    echo -e "  Trading API: ${CYAN}http://localhost:30080${NC}"
    echo -e "  健康檢查: ${CYAN}http://localhost:30080/health${NC}"
    echo ""
    echo -e "${YELLOW}使用 './service_manager.sh status' 檢查服務狀態${NC}"
}

cmd_stop() {
    local force="$1"
    print_banner
    
    if [ "$force" != "true" ]; then
        echo -e "${YELLOW}即將停止所有服務，繼續嗎? (y/N): ${NC}"
        read -r -n 1 response
        echo
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_info "操作已取消"
            exit 0
        fi
    fi
    
    echo -e "${STOP} 停止所有服務...\n"
    
    stop_service "trading-api" "$force"
    stop_service "frontend" "$force"
    
    if [ "$force" = "true" ]; then
        force_stop_by_ports
    fi
    
    print_success "所有服務已停止"
}

cmd_restart() {
    local force="$1"
    print_banner
    echo -e "${RESTART} 重啟所有服務...\n"
    
    cmd_stop "$force"
    sleep 2
    cmd_start
}

cmd_status() {
    print_banner
    echo -e "${STATUS} 服務狀態檢查...\n"
    
    echo -e "${BOLD}服務狀態:${NC}"
    check_service_status "trading-api" "30080"
    check_service_status "frontend" "5173"
    
    echo ""
    echo -e "${BOLD}端口佔用:${NC}"
    local ports=(30080 5173)
    for port in "${ports[@]}"; do
        if check_port "$port"; then
            local pid=$(lsof -ti ":$port" 2>/dev/null)
            echo -e "  端口 $port: ${GREEN}佔用${NC} (PID: $pid)"
        else
            echo -e "  端口 $port: ${RED}空閒${NC}"
        fi
    done
    
    echo ""
    echo -e "${BOLD}數據庫狀態:${NC}"
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "  PostgreSQL: ${GREEN}運行中${NC}"
    else
        echo -e "  PostgreSQL: ${RED}未運行${NC}"
    fi
    
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "  Redis: ${GREEN}運行中${NC}"
    else
        echo -e "  Redis: ${RED}未運行${NC}"
    fi
}

cmd_logs() {
    local service="$1"
    
    if [ -z "$service" ]; then
        echo -e "${BOLD}可用的日誌文件:${NC}"
        if [ -d "$LOG_DIR" ]; then
            ls -la "$LOG_DIR"/*.log 2>/dev/null || echo "沒有日誌文件"
        fi
        return
    fi
    
    local log_file="$LOG_DIR/$service.log"
    if [ -f "$log_file" ]; then
        echo -e "${BOLD}$service 服務日誌 (最後50行):${NC}"
        tail -n 50 "$log_file"
    else
        print_error "日誌文件不存在: $log_file"
    fi
}

cmd_clean() {
    print_banner
    echo -e "${CLEAN} 清理臨時文件...\n"
    
    # 清理PID文件
    rm -f "$PID_DIR"/*.pid
    print_success "清理 PID 文件"
    
    # 清理編譯文件
    if [ -f "backend/trading-api/trading-api" ]; then
        rm -f backend/trading-api/trading-api
        print_success "清理編譯的二進制文件"
    fi
    
    echo ""
    echo -e "${YELLOW}是否清理日誌文件? (y/N): ${NC}"
    read -r -n 1 response
    echo
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -f "$LOG_DIR"/*.log
        print_success "清理日誌文件"
    fi
}

cmd_health() {
    print_banner
    echo -e "${GEAR} 健康檢查...\n"
    
    echo -e "${BOLD}API健康檢查:${NC}"
    if curl -s http://localhost:30080/health | grep -q '"status":"healthy"'; then
        print_success "Trading API 健康檢查通過"
    else
        print_error "Trading API 健康檢查失敗"
    fi
    
    echo ""
    echo -e "${BOLD}前端檢查:${NC}"
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        print_success "前端服務響應正常"
    else
        print_error "前端服務無響應"
    fi
}

cmd_quick() {
    print_banner
    echo -e "${ROCKET} 快速重啟 (強制停止 + 啟動)...\n"
    
    cmd_stop "true"
    sleep 3
    cmd_start
}

# 主程序
main() {
    local command="$1"
    local option="$2"
    local force="false"
    
    # 處理選項
    case "$option" in
        "-f"|"--force")
            force="true"
            ;;
        "-h"|"--help")
            print_help
            exit 0
            ;;
    esac
    
    # 創建必要目錄
    mkdir -p "$LOG_DIR" "$PID_DIR"
    
    # 執行命令
    case "$command" in
        "start")
            cmd_start
            ;;
        "stop")
            cmd_stop "$force"
            ;;
        "restart")
            cmd_restart "$force"
            ;;
        "status")
            cmd_status
            ;;
        "logs")
            cmd_logs "$option"
            ;;
        "clean")
            cmd_clean
            ;;
        "health")
            cmd_health
            ;;
        "quick")
            cmd_quick
            ;;
        "-h"|"--help"|"help"|"")
            print_help
            ;;
        *)
            print_error "未知命令: $command"
            echo ""
            print_help
            exit 1
            ;;
    esac
}

# 執行主程序
main "$@" 