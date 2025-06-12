#!/bin/bash

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 檢查前置要求
check_prerequisites() {
    log_info "檢查前置要求..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安裝。請先安裝 Node.js 18+。"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安裝。請先安裝 npm。"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安裝。請先安裝 Docker。"
        exit 1
    fi
    
    log_success "前置要求檢查完成"
}

# 安裝依賴
install_dependencies() {
    log_info "安裝依賴包..."
    npm ci
    log_success "依賴安裝完成"
}

# 運行測試
run_tests() {
    log_info "運行測試..."
    # npm run test
    log_warning "測試暫時跳過"
}

# 類型檢查
type_check() {
    log_info "執行TypeScript類型檢查..."
    npm run type-check
    log_success "類型檢查通過"
}

# 構建應用
build_app() {
    log_info "構建React應用..."
    npm run build
    log_success "應用構建完成"
}

# 構建Docker鏡像
build_docker() {
    log_info "構建Docker鏡像..."
    
    # 構建前端鏡像
    docker build -t fintech-demo/frontend:latest .
    
    # 標記版本
    docker tag fintech-demo/frontend:latest fintech-demo/frontend:3.0.0
    
    log_success "Docker鏡像構建完成"
}

# 推送到Kind集群
load_to_kind() {
    log_info "加載鏡像到Kind集群..."
    
    # 檢查Kind集群是否存在
    if kind get clusters | grep -q "fintech-ebpf-demo"; then
        kind load docker-image fintech-demo/frontend:latest --name fintech-ebpf-demo
        log_success "鏡像已加載到Kind集群"
    else
        log_warning "Kind集群 'fintech-ebpf-demo' 不存在，跳過鏡像加載"
    fi
}

# 部署到Kubernetes
deploy_to_k8s() {
    log_info "部署到Kubernetes..."
    
    if kubectl get namespace fintech-demo &> /dev/null; then
        kubectl apply -f ../k8s/manifests/frontend/
        log_success "前端服務已部署到Kubernetes"
        
        # 等待部署完成
        log_info "等待部署就緒..."
        kubectl rollout status deployment/frontend -n fintech-demo --timeout=300s
        
        # 顯示服務信息
        FRONTEND_PORT=$(kubectl get svc frontend-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}')
        log_success "前端服務可通過 http://localhost:${FRONTEND_PORT} 訪問"
    else
        log_error "命名空間 'fintech-demo' 不存在，請先部署後端服務"
        exit 1
    fi
}

# 清理函數
cleanup() {
    log_info "清理構建產物..."
    rm -rf dist/
    rm -rf node_modules/.cache/
    log_success "清理完成"
}

# 顯示幫助信息
show_help() {
    echo "金融微服務前端構建腳本"
    echo ""
    echo "用法:"
    echo "  ./build.sh [選項]"
    echo ""
    echo "選項:"
    echo "  dev           - 啟動開發服務器"
    echo "  build         - 構建應用（不含Docker）"
    echo "  docker        - 構建Docker鏡像"
    echo "  deploy        - 完整構建並部署"
    echo "  clean         - 清理構建產物"
    echo "  help          - 顯示此幫助信息"
    echo ""
}

# 主函數
main() {
    case "${1:-deploy}" in
        "dev")
            log_info "🚀 啟動開發服務器..."
            check_prerequisites
            install_dependencies
            npm run dev
            ;;
        "build")
            log_info "🔨 構建前端應用..."
            check_prerequisites
            install_dependencies
            type_check
            build_app
            log_success "🎉 前端構建完成！"
            ;;
        "docker")
            log_info "🐳 構建Docker鏡像..."
            check_prerequisites
            install_dependencies
            type_check
            build_app
            build_docker
            load_to_kind
            log_success "🎉 Docker鏡像構建完成！"
            ;;
        "deploy")
            log_info "🚀 完整構建並部署..."
            check_prerequisites
            install_dependencies
            type_check
            build_app
            build_docker
            load_to_kind
            deploy_to_k8s
            log_success "🎉 前端部署完成！"
            ;;
        "clean")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知選項: $1"
            show_help
            exit 1
            ;;
    esac
}

# 執行主函數
main "$@" 