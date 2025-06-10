#!/bin/bash
# 金融微服務 eBPF 演示系統 - 自動化部署腳本
# 
# 此腳本提供完整的部署流程，包括映像構建、推送和 Helm 部署

set -e  # 遇到錯誤立即退出

# ==================== 配置變數 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CHART_PATH="${SCRIPT_DIR}/fintech-chart"

# 預設值
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"quay.io/s0926760809/fintech-demo"}
NAMESPACE=${NAMESPACE:-"fintech-demo"}
RELEASE_NAME=${RELEASE_NAME:-"fintech-demo"}
ENVIRONMENT=${ENVIRONMENT:-"development"}

# 自動生成版本標籤
if [ -z "$IMAGE_TAG" ]; then
    IMAGE_TAG="v$(date +%Y%m%d-%H%M%S)"
fi

# ==================== 函數定義 ====================

print_banner() {
    echo "============================================================"
    echo "  金融微服務 eBPF 演示系統 - 自動化部署"
    echo "============================================================"
    echo "Registry: ${DOCKER_REGISTRY}"
    echo "Image Tag: ${IMAGE_TAG}"
    echo "Namespace: ${NAMESPACE}"
    echo "Release: ${RELEASE_NAME}"
    echo "Environment: ${ENVIRONMENT}"
    echo "============================================================"
}

check_prerequisites() {
    echo "🔍 檢查前置需求..."
    
    # 檢查必要的命令
    for cmd in kubectl helm; do
        if ! command -v $cmd &> /dev/null; then
            echo "❌ 錯誤: $cmd 未安裝或不在 PATH 中"
            exit 1
        fi
    done
    
    # 檢查 Docker（僅在需要構建映像時）
    if [ "$SKIP_BUILD" = false ]; then
        if ! command -v docker &> /dev/null; then
            echo "⚠️  警告: Docker 命令未找到，但需要構建映像"
            echo "💡 提示: 使用 --skip-build 跳過映像構建"
            exit 1
        elif ! docker info &> /dev/null; then
            echo "⚠️  警告: Docker 未運行，但需要構建映像"
            echo "💡 提示: 啟動 Docker 或使用 --skip-build 跳過映像構建"
            exit 1
        fi
    else
        echo "⏭️  跳過 Docker 檢查（--skip-build 已啟用）"
    fi
    
    # 檢查 Kubernetes 連接
    if ! kubectl cluster-info &> /dev/null; then
        echo "❌ 錯誤: 無法連接到 Kubernetes 集群"
        exit 1
    fi
    
    echo "✅ 前置需求檢查通過"
}

build_images() {
    echo "🔨 構建和推送映像..."
    
    cd "${PROJECT_ROOT}"
    export DOCKER_REGISTRY IMAGE_TAG
    
    if [ -x "./k8s/ci/build-images.sh" ]; then
        ./k8s/ci/build-images.sh
    else
        echo "❌ 錯誤: 映像構建腳本未找到或無執行權限"
        exit 1
    fi
    
    echo "✅ 映像構建和推送完成"
}

prepare_namespace() {
    echo "🏗️  準備 Kubernetes Namespace..."
    
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        echo "創建 namespace: ${NAMESPACE}"
        kubectl create namespace "${NAMESPACE}"
    else
        echo "Namespace ${NAMESPACE} 已存在"
    fi
    
    echo "✅ Namespace 準備完成"
}

deploy_helm_chart() {
    echo "🚀 部署 Helm Chart..."
    
    cd "${SCRIPT_DIR}"
    
    # 選擇配置文件
    VALUES_FILE=""
    if [ "${ENVIRONMENT}" = "production" ]; then
        VALUES_FILE="--values ${CHART_PATH}/values-production.yaml"
        echo "使用生產環境配置"
    else
        echo "使用開發環境配置"
    fi
    
    # 檢查是否已安裝
    if helm status "${RELEASE_NAME}" -n "${NAMESPACE}" &> /dev/null; then
        echo "升級現有部署..."
        helm upgrade "${RELEASE_NAME}" "${CHART_PATH}" \
            ${VALUES_FILE} \
            --set global.imageTag="${IMAGE_TAG}" \
            --namespace "${NAMESPACE}" \
            --timeout 10m
    else
        echo "首次安裝..."
        helm install "${RELEASE_NAME}" "${CHART_PATH}" \
            ${VALUES_FILE} \
            --set global.imageTag="${IMAGE_TAG}" \
            --create-namespace \
            --namespace "${NAMESPACE}" \
            --timeout 10m
    fi
    
    echo "✅ Helm 部署完成"
}

verify_deployment() {
    echo "🔍 驗證部署狀態..."
    
    # 等待 Pod 準備就緒
    echo "等待 Pod 啟動..."
    kubectl wait --for=condition=ready pod \
        --all \
        --namespace="${NAMESPACE}" \
        --timeout=300s
    
    # 顯示部署狀態
    echo ""
    echo "=== Pod 狀態 ==="
    kubectl get pods -n "${NAMESPACE}" -o wide
    
    echo ""
    echo "=== Service 狀態 ==="
    kubectl get services -n "${NAMESPACE}"
    
    echo ""
    echo "=== Ingress 狀態 ==="
    kubectl get ingress -n "${NAMESPACE}" 2>/dev/null || echo "未配置 Ingress"
    
    echo ""
    echo "=== Helm Release 狀態 ==="
    helm status "${RELEASE_NAME}" -n "${NAMESPACE}"
    
    echo "✅ 部署驗證完成"
}

show_access_info() {
    echo "📋 訪問信息:"
    echo ""
    
    # 獲取前端服務信息
    FRONTEND_SERVICE=$(kubectl get service -n "${NAMESPACE}" -l app.kubernetes.io/component=frontend -o name 2>/dev/null | head -1)
    
    if [ -n "$FRONTEND_SERVICE" ]; then
        echo "🌐 前端服務訪問方法:"
        echo ""
        echo "1. Port Forward (推薦用於開發):"
        echo "   kubectl port-forward service/frontend 8080:80 -n ${NAMESPACE}"
        echo "   然後瀏覽器訪問: http://localhost:8080"
        echo ""
        
        # 檢查 Ingress
        INGRESS_HOST=$(kubectl get ingress -n "${NAMESPACE}" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null)
        if [ -n "$INGRESS_HOST" ]; then
            echo "2. Ingress 訪問:"
            echo "   添加到 /etc/hosts: 127.0.0.1 ${INGRESS_HOST}"
            echo "   瀏覽器訪問: http://${INGRESS_HOST}"
        fi
    fi
    
    echo ""
    echo "🔍 監控命令:"
    echo "   kubectl get pods -n ${NAMESPACE} --watch"
    echo "   kubectl logs -f deployment/${RELEASE_NAME}-trading-api -n ${NAMESPACE}"
    echo ""
    echo "🗂️  管理命令:"
    echo "   helm status ${RELEASE_NAME} -n ${NAMESPACE}"
    echo "   helm history ${RELEASE_NAME} -n ${NAMESPACE}"
    echo "   helm uninstall ${RELEASE_NAME} -n ${NAMESPACE}"
}

# ==================== 命令行參數處理 ====================

show_help() {
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -h, --help              顯示此幫助信息"
    echo "  -n, --namespace NAME    指定 Kubernetes namespace (預設: fintech-demo)"
    echo "  -r, --release NAME      指定 Helm release 名稱 (預設: fintech-demo)"
    echo "  -t, --tag TAG           指定映像標籤 (預設: 自動生成)"
    echo "  -e, --env ENV           指定環境 (development|production, 預設: development)"
    echo "  --registry REGISTRY     指定 Docker registry (預設: quay.io/s0926760809/fintech-demo)"
    echo "  --skip-build            跳過映像構建步驟"
    echo "  --build-only            僅構建映像，不部署"
    echo ""
    echo "環境變數:"
    echo "  DOCKER_REGISTRY         Docker registry 地址"
    echo "  IMAGE_TAG               映像標籤"
    echo "  NAMESPACE               Kubernetes namespace"
    echo ""
    echo "範例:"
    echo "  $0                                    # 使用預設設定部署"
    echo "  $0 -n my-namespace -t v1.2.3         # 指定 namespace 和標籤"
    echo "  $0 -e production                     # 生產環境部署"
    echo "  $0 --skip-build                      # 跳過映像構建"
    echo "  $0 --build-only                      # 僅構建映像"
}

# 解析命令行參數
SKIP_BUILD=false
BUILD_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --registry)
            DOCKER_REGISTRY="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        *)
            echo "未知選項: $1"
            echo "使用 -h 或 --help 查看幫助"
            exit 1
            ;;
    esac
done

# ==================== 主要執行流程 ====================

main() {
    print_banner
    
    check_prerequisites
    
    if [ "$SKIP_BUILD" = false ]; then
        build_images
    else
        echo "⏭️  跳過映像構建"
    fi
    
    if [ "$BUILD_ONLY" = true ]; then
        echo "🏁 僅構建映像完成"
        exit 0
    fi
    
    prepare_namespace
    
    deploy_helm_chart
    
    verify_deployment
    
    show_access_info
    
    echo ""
    echo "🎉 部署完成！"
    echo ""
}

# 執行主函數
main "$@" 