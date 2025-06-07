#!/bin/bash
# macOS (Apple Silicon) 上的 eBPF 實驗環境自動化安裝腳本
#
# 此腳本會自動執行以下任務:
# 1. 檢查並提示安裝必要工具 (Homebrew, Docker Desktop, k3d, kubectl, helm)。
# 2. 建立一個 k3d 叢集，並啟用與本地倉庫的映像檔共享。
# 3. 安裝 Cilium 與 Tetragon。
# 4. 使用 Helm Chart 部署金融演示應用。

set -e

# --- 顏色與圖標 ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
CHECK="✅"
ROCKET="🚀"
WARN="⚠️"

# --- 組態 ---
CLUSTER_NAME="ebpf-demo-cluster"
DOCKER_REGISTRY="k3d-my-registry:5000" # k3d 的本地映像檔倉庫
IMAGE_TAG="local-dev"

# 函數: 檢查指令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${WARN} 缺少指令: $1. 請依照提示進行安裝。"
        case "$1" in
            brew)
                echo "請先安裝 Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
                ;;
            docker)
                echo "請從官網安裝 Docker Desktop for Mac: https://www.docker.com/products/docker-desktop/"
                exit 1
                ;;
            k3d)
                echo "請執行: brew install k3d"
                exit 1
                ;;
            kubectl)
                echo "請執行: brew install kubectl"
                exit 1
                ;;
            helm)
                echo "請執行: brew install helm"
                exit 1
                ;;
        esac
    fi
}

echo -e "${BLUE}### 步驟 1/5: 檢查前置需求... ###${NC}"
check_command brew
check_command docker
check_command k3d
check_command kubectl
check_command helm
echo -e "${GREEN}${CHECK} 所有前置需求已滿足。${NC}"

echo -e "${BLUE}\n### 步驟 2/5: 建立 k3d 叢集與本地倉庫... ###${NC}"
# 檢查 k3d 本地倉庫是否存在，不存在則建立
if ! k3d registry get my-registry > /dev/null 2>&1; then
    echo "建立 k3d 本地倉庫..."
    k3d registry create my-registry --port 5000
else
    echo "k3d 本地倉庫 'my-registry' 已存在。"
fi

# 建立 k3d 叢集，並連接到本地倉庫
if ! k3d cluster get "${CLUSTER_NAME}" > /dev/null 2>&1; then
    echo "建立 k3d 叢集 '${CLUSTER_NAME}'..."
    k3d cluster create "${CLUSTER_NAME}" --registry-use k3d-my-registry:5000 --k3s-arg "--disable=traefik@server:0"
else
    echo "k3d 叢集 '${CLUSTER_NAME}' 已存在。"
fi
echo -e "${GREEN}${CHECK} k3d 叢集已準備就緒。${NC}"


echo -e "${BLUE}\n### 步驟 3/5: 建置應用映像檔並推送到本地倉庫... ###${NC}"
# 注意: 這裡我們直接呼叫 k8s/ci 下的打包腳本
CI_SCRIPT_PATH="../../../../k8s/ci/build-images.sh"

if [ ! -f "${CI_SCRIPT_PATH}" ]; then
    echo "錯誤: 找不到打包腳本: ${CI_SCRIPT_PATH}"
    exit 1
fi

DOCKER_REGISTRY=${DOCKER_REGISTRY} IMAGE_TAG=${IMAGE_TAG} bash "${CI_SCRIPT_PATH}"
echo -e "${GREEN}${CHECK} 所有應用映像檔已成功建置並推送到本地倉庫。${NC}"


echo -e "${BLUE}\n### 步驟 4/5: 安裝 Cilium 與 Tetragon... ###${NC}"
# 使用 Helm 安裝 Cilium
helm repo add cilium https://helm.cilium.io/ || true
helm repo update
helm install cilium cilium/cilium --version 1.15.5 \
   --namespace kube-system \
   --set tetragon.enabled=true
echo -e "${GREEN}${CHECK} Cilium 與 Tetragon 已成功安裝。${NC}"

echo -e "${BLUE}\n### 步驟 5/5: 部署金融演示應用... ###${NC}"
# 使用 Helm Chart 部署應用
helm install fintech-app ../../../../k8s/helm/fintech-chart \
    --set image.tag="${IMAGE_TAG}" \
    --set frontend.image.repository="${DOCKER_REGISTRY}/frontend" \
    --set tradingApi.image.repository="${DOCKER_REGISTRY}/trading-api" \
    --set riskEngine.image.repository="${DOCKER_REGISTRY}/risk-engine" \
    --set paymentGateway.image.repository="${DOCKER_REGISTRY}/payment-gateway" \
    --set auditService.image.repository="${DOCKER_REGISTRY}/audit-service" \
    --set ingress.enabled=true \
    --set ingress.hosts[0].host=fintech.local \
    --set-string ingress.hosts[0].paths[0].path="/"
echo -e "${GREEN}${CHECK} 金融演示應用已成功部署。${NC}"

echo -e "\n${ROCKET} ${GREEN}恭喜！eBPF 實驗環境已在你的 Mac 上準備就緒！${NC}\n"
echo "請執行以下步驟來存取應用："
echo "1. 將以下內容添加到你的 /etc/hosts 檔案中："
echo "   ${YELLOW}127.0.0.1 fintech.local${NC}"
echo "2. 在瀏覽器中開啟: ${YELLOW}http://fintech.local${NC}"
echo "3. 若要查看 Tetragon 事件, 請執行: ${YELLOW}kubectl -n kube-system exec -it ds/tetragon -- tetra getevents -o compact${NC}"
echo "4. 若要清理環境, 請執行: ${YELLOW}k3d cluster delete ${CLUSTER_NAME}${NC}" 