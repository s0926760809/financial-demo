#!/bin/bash

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}[STAGE]${NC} $1"
}

# 顯示歡迎信息
show_welcome() {
    clear
    echo ""
    echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║              金融微服務 eBPF 安全演示系統                   ║${NC}"
    echo -e "${PURPLE}║                 完整部署腳本 v3.0.0                       ║${NC}"
    echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  安全警告: 此系統包含故意設計的安全漏洞，僅用於演示${NC}"
    echo ""
    echo "本腳本將部署完整的演示環境，包括："
    echo "• Kubernetes集群 (Kind)"
    echo "• Cilium CNI + eBPF網絡"
    echo "• Tetragon安全監控"
    echo "• Go微服務後端"
    echo "• React前端界面"
    echo ""
    read -p "是否繼續部署？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "部署已取消"
        exit 0
    fi
}

# 檢查前置要求
check_prerequisites() {
    log_header "檢查系統前置要求"
    
    local missing_tools=()
    
    # 檢查必需工具
    tools=("docker" "kubectl" "kind" "helm" "node" "npm")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必需工具: ${missing_tools[*]}"
        echo ""
        echo "請安裝缺少的工具後重新運行腳本"
        echo "參考文檔: https://github.com/your-org/fintech-ebpf-demo#prerequisites"
        exit 1
    fi
    
    # 檢查Docker是否運行
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker未運行，請啟動Docker"
        exit 1
    fi
    
    # 檢查系統資源
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux資源檢查
        TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
        if [ "$TOTAL_MEM" -lt 8 ]; then
            log_warning "系統內存少於8GB，可能影響運行性能"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS資源檢查
        TOTAL_MEM=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
        if [ "$TOTAL_MEM" -lt 8 ]; then
            log_warning "系統內存少於8GB，可能影響運行性能"
        fi
    fi
    
    log_success "前置要求檢查完成"
}

# 階段1: 已完成的Go微服務
stage1_microservices() {
    log_header "階段1: Go微服務後端 (已完成)"
    log_info "Go微服務已在之前階段完成開發"
    log_info "包含故意設計的安全漏洞用於eBPF監控演示"
    log_success "階段1完成"
}

# 階段2: Kubernetes + eBPF
stage2_kubernetes() {
    log_header "階段2: 部署Kubernetes + Cilium + Tetragon"
    
    cd k8s
    
    log_info "執行Kubernetes部署..."
    ./deploy.sh
    
    log_info "等待所有服務就緒..."
    sleep 30
    
    log_info "驗證部署狀態..."
    ./scripts/verify-deployment.sh
    
    cd ..
    log_success "階段2完成"
}

# 階段3: React前端
stage3_frontend() {
    log_header "階段3: 構建和部署React前端"
    
    cd frontend
    
    log_info "構建前端應用..."
    ./build.sh deploy
    
    cd ..
    log_success "階段3完成"
}

# 階段4: 演示腳本 (未來)
stage4_demo_scripts() {
    log_header "階段4: 攻擊場景腳本 (規劃中)"
    log_warning "此階段尚在開發中，將包含自動化攻擊場景腳本"
    log_info "當前可手動觸發安全測試事件"
}

# 階段5: 完整演示環境 (未來)
stage5_complete_demo() {
    log_header "階段5: 完整演示環境整合 (規劃中)"  
    log_warning "此階段將整合所有組件為完整的演示環境"
    log_info "包含自動化演示流程和說明文檔"
}

# 顯示部署結果
show_deployment_results() {
    log_header "🎉 部署完成！"
    
    echo ""
    echo "==============================================="
    echo "         金融微服務 eBPF 演示系統"
    echo "==============================================="
    echo ""
    
    # 獲取服務端點
    FRONTEND_PORT=$(kubectl get svc frontend-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "30300")
    TRADING_PORT=$(kubectl get svc trading-api-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "30080")
    RISK_PORT=$(kubectl get svc risk-engine-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "30081")
    
    echo "🌐 服務端點:"
    echo "  • 前端界面:        http://localhost:${FRONTEND_PORT}"
    echo "  • Trading API:     http://localhost:${TRADING_PORT}"
    echo "  • Risk Engine:     http://localhost:${RISK_PORT}"
    echo "  • 調試信息:        http://localhost:${FRONTEND_PORT}/debug"
    echo ""
    
    echo "📊 監控和觀測:"
    echo "  • eBPF事件監控:    kubectl logs -f -n kube-system -l app.kubernetes.io/name=tetragon"
    echo "  • Cilium狀態:      cilium status"
    echo "  • 集群狀態:        kubectl get pods -n fintech-demo"
    echo ""
    
    echo "🧪 安全測試示例:"
    echo "  • 文件訪問測試:    curl -X POST http://localhost:${TRADING_PORT}/debug/execute -d '{\"command\":\"cat\",\"args\":[\"/etc/passwd\"]}' -H 'Content-Type: application/json'"
    echo "  • 網絡連接測試:    curl -X POST http://localhost:${RISK_PORT}/debug/execute -d '{\"command\":\"nslookup\",\"args\":[\"malicious-domain.com\"]}' -H 'Content-Type: application/json'"
    echo ""
    
    echo "📚 更多信息:"
    echo "  • 項目文檔:        ./README.md"
    echo "  • 架構說明:        ./docs/architecture.md"
    echo "  • 安全功能:        ./docs/security.md"
    echo ""
    
    echo "⚠️  注意: 此系統包含故意的安全漏洞，僅用於eBPF監控演示"
    echo "==============================================="
}

# 清理函數
cleanup_deployment() {
    log_warning "清理演示環境..."
    
    # 清理Kubernetes資源
    kubectl delete namespace fintech-demo --ignore-not-found=true
    
    # 清理Kind集群
    kind delete cluster --name fintech-ebpf-demo
    
    # 清理Docker鏡像
    docker rmi fintech-demo/frontend:latest 2>/dev/null || true
    docker rmi fintech-demo/trading-api:latest 2>/dev/null || true
    docker rmi fintech-demo/risk-engine:latest 2>/dev/null || true
    docker rmi fintech-demo/payment-gateway:latest 2>/dev/null || true
    docker rmi fintech-demo/audit-service:latest 2>/dev/null || true
    
    log_success "環境清理完成"
}

# 主函數
main() {
    case "${1:-deploy}" in
        "deploy")
            show_welcome
            check_prerequisites
            stage1_microservices
            stage2_kubernetes
            stage3_frontend
            stage4_demo_scripts
            stage5_complete_demo
            show_deployment_results
            ;;
        "cleanup")
            cleanup_deployment
            ;;
        "help"|"-h"|"--help")
            echo "金融微服務 eBPF 安全演示系統 - 部署腳本"
            echo ""
            echo "用法:"
            echo "  ./deploy-all.sh [命令]"
            echo ""
            echo "命令:"
            echo "  deploy    - 部署完整演示環境 (默認)"
            echo "  cleanup   - 清理演示環境"
            echo "  help      - 顯示此幫助信息"
            echo ""
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 './deploy-all.sh help' 查看可用命令"
            exit 1
            ;;
    esac
}

# 捕獲中斷信號
trap 'echo -e "\n${RED}部署被中斷${NC}"; exit 1' INT TERM

# 執行主函數
main "$@" 