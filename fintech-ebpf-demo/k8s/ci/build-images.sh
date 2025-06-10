#!/bin/bash
# CI/CD 映像檔建置與推送腳本
#
# 這個腳本會自動建置所有微服務與前端的 Docker 映像檔，
# 並將它們推送到指定的容器倉庫。

set -e # 任何指令失敗則立即退出

# --- 組態變數 ---
# 從環境變數讀取倉庫位置與映像檔標籤
# 範例: DOCKER_REGISTRY="quay.io/s0926760809/fintech-demo"
#       IMAGE_TAG="v1.1" (如果未設定，將自動生成)
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"quay.io/s0926760809/fintech-demo"}

# 如果沒有設定 IMAGE_TAG，自動生成版本號
if [ -z "$IMAGE_TAG" ]; then
    # 使用當前時間戳作為版本標籤
    IMAGE_TAG="v$(date +%Y%m%d-%H%M%S)"
    echo "自動生成版本標籤: ${IMAGE_TAG}"
fi

BASE_DIR=$(pwd)

echo "############################################################"
echo "# 開始建置金融演示系統映像檔"
echo "# 倉庫: ${DOCKER_REGISTRY}"
echo "# 標籤: ${IMAGE_TAG}"
echo "# 工作目錄: ${BASE_DIR}"
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

# --- 前端應用 (先構建前端代碼) ---
build_and_push_frontend() {
    local service_name="frontend"
    local context_path="${BASE_DIR}/frontend"
    local image_full_name="${DOCKER_REGISTRY}/${service_name}:${IMAGE_TAG}"
    local api_base_url="/api" # Kubernetes 環境使用的 API 路徑

    echo ""
    echo "--- 正在處理服務: ${service_name} (帶有構建參數) ---"
    echo "映像檔全名: ${image_full_name}"
    echo "API 基礎 URL: ${api_base_url}"

    echo "步驟 1/2: 建置映像檔..."
    docker build \
        --build-arg VITE_API_BASE_URL=${api_base_url} \
        -t "${image_full_name}" \
        "${context_path}"

    echo "步驟 2/2: 推送映像檔..."
    docker push "${image_full_name}"

    echo "✅ 服務 ${service_name} 處理完成。"
}

# --- 後端微服務 ---
build_and_push "trading-api"     "${BASE_DIR}/backend/trading-api"
build_and_push "risk-engine"     "${BASE_DIR}/backend/risk-engine"
build_and_push "payment-gateway" "${BASE_DIR}/backend/payment-gateway"
build_and_push "audit-service"   "${BASE_DIR}/backend/audit-service"

# --- 前端應用 ---
build_and_push_frontend

echo ""
echo "############################################################"
echo "# 🎉 所有映像檔已成功建置並推送到 ${DOCKER_REGISTRY}"
echo "# 使用的標籤: ${IMAGE_TAG}"
echo "############################################################"

# 輸出部署命令供參考
echo ""
echo "要更新 Helm 部署，請執行以下命令:"
echo "# 首次安裝:"
echo "helm install fintech-demo ./k8s/helm/fintech-chart --set global.imageTag=${IMAGE_TAG} --create-namespace --namespace fintech-demo"
echo ""
echo "# 更新現有部署:"
echo "helm upgrade fintech-demo ./k8s/helm/fintech-chart --set global.imageTag=${IMAGE_TAG} --namespace fintech-demo"
echo ""
echo "# 檢查部署狀態:"
echo "kubectl get pods -n fintech-demo"
echo "kubectl get services -n fintech-demo" 