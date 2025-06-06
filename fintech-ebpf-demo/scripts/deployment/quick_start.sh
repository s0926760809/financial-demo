#!/bin/bash

# 金融微服務eBPF演示系統 - 快速啟動腳本
# 版本: v3.0.0
# 更新時間: 2025/01/06

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
WEB="🌐"
API="📡"

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                金融微服務eBPF演示系統                        ║"
    echo "║                  快速啟動工具 v3.0.0                        ║"
    echo "║                  Tetragon + 告警控制                        ║"
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

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# 檢查項目結構
check_project_structure() {
    print_step "檢查項目結構..."
    
    if [ ! -d "fintech-ebpf-demo" ]; then
        print_error "未找到 fintech-ebpf-demo 目錄"
        print_info "請確認您在項目根目錄中運行此腳本"
        exit 1
    fi
    
    cd fintech-ebpf-demo
    
    if [ ! -f "start_services.sh" ]; then
        print_error "未找到 start_services.sh 腳本"
        exit 1
    fi
    
    print_success "項目結構檢查完成"
}

# 檢查必要的依賴
check_dependencies() {
    print_step "檢查系統依賴..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js 18+")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "缺少必要依賴: ${missing_deps[*]}"
        echo -e "${YELLOW}請先安裝缺少的依賴，然後重新運行此腳本。${NC}"
        echo ""
        echo "macOS 安裝命令:"
        echo "brew install node"
        echo ""
        echo "Ubuntu/Debian 安裝命令:"
        echo "sudo apt update && sudo apt install -y nodejs npm curl"
        exit 1
    fi
    
    print_success "所有依賴已安裝"
}

# 檢查 Tetragon CLI 工具
check_tetragon_cli() {
    print_step "檢查 Tetragon CLI 工具..."
    
    if [ ! -f "tetra" ]; then
        print_warning "Tetragon CLI 工具未安裝，正在下載..."
        curl -L https://github.com/cilium/tetragon/releases/latest/download/tetra-darwin-amd64.tar.gz | tar -xz
        chmod +x tetra
        print_success "Tetragon CLI 工具安裝完成"
    else
        print_success "Tetragon CLI 工具已安裝"
    fi
}

# 主函數
main() {
    print_banner
    echo ""
    
    print_step "開始啟動金融eBPF演示系統..."
    echo ""
    
    # 檢查基本環境
    check_project_structure
    check_dependencies
    check_tetragon_cli
    
    echo ""
    print_step "啟動系統服務..."
    echo ""
    
    # 執行主要的啟動腳本
    if ./start_services.sh; then
        echo ""
        print_success "🎉 系統啟動完成！"
        echo ""
        print_info "系統功能:"
        echo "  🔐 Tetragon eBPF 安全監控"
        echo "  📈 實時金融交易演示"
        echo "  🚨 可控的安全告警系統"
        echo "  🌙 暗色/亮色主題切換"
        echo ""
        print_info "訪問地址:"
        echo "  💻 Web 應用:    http://localhost:3000"
        echo "  📊 Trading API: http://localhost:30080"
        echo "  ⚠️  Risk API:   http://localhost:30081"
        echo "  💳 Payment API: http://localhost:30082"
        echo "  📝 Audit API:   http://localhost:30083"
        echo ""
        print_info "管理命令:"
        echo "  ./check_status.sh     - 檢查系統狀態"
        echo "  ./stop_services.sh    - 停止所有服務"
        echo "  ./tetra getevents     - 查看 Tetragon 事件"
        echo ""
        print_success "系統準備就緒！請訪問 http://localhost:3000 開始使用"
    else
        print_error "系統啟動失敗，請檢查錯誤信息"
        echo ""
        print_info "故障排除:"
        echo "  ./check_status.sh -v  - 詳細狀態檢查"
        echo "  tail -f logs/*.log    - 查看服務日誌"
        echo "  ./stop_services.sh    - 停止所有服務後重試"
        exit 1
    fi
}

# 顯示幫助信息
show_help() {
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -h, --help     顯示此幫助信息"
    echo "  -s, --status   檢查系統狀態"
    echo "  --stop         停止所有服務"
    echo ""
    echo "示例:"
    echo "  $0             # 啟動系統"
    echo "  $0 --status    # 檢查狀態"
    echo "  $0 --stop      # 停止服務"
}

# 處理命令行參數
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -s|--status)
        check_project_structure
        ./check_status.sh
        ;;
    --stop)
        check_project_structure
        ./stop_services.sh
        ;;
    "")
        main
        ;;
    *)
        print_error "未知參數: $1"
        show_help
        exit 1
        ;;
esac 