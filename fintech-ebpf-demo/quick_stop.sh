#!/bin/bash

# 金融微服務eBPF演示系統 - 快速停止腳本
# 版本: 2.0
# 智能停止所有相關服務和進程

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
STOP="🛑"
CLEAN="🧹"
SEARCH="🔍"

print_banner() {
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                金融微服務eBPF演示系統                        ║"
    echo "║                  快速停止工具 v2.0                          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}${SEARCH} $1${NC}"
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

print_stop() {
    echo -e "${RED}${STOP} $1${NC}"
}

print_clean() {
    echo -e "${CYAN}${CLEAN} $1${NC}"
}

# 停止服務通過 PID 文件
stop_services_by_pid() {
    print_step "檢查 PID 文件中的服務..."
    
    local stopped_count=0
    
    # 服務列表
    services=("trading-api" "risk-engine" "payment-gateway" "audit-service" "frontend")
    
    for service in "${services[@]}"; do
        pid_file="logs/$service.pid"
        
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file" 2>/dev/null)
            
            if [ ! -z "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
                print_stop "停止 $service (PID: $pid)"
                kill "$pid" 2>/dev/null
                sleep 1
                
                # 檢查是否還在運行
                if ps -p "$pid" > /dev/null 2>&1; then
                    print_warning "$service 未響應 SIGTERM，發送 SIGKILL"
                    kill -9 "$pid" 2>/dev/null
                fi
                
                ((stopped_count++))
            else
                print_warning "$service PID 文件存在但進程已停止"
            fi
            
            # 清理 PID 文件
            rm -f "$pid_file"
        fi
    done
    
    if [ $stopped_count -eq 0 ]; then
        print_warning "未找到通過 PID 文件管理的服務"
    else
        print_success "通過 PID 文件停止了 $stopped_count 個服務"
    fi
}

# 通過端口停止進程
stop_processes_by_port() {
    print_step "檢查佔用端口的進程..."
    
    local stopped_count=0
    local ports=(30080 8081 8082 8083 5173)
    
    for port in "${ports[@]}"; do
        pid=$(lsof -ti ":$port" 2>/dev/null)
        
        if [ ! -z "$pid" ]; then
            # 獲取進程信息
            process_info=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
            
            print_stop "停止端口 $port 的進程: $process_info (PID: $pid)"
            kill "$pid" 2>/dev/null
            sleep 1
            
            # 檢查是否還在運行
            if ps -p "$pid" > /dev/null 2>&1; then
                print_warning "端口 $port 進程未響應 SIGTERM，發送 SIGKILL"
                kill -9 "$pid" 2>/dev/null
            fi
            
            ((stopped_count++))
        fi
    done
    
    if [ $stopped_count -eq 0 ]; then
        print_success "沒有找到佔用目標端口的進程"
    else
        print_success "通過端口停止了 $stopped_count 個進程"
    fi
}

# 通過進程名稱停止進程
stop_processes_by_name() {
    print_step "檢查相關的進程名稱..."
    
    local stopped_count=0
    local process_patterns=("trading-api" "node.*vite" "go.*main.go")
    
    for pattern in "${process_patterns[@]}"; do
        pids=$(pgrep -f "$pattern" 2>/dev/null || true)
        
        if [ ! -z "$pids" ]; then
            for pid in $pids; do
                process_info=$(ps -p "$pid" -o args= 2>/dev/null | cut -c1-60)
                print_stop "停止進程: $process_info (PID: $pid)"
                kill "$pid" 2>/dev/null
                ((stopped_count++))
            done
        fi
    done
    
    # 等待進程退出
    if [ $stopped_count -gt 0 ]; then
        sleep 2
        
        # 檢查是否還有殘留進程
        for pattern in "${process_patterns[@]}"; do
            pids=$(pgrep -f "$pattern" 2>/dev/null || true)
            
            if [ ! -z "$pids" ]; then
                for pid in $pids; do
                    print_warning "強制殺死殘留進程 (PID: $pid)"
                    kill -9 "$pid" 2>/dev/null
                done
            fi
        done
        
        print_success "通過進程名稱停止了 $stopped_count 個進程"
    fi
}

# 清理文件和目錄
cleanup_files() {
    print_clean "清理臨時文件..."
    
    # 清理 PID 文件
    if [ -d "logs" ]; then
        rm -f logs/*.pid
        print_success "清理 PID 文件"
    fi
    
    # 清理編譯的二進制文件
    if [ -f "backend/trading-api/trading-api" ]; then
        rm -f backend/trading-api/trading-api
        print_success "清理編譯的二進制文件"
    fi
    
    # 可選：清理日誌文件 (註釋掉，保留用於調試)
    # if [ -d "logs" ] && [ "$(ls -A logs/)" ]; then
    #     read -p "是否清理日誌文件? (y/N): " -n 1 -r
    #     echo
    #     if [[ $REPLY =~ ^[Yy]$ ]]; then
    #         rm -f logs/*.log
    #         print_success "清理日誌文件"
    #     fi
    # fi
}

# 驗證停止結果
verify_stop() {
    print_step "驗證停止結果..."
    
    local ports=(30080 8081 8082 8083 5173)
    local all_stopped=true
    
    for port in "${ports[@]}"; do
        if lsof -i ":$port" &> /dev/null; then
            print_error "端口 $port 仍被佔用"
            all_stopped=false
        fi
    done
    
    if $all_stopped; then
        print_success "所有服務已成功停止"
    else
        print_warning "部分服務可能仍在運行"
        echo ""
        echo -e "${YELLOW}如果仍有問題，請手動檢查：${NC}"
        echo "lsof -i :30080"
        echo "ps aux | grep -E '(trading-api|vite|node)'"
    fi
}

# 顯示系統狀態
show_status() {
    echo ""
    echo -e "${CYAN}當前系統狀態:${NC}"
    
    local ports=(30080 8081 8082 8083 5173)
    local port_names=("Trading API" "Risk Engine" "Payment Gateway" "Audit Service" "Frontend")
    
    for i in "${!ports[@]}"; do
        port=${ports[$i]}
        name=${port_names[$i]}
        
        if lsof -i ":$port" &> /dev/null; then
            echo -e "  ${RED}●${NC} $name (端口: $port) - 運行中"
        else
            echo -e "  ${GREEN}○${NC} $name (端口: $port) - 已停止"
        fi
    done
}

# 主函數
main() {
    print_banner
    
    # 檢查是否在正確的目錄
    if [ ! -d "backend" ] && [ ! -d "frontend" ]; then
        print_error "請在 fintech-ebpf-demo 項目根目錄下運行此腳本"
        exit 1
    fi
    
    # 顯示當前狀態
    show_status
    
    echo ""
    read -p "確定要停止所有服務嗎? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "取消停止操作"
        exit 0
    fi
    
    echo ""
    print_step "開始停止金融微服務系統..."
    
    # 執行停止步驟
    stop_services_by_pid
    stop_processes_by_port
    stop_processes_by_name
    cleanup_files
    verify_stop
    
    echo ""
    echo -e "${GREEN}${STOP} 系統停止完成！${NC}"
    
    # 顯示最終狀態
    show_status
    
    echo ""
    echo -e "${CYAN}💡 如需重新啟動系統：${NC}"
    echo -e "  ${PURPLE}./quick_start.sh${NC} 或 ${PURPLE}./quick_start_fixed.sh${NC}"
}

# 執行主函數
main "$@" 