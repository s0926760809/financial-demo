#!/bin/bash

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
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
    
    # 檢查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安裝。請先安裝 Docker。"
        exit 1
    fi
    
    # 檢查kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl 未安裝。請先安裝 kubectl。"
        exit 1
    fi
    
    # 檢查Kind
    if ! command -v kind &> /dev/null; then
        log_warning "Kind 未安裝。正在安裝..."
        # 根據操作系統安裝Kind
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
            chmod +x ./kind
            sudo mv ./kind /usr/local/bin/kind
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-darwin-amd64
            chmod +x ./kind
            sudo mv ./kind /usr/local/bin/kind
        fi
    fi
    
    # 檢查Helm
    if ! command -v helm &> /dev/null; then
        log_warning "Helm 未安裝。正在安裝..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi
    
    log_success "前置要求檢查完成"
}

# 主部署函數
main() {
    log_info "🚀 開始部署金融微服務 eBPF 演示環境"
    echo "=============================================="
    
    # 檢查前置要求
    check_prerequisites
    
    # 1. 創建Kind集群
    log_info "📦 創建 Kind 集群..."
    ./scripts/setup-kind-cluster.sh
    
    # 2. 等待集群就緒
    log_info "⏳ 等待集群就緒..."
    sleep 30
    
    # 3. 安裝 Cilium CNI
    log_info "🔧 安裝 Cilium CNI..."
    ./scripts/install-cilium.sh
    
    # 4. 安裝 Tetragon
    log_info "🛡️  安裝 Tetragon 安全監控..."
    ./scripts/install-tetragon.sh
    
    # 5. 部署數據庫服務
    log_info "🗄️  部署數據庫服務..."
    kubectl apply -f manifests/namespace.yaml
    kubectl apply -f manifests/database/
    
    # 等待數據庫就緒
    log_info "⏳ 等待數據庫服務就緒..."
    kubectl wait --for=condition=ready pod -l app=postgresql -n fintech-demo --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n fintech-demo --timeout=300s
    
    # 6. 部署微服務
    log_info "🏭 部署金融微服務..."
    kubectl apply -f manifests/microservices/
    
    # 7. 部署監控服務
    log_info "📊 部署監控服務..."
    kubectl apply -f manifests/monitoring/
    
    # 8. 等待所有服務就緒
    log_info "⏳ 等待所有服務就緒..."
    sleep 60
    
    # 9. 驗證部署
    log_info "✅ 驗證部署狀態..."
    ./scripts/verify-deployment.sh
    
    # 10. 顯示訪問信息
    show_access_info
    
    log_success "🎉 部署完成！"
    echo "=============================================="
}

# 顯示訪問信息
show_access_info() {
    echo ""
    log_info "📋 服務訪問信息："
    echo "=============================================="
    
    # 獲取NodePort端口
    TRADING_PORT=$(kubectl get svc trading-api-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}')
    RISK_PORT=$(kubectl get svc risk-engine-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}')
    PAYMENT_PORT=$(kubectl get svc payment-gateway-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}')
    AUDIT_PORT=$(kubectl get svc audit-service-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}')
    GRAFANA_PORT=$(kubectl get svc grafana-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}')
    PROMETHEUS_PORT=$(kubectl get svc prometheus-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}')
    
    echo "🏪 微服務端點："
    echo "  • Trading API:     http://localhost:${TRADING_PORT}"
    echo "  • Risk Engine:     http://localhost:${RISK_PORT}"
    echo "  • Payment Gateway: http://localhost:${PAYMENT_PORT}"
    echo "  • Audit Service:   http://localhost:${AUDIT_PORT}"
    echo ""
    echo "📊 監控服務："
    echo "  • Grafana:    http://localhost:${GRAFANA_PORT} (admin/admin123)"
    echo "  • Prometheus: http://localhost:${PROMETHEUS_PORT}"
    echo ""
    echo "🔍 eBPF 監控："
    echo "  • 查看 Tetragon 事件:"
    echo "    kubectl logs -f -n kube-system -l app.kubernetes.io/name=tetragon"
    echo ""
    echo "🧪 測試命令："
    echo "  • 健康檢查: curl http://localhost:${TRADING_PORT}/health"
    echo "  • 安全測試: ./scripts/security-demo.sh"
    echo ""
    echo "=============================================="
}

# 清理函數
cleanup() {
    if [[ "${1}" == "cleanup" ]]; then
        log_warning "🧹 清理環境..."
        kind delete cluster --name fintech-ebpf-demo
        log_success "環境清理完成"
        exit 0
    fi
}

# 處理命令行參數
if [[ "${1}" == "cleanup" ]]; then
    cleanup cleanup
elif [[ "${1}" == "help" ]] || [[ "${1}" == "-h" ]]; then
    echo "金融微服務 eBPF 演示部署腳本"
    echo ""
    echo "用法："
    echo "  ./deploy.sh          - 部署完整環境"
    echo "  ./deploy.sh cleanup  - 清理環境"
    echo "  ./deploy.sh help     - 顯示幫助"
    echo ""
    exit 0
else
    main
fi 