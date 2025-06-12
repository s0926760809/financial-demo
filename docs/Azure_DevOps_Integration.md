# Azure DevOps 整合指南

本指南詳細說明瞭如何將此專案整合到 Azure DevOps Pipelines 中，以實現 CI (持續整合) 和 CD (持續部署) 的全自動化流程。

## 1. 前置需求

在開始之前，請確保你已在 Azure DevOps 和 Azure 中完成以下設定：

1.  **Azure DevOps 專案**: 建立一個新的 Azure DevOps 專案。
2.  **Azure Container Registry (ACR)**: 建立一個 ACR 用於存放 Docker 映像檔。
3.  **Azure Kubernetes Service (AKS)**: 建立一個 AKS 叢集用於部署應用。
4.  **服務連接 (Service Connections)**:
    -   在 Azure DevOps 專案設定中，建立一個指向你的 **ACR** 的服務連接 (類型選擇 Docker Registry)。
    -   建立一個指向你的 **AKS** 叢集的服務連接 (類型選擇 Kubernetes)。

## 2. CI Pipeline - 自動建置與推送映像檔

我們將建立一個 YAML Pipeline，它會在程式碼推送到 `main` 分支時自動觸發，執行 `k8s/ci/build-images.sh` 腳本來建置並推送所有映像檔。

**在你的專案根目錄下，建立 `azure-pipelines.yml` 檔案：**

```yaml
# azure-pipelines.yml
trigger:
- main

pool:
  vmImage: 'ubuntu-latest'

variables:
  # 你的 ACR 登入伺服器與倉庫名稱
  dockerRegistryServiceConnection: 'your-acr-service-connection-name'
  imageRepository: 'your-acr-name.azurecr.io/fintech-demo'
  tag: '$(Build.BuildId)' # 使用 Azure DevOps 的 BuildId 作為映像檔標籤

stages:
- stage: Build
  displayName: 'Build and Push Images'
  jobs:
  - job: Build
    displayName: 'Build'
    steps:
    # 登入到 ACR
    - task: Docker@2
      displayName: Login to ACR
      inputs:
        command: login
        containerRegistry: $(dockerRegistryServiceConnection)

    # 執行打包腳本
    - task: Bash@3
      displayName: 'Run Build & Push Script'
      inputs:
        filePath: 'fintech-ebpf-demo/k8s/ci/build-images.sh'
        # 將 Pipeline 變數傳遞給腳本使用的環境變數
        env:
          DOCKER_REGISTRY: $(imageRepository)
          IMAGE_TAG: $(tag)

    # 發佈 K8s manifests 作為 Pipeline Artifact
    - task: PublishBuildArtifacts@1
      displayName: 'Publish Kubernetes manifests'
      inputs:
        PathtoPublish: '$(Build.SourcesDirectory)/fintech-ebpf-demo/k8s'
        ArtifactName: 'manifests'
```

## 3. CD Pipeline - 自動化部署

部署流程建議使用 Azure DevOps 的 **Releases** 功能，它可以提供更好的環境隔離、審批流程與可視化。

### 3.1. 建立 Release Pipeline

1.  在 Azure DevOps 左側導覽列選擇 **Pipelines -> Releases**。
2.  建立一個新的 Release Pipeline，選擇 "Empty job" 範本。
3.  **Artifact**:
    -   點擊 "Add an artifact"，選擇 **Build** 類型。
    -   **Source (build pipeline)**: 選擇你剛才建立的 CI Pipeline (`azure-pipelines.yml`)。
    -   點擊 "Add"。
4.  啟用 **Continuous deployment trigger**，這樣每次 CI Build 成功後都會自動觸發部署。

### 3.2. 建立部署階段 (Stage)

你可以為不同環境（如 Staging, Production）建立不同的 Stage。

**以部署到 Staging 環境為例：**

1.  點擊 Stage，將其命名為 `Deploy to Staging`。
2.  點擊 "1 job, 0 task" 進入任務編輯器。

### 3.3. 在 Stage 中加入部署任務

你可以在此處選擇使用 Helm 或 Kustomize 進行部署。

#### 部署方式 A: 使用 Helm

1.  在 Agent Job 中加入 **Helm Deploy** (`HelmDeploy@0`) 任務。
2.  **設定任務**:
    -   **Connection Type**: Kubernetes Service Connection
    -   **Kubernetes Service Connection**: 選擇你先前建立的 AKS 服務連接。
    -   **Namespace**: `fintech-demo` (或你的目標命名空間)
    -   **Command**: `upgrade` (如果 Release 已存在則升級，不存在則安裝)
    -   **Chart Type**: File Path
    -   **Chart Path**: `$(System.DefaultWorkingDirectory)/_your-ci-pipeline-name/manifests/helm/fintech-chart` (注意: `_your-ci-pipeline-name` 是你的 CI Pipeline 名稱)
    -   **Release Name**: `fintech-demo-staging`
    -   **Arguments (Set values)**:
        ```
        --set image.tag=$(tag)
        --set image.repository=$(imageRepository)
        ```

#### 部署方式 B: 使用 Kustomize

1.  在 Agent Job 中加入 **Kubernetes** (`Kubectl@1`) 任務。
2.  **設定任務**:
    -   **Service connection type**: Azure Resource Manager
    -   **Kubernetes service connection**: 選擇你的 AKS 服務連接。
    -   **Command**: `apply`
    -   **Use Kustomize**: 勾選此項。
    -   **Kustomization path**: `$(System.DefaultWorkingDirectory)/_your-ci-pipeline-name/manifests/kustomize/overlays/staging`

## 4. 結論

透過以上設定，你將擁有一個完整的 CI/CD 工作流：
1.  開發者推送程式碼到 `main` 分支。
2.  CI Pipeline 自動觸發，建置所有服務的 Docker 映像檔，並以 Build ID 作為標籤推送到 ACR。
3.  CD Release Pipeline 自動觸發，使用 Helm 或 Kustomize 將帶有最新標籤的應用程式部署到你的 AKS 叢集中。 