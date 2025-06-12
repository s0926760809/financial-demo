# CI 自動化映像檔建置

這個目錄包含用於自動化建置與推送專案所有 Docker 映像檔的腳本。

## 腳本

- `build-images.sh`: 核心腳本，用於建置前端與所有後端微服務的映像檔，並將其推送到指定的容器倉庫。

## 前置需求

在執行此腳本之前，請確保你已安裝並設定好以下工具：

1.  **Docker**: 用於建置與推送映像檔。
2.  **Git**: 腳本會使用 `git` 來自動定位專案根目錄。
3.  **容器倉庫權限**: 確保你的 Docker 已登入到目標容器倉庫（例如，透過 `docker login youracr.azurecr.io`）。

## 使用方法

執行此腳本需要提供兩個環境變數：

- `DOCKER_REGISTRY`: 你的容器倉庫位址。如果是 Azure Container Registry (ACR)，格式通常是 `youracrname.azurecr.io/repository`。
- `IMAGE_TAG`: 你要為這次建置的映像檔設定的標籤（版本號），例如 `1.0.1` 或 `latest`。在 CI/CD 環境中，這通常是 Build ID 或 Git Commit SHA。

### 本地執行範例

```bash
# 賦予腳本執行權限
chmod +x build-images.sh

# 設定環境變數並執行腳本
export DOCKER_REGISTRY="yourregistry.azurecr.io/fintech-demo"
export IMAGE_TAG="build-$(date +%Y%m%d)-${GIT_COMMIT_SHA_SHORT:-local}"

./build-images.sh
```

### CI/CD 環境整合

在 CI/CD 平台（如 Azure DevOps, GitHub Actions）中，你可以直接在 Pipeline 的腳本步驟中設定這些環境變數，並執行此腳本，以實現全自動化的映像檔打包。 