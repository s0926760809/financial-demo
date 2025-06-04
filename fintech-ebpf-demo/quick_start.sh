#!/bin/bash

# 金融微服務eBPF演示系統 - 快速啟動腳本
# 版本: 1.0
# 作者: FinTech Team

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 圖標
CHECK="✅"
CROSS="❌"
ROCKET="🚀"
GEAR="⚙️"
DATABASE="🗄️"
WEB="🌐"
API="📡"

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                金融微服務eBPF演示系統                        ║"
    echo "║                  快速啟動工具 v1.0                          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
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

# 檢查必要的依賴
check_dependencies() {
    print_step "檢查系統依賴..."
    
    local missing_deps=()
    
    if ! command -v go &> /dev/null; then
        missing_deps+=("Go 1.20+")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js 18+")
    fi
    
    if ! command -v psql &> /dev/null; then
        missing_deps+=("PostgreSQL 14+")
    fi
    
    if ! command -v redis-cli &> /dev/null; then
        missing_deps+=("Redis")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "缺少必要依賴: ${missing_deps[*]}"
        echo -e "${YELLOW}請先安裝缺少的依賴，然後重新運行此腳本。${NC}"
        echo ""
        echo "macOS 安裝命令:"
        echo "brew install postgresql@14 redis go node"
        echo ""
        echo "Ubuntu/Debian 安裝命令:"
        echo "sudo apt update && sudo apt install -y postgresql-14 redis-server golang nodejs npm"
        exit 1
    fi
    
    print_success "所有依賴已安裝"
}

# 檢查數據庫服務
check_database_services() {
    print_step "檢查數據庫服務狀態..."
    
    # 檢查PostgreSQL
    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        print_warning "PostgreSQL未運行，嘗試啟動..."
        if command -v brew &> /dev/null; then
            brew services start postgresql@14 || true
        else
            sudo systemctl start postgresql || true
        fi
        sleep 2
    fi
    
    # 檢查Redis
    if ! redis-cli ping &> /dev/null; then
        print_warning "Redis未運行，嘗試啟動..."
        if command -v brew &> /dev/null; then
            brew services start redis || true
        else
            sudo systemctl start redis-server || true
        fi
        sleep 2
    fi
    
    print_success "數據庫服務檢查完成"
}

# 初始化數據庫
init_database() {
    print_step "初始化數據庫..."
    
    # 檢查數據庫是否存在
    if psql -lqt | cut -d \| -f 1 | grep -qw fintech_db; then
        print_success "數據庫 fintech_db 已存在"
    else
        print_step "創建數據庫 fintech_db..."
        createdb fintech_db
        print_success "數據庫創建成功"
    fi
    
    # 檢查是否需要初始化數據
    if psql -d fintech_db -c "SELECT 1 FROM stocks LIMIT 1;" &> /dev/null; then
        print_success "數據庫已初始化"
    else
        if [ -f "init.sql" ]; then
            print_step "初始化數據庫結構和數據..."
            psql -d fintech_db -f init.sql > /dev/null
            print_success "數據庫初始化完成"
        else
            print_warning "未找到 init.sql 文件，跳過數據庫初始化"
        fi
    fi
}

# 啟動後端服務
start_backend_services() {
    print_step "啟動後端微服務..."
    
    # 設置環境變量
    export DATABASE_HOST=localhost
    export DATABASE_USER=${USER}
    export DATABASE_PASSWORD=""
    export DATABASE_NAME=fintech_db
    export REDIS_HOST=localhost
    export REDIS_PASSWORD=""
    export SERVER_PORT=30080
    
    # 創建日誌目錄
    mkdir -p logs
    
    # 只啟動實際存在的 trading-api 服務
    service="trading-api"
    port=30080
    
    # 檢查端口是否被佔用
    if lsof -i :$port &> /dev/null; then
        print_warning "$service 端口 $port 已被佔用，可能已經在運行"
        return
    fi
    
    # 檢查服務目錄是否存在
    if [ ! -d "backend/$service" ]; then
        print_error "未找到 backend/$service 目錄"
        return
    fi
    
    print_step "啟動 $service (端口: $port)..."
    
    cd backend/$service
    
    # 先編譯服務
    print_step "編譯 $service..."
    go build -o $service .
    
    if [ $? -eq 0 ]; then
        print_success "$service 編譯成功"
        
        # 啟動編譯好的二進制文件
        nohup ./$service > ../../logs/$service.log 2>&1 &
        echo $! > ../../logs/$service.pid
        cd ../..
        
        # 等待服務啟動
        sleep 5
        
        # 檢查服務健康狀態
        if curl -s http://localhost:$port/health > /dev/null; then
            print_success "$service 啟動成功"
        else
            print_error "$service 啟動失敗，檢查日誌: logs/$service.log"
        fi
    else
        print_error "$service 編譯失敗"
        cd ../..
    fi
}

# 啟動前端服務
start_frontend() {
    print_step "啟動前端服務..."
    
    cd frontend
    
    # 檢查是否需要安裝依賴
    if [ ! -d "node_modules" ]; then
        print_step "安裝前端依賴..."
        npm install > ../logs/frontend-install.log 2>&1
        print_success "前端依賴安裝完成"
    fi
    
    # 檢查端口是否被佔用
    if lsof -i :5173 &> /dev/null; then
        print_warning "前端端口 5173 已被佔用，跳過啟動"
        cd ..
        return
    fi
    
    # 啟動前端開發服務器
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    echo $! > ../logs/frontend.pid
    cd ..
    
    sleep 5
    print_success "前端服務啟動成功"
}

# 驗證系統狀態
verify_system() {
    print_step "驗證系統狀態..."
    
    local all_healthy=true
    
    # 檢查 Trading API
    if curl -s http://localhost:30080/health > /dev/null; then
        print_success "Trading API (端口: 30080) - 健康"
    else
        print_error "Trading API (端口: 30080) - 異常"
        all_healthy=false
    fi
    
    # 檢查前端服務
    if curl -s http://localhost:5173 > /dev/null; then
        print_success "Frontend (端口: 5173) - 健康"
    else
        print_error "Frontend (端口: 5173) - 異常"
        all_healthy=false
    fi
    
    if $all_healthy; then
        echo ""
        echo -e "${GREEN}${ROCKET} 系統啟動完成！${NC}"
        echo ""
        echo -e "${CYAN}訪問地址:${NC}"
        echo -e "  ${WEB} 前端界面: ${BLUE}http://localhost:5173${NC}"
        echo -e "  ${API} Trading API: ${BLUE}http://localhost:30080${NC}"
        echo ""
        echo -e "${YELLOW}測試命令:${NC}"
        echo -e "${PURPLE}健康檢查:${NC}"
        echo "curl http://localhost:30080/health"
        echo ""
        echo -e "${PURPLE}創建 GOOGL 訂單:${NC}"
        echo 'curl -X POST http://localhost:30080/api/v1/orders \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -H "X-User-ID: demo_user" \'
        echo '  -d '"'"'{"symbol": "GOOGL", "side": "buy", "order_type": "limit", "quantity": 5, "price": 170.00}'"'"
        echo ""
        echo -e "${PURPLE}查看投資組合:${NC}"
        echo 'curl -H "X-User-ID: demo_user" http://localhost:30080/api/v1/portfolio'
        echo ""
        echo -e "${PURPLE}停止系統: ${NC}./stop_system.sh"
    else
        print_error "部分服務啟動失敗，請檢查日誌文件"
    fi
}

# 創建停止腳本
create_stop_script() {
    cat > stop_system.sh << 'EOF'
#!/bin/bash

echo "🛑 停止金融微服務系統..."

# 停止服務
services=("trading-api" "frontend")

for service in "${services[@]}"; do
    if [ -f "logs/$service.pid" ]; then
        pid=$(cat logs/$service.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            echo "✅ 停止 $service (PID: $pid)"
        fi
        rm -f logs/$service.pid
    fi
done

# 額外檢查端口並殺死進程
for port in 30080 5173; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        kill $pid 2>/dev/null
        echo "✅ 停止端口 $port 的進程 (PID: $pid)"
    fi
done

echo "🏁 所有服務已停止"
EOF
    chmod +x stop_system.sh
}

# 主函數
main() {
    print_banner
    
    # 檢查是否在正確的目錄
    if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "請在 fintech-ebpf-demo 項目根目錄下運行此腳本"
        exit 1
    fi
    
    check_dependencies
    check_database_services
    init_database
    start_backend_services
    start_frontend
    verify_system
    create_stop_script
    
    echo ""
    echo -e "${GREEN}🎉 啟動完成！開始使用您的金融微服務系統吧！${NC}"
}

# 執行主函數
main "$@" 