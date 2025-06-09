#!/bin/bash
# CI/CD 映像檔建置與推送腳本
#
# 這個腳本會自動建置所有微服務與前端的 Docker 映像檔，
# 並將它們推送到指定的容器倉庫。

set -e # 任何指令失敗則立即退出

# --- 組態變數 ---
# 從環境變數讀取倉庫位置與映像檔標籤
# 範例: DOCKER_REGISTRY="youracr.azurecr.io/fintech"
#       IMAGE_TAG="1.0.0"
DOCKER_REGISTRY=${DOCKER_REGISTRY:?"錯誤: 請設定 DOCKER_REGISTRY 環境變數。"}
IMAGE_TAG=${IMAGE_TAG:?"錯誤: 請設定 IMAGE_TAG 環境變數。"}

BASE_DIR=$(git rev-parse --show-toplevel)

echo "############################################################"
echo "# 開始建置金融演示系統映像檔"
echo "# 倉庫: ${DOCKER_REGISTRY}"
echo "# 標籤: ${IMAGE_TAG}"
echo "############################################################"

# 函數：建置並推送映像檔
# 參數1: 服務名稱 (例如: trading-api)
# 參數2: Dockerfile 路徑 (相對於專案根目錄)
build_and_push() {
    local service_name=$1
    local context_path=$2
    local image_full_name="${DOCKER_REGISTRY}/${service_name}:${IMAGE_TAG}"

    echo ""
    echo "--- 正在處理服務: ${service_name} ---"
    echo "映像檔全名: ${image_full_name}"

    echo "步驟 1/2: 建置映像檔..."
    docker build -t "${image_full_name}" "${context_path}"

    echo "步驟 2/2: 推送映像檔..."
    docker push "${image_full_name}"

    echo "✅ 服務 ${service_name} 處理完成。"
}

# --- 後端微服務 ---
build_and_push "trading-api"     "${BASE_DIR}/fintech-ebpf-demo/backend/trading-api"
build_and_push "risk-engine"     "${BASE_DIR}/fintech-ebpf-demo/backend/risk-engine"
build_and_push "payment-gateway" "${BASE_DIR}/fintech-ebpf-demo/backend/payment-gateway"
build_and_push "audit-service"   "${BASE_DIR}/fintech-ebpf-demo/backend/audit-service"

# --- 前端應用 ---
build_and_push "frontend"        "${BASE_DIR}/fintech-ebpf-demo/frontend"


echo ""
echo "############################################################"
echo "# 🎉 所有映像檔已成功建置並推送到 ${DOCKER_REGISTRY}"
echo "############################################################" 