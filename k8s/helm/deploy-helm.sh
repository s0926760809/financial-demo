#!/bin/bash

# 金融微服務 eBPF 系統 - Helm 部署腳本
# 版本: 1.0.0
# 用途: 自動化 Helm 部署流程

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 圖標
CHECK="✅"
CROSS="❌"
ROCKET="🚀"
GEAR="⚙️"
KUBE="☸️"

# 配置
NAMESPACE="fintech-demo"
RELEASE_NAME="fintech-demo"
CHART_PATH="fintech-chart"
REGISTRY_SECRET="quay-secret"

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  金融微服務 eBPF 系統                        ║"
    echo "║                   Helm 自動部署工具                          ║"
    echo "║                    版本: 1.0.0                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_prerequisites() {
    log "${GEAR} 檢查前置需求..."
    
    # 檢查 kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl 未安裝"
        exit 1
    fi
    
    # 檢查 helm
    if ! command -v helm &> /dev/null; then
        error "helm 未安裝"
        exit 1
    fi
    
    # 檢查 Kubernetes 連接
    if ! kubectl cluster-info &> /dev/null; then
        error "無法連接到 Kubernetes 叢集"
        exit 1
    fi
    
    success "前置需求檢查通過"
}

setup_namespace() {
    log "${KUBE} 設定命名空間..."
    
    # 建立命名空間 (如果不存在)
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        kubectl create namespace "$NAMESPACE"
        success "命名空間 $NAMESPACE 已建立"
    else
        log "命名空間 $NAMESPACE 已存在"
    fi
    
    # 設定當前命名空間
    kubectl config set-context --current --namespace="$NAMESPACE"
    success "當前命名空間設為 $NAMESPACE"
}

setup_registry_secret() {
    log "${GEAR} 設定鏡像倉庫密鑰..."
    
    # 檢查密鑰是否已存在
    if kubectl get secret "$REGISTRY_SECRET" -n "$NAMESPACE" &> /dev/null; then
        warning "密鑰 $REGISTRY_SECRET 已存在，跳過建立"
        return
    fi
    
    # 建立 Quay.io 拉取密鑰
    kubectl create secret docker-registry "$REGISTRY_SECRET" \
        --docker-server=quay.io \
        --docker-username=s0926760809@gmail.com \
        --docker-password=Haste0809 \
        --docker-email=s0926760809@gmail.com \
        --namespace="$NAMESPACE"
    
    success "鏡像倉庫密鑰已建立"
}

setup_helm_repos() {
    log "${GEAR} 設定 Helm 倉庫..."
    
    # 新增 Bitnami 倉庫
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update
    
    success "Helm 倉庫設定完成"
}

update_dependencies() {
    log "${GEAR} 更新 Helm 依賴項..."
    
    cd "$CHART_PATH"
    helm dependency update
    cd ..
    
    success "依賴項更新完成"
}

deploy_helm_chart() {
    log "${ROCKET} 開始 Helm 部署..."
    
    cd "$CHART_PATH"
    
    # 執行 Helm 部署
    helm upgrade --install "$RELEASE_NAME" . \
        --namespace "$NAMESPACE" \
        --create-namespace \
        --wait \
        --timeout=600s \
        --debug
    
    cd ..
    success "Helm 部署完成"
}

verify_deployment() {
    log "${GEAR} 驗證部署狀態..."
    
    # 等待 Pod 就緒
    log "等待 Pod 啟動..."
    kubectl wait --for=condition=ready pod --all -n "$NAMESPACE" --timeout=300s
    
    # 檢查部署狀態
    echo ""
    log "部署狀態摘要:"
    kubectl get all -n "$NAMESPACE"
    
    echo ""
    log "Helm 發布狀態:"
    helm status "$RELEASE_NAME" -n "$NAMESPACE"
    
    success "部署驗證完成"
}

show_access_info() {
    log "${GEAR} 取得存取資訊..."
    
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                        存取資訊                              ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    
    # 取得 Ingress 資訊
    if kubectl get ingress -n "$NAMESPACE" &> /dev/null; then
        echo ""
        echo "🌐 Ingress 資訊:"
        kubectl get ingress -n "$NAMESPACE"
    fi
    
    # 顯示 port-forward 指令
    echo ""
    echo "🔗 本地存取指令 (使用 port-forward):"
    echo "  前端應用:"
    echo "    kubectl port-forward service/frontend 8080:80 -n $NAMESPACE"
    echo "    然後訪問: http://localhost:8080"
    echo ""
    echo "  Trading API:"
    echo "    kubectl port-forward service/trading-api-service 8081:8080 -n $NAMESPACE"
    echo "    健康檢查: curl http://localhost:8081/health"
    echo ""
    echo "  Tetragon 監控:"
    echo "    kubectl port-forward service/fintech-demo-fintech-chart-tetragon-stream 8090:8090 -n $NAMESPACE"
    echo "    事件流: curl http://localhost:8090/api/v1/tetragon/events"
}

cleanup() {
    log "清理部署..."
    helm uninstall "$RELEASE_NAME" -n "$NAMESPACE"
    kubectl delete namespace "$NAMESPACE"
    success "清理完成"
}

rollback() {
    local revision=${1:-1}
    log "回滾到版本 $revision..."
    helm rollback "$RELEASE_NAME" "$revision" -n "$NAMESPACE"
    success "回滾完成"
}

show_help() {
    echo "使用方法: $0 [COMMAND]"
    echo ""
    echo "指令:"
    echo "  deploy     執行完整部署 (預設)"
    echo "  upgrade    僅執行 Helm 升級"
    echo "  rollback   回滾到指定版本"
    echo "  cleanup    清理所有資源"
    echo "  status     顯示部署狀態"
    echo "  logs       顯示服務日誌"
    echo ""
    echo "範例:"
    echo "  $0 deploy              # 完整部署"
    echo "  $0 upgrade             # 升級現有部署"
    echo "  $0 rollback 2          # 回滾到版本 2"
    echo "  $0 cleanup             # 清理所有資源"
}

main() {
    local command=${1:-deploy}
    
    case $command in
        "deploy")
            print_banner
            check_prerequisites
            setup_namespace
            setup_registry_secret
            setup_helm_repos
            update_dependencies
            deploy_helm_chart
            verify_deployment
            show_access_info
            ;;
        "upgrade")
            print_banner
            check_prerequisites
            update_dependencies
            deploy_helm_chart
            verify_deployment
            ;;
        "rollback")
            print_banner
            rollback "$2"
            ;;
        "cleanup")
            print_banner
            cleanup
            ;;
        "status")
            kubectl get all -n "$NAMESPACE"
            helm status "$RELEASE_NAME" -n "$NAMESPACE"
            ;;
        "logs")
            local service=${2:-frontend}
            kubectl logs -f deployment/"$service" -n "$NAMESPACE"
            ;;
        "-h"|"--help")
            show_help
            ;;
        *)
            error "未知指令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 檢查是否在正確的目錄
if [ ! -d "$CHART_PATH" ]; then
    error "請在 k8s/helm 目錄執行此腳本"
    exit 1
fi

# 執行主函數
main "$@"