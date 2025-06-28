#!/bin/bash

# 金融微服務 eBPF 系統 - 鏡像建構和推送腳本
# 版本: 1.0.0
# 用途: 建構所有服務的 Docker 鏡像並推送到 quay.io

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 圖標
CHECK="✅"
CROSS="❌"
ROCKET="🚀"
PACKAGE="📦"

# 配置
REGISTRY="quay.io"
USERNAME="s0926760809"
TAG="${1:-latest}"

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  金融微服務 eBPF 系統                        ║"
    echo "║                Docker 鏡像建構和推送工具                     ║"
    echo "║                    版本: 1.0.0                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_docker_login() {
    log "檢查 Docker 登入狀態..."
    if ! docker info | grep -q "Username"; then
        error "請先登入 Docker registry: docker login quay.io"
        exit 1
    fi
    success "Docker 已登入"
}

build_and_push() {
    local service_name=$1
    local dockerfile_path=$2
    local image_name="${REGISTRY}/${USERNAME}/fintech-${service_name}:${TAG}"
    
    log "${PACKAGE} 建構 ${service_name} 鏡像..."
    
    if [ ! -d "$dockerfile_path" ]; then
        error "目錄 $dockerfile_path 不存在"
        return 1
    fi
    
    cd "$dockerfile_path"
    
    # 建構鏡像
    if docker build -t "$image_name" .; then
        success "${service_name} 鏡像建構成功"
    else
        error "${service_name} 鏡像建構失敗"
        cd - > /dev/null
        return 1
    fi
    
    # 推送鏡像
    log "推送 ${service_name} 鏡像到 ${REGISTRY}..."
    if docker push "$image_name"; then
        success "${service_name} 鏡像推送成功"
    else
        error "${service_name} 鏡像推送失敗"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
}

main() {
    print_banner
    
    log "${ROCKET} 開始建構並推送所有鏡像到 ${REGISTRY}..."
    log "使用標籤: ${TAG}"
    
    # 檢查 Docker 登入狀態
    check_docker_login
    
    # 建構前端鏡像
    build_and_push "frontend" "frontend"
    
    # 建構後端微服務鏡像
    local services=("trading-api" "risk-engine" "payment-gateway" "audit-service" "tetragon-stream")
    
    for service in "${services[@]}"; do
        build_and_push "$service" "backend/$service"
    done
    
    success "所有鏡像建構並推送完成！"
    
    echo ""
    log "建構的鏡像清單:"
    echo "  - ${REGISTRY}/${USERNAME}/fintech-frontend:${TAG}"
    for service in "${services[@]}"; do
        echo "  - ${REGISTRY}/${USERNAME}/fintech-${service}:${TAG}"
    done
    
    echo ""
    log "下一步: 執行 Helm 部署"
    echo "  cd k8s/helm/fintech-chart"
    echo "  helm upgrade --install fintech-demo . --namespace fintech-demo --create-namespace"
}

# 幫助資訊
show_help() {
    echo "使用方法: $0 [TAG]"
    echo ""
    echo "參數:"
    echo "  TAG    鏡像標籤 (預設: latest)"
    echo ""
    echo "範例:"
    echo "  $0           # 使用 latest 標籤"
    echo "  $0 v2.0.0    # 使用 v2.0.0 標籤"
    echo ""
    echo "環境需求:"
    echo "  - Docker 已安裝並登入 quay.io"
    echo "  - 當前目錄為專案根目錄"
}

# 檢查參數
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 檢查是否在正確的目錄
if [ ! -f "frontend/package.json" ] || [ ! -d "backend" ]; then
    error "請在專案根目錄執行此腳本"
    exit 1
fi

# 執行主函數
main "$@"