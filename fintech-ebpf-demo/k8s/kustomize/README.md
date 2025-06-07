# Kustomize 部署方案

這個目錄包含了使用 Kustomize 來部署「金融微服務 eBPF 演示系統」的配置。

## 什麼是 Kustomize？

Kustomize 是一個內建於 `kubectl` 的 Kubernetes 原生組態管理工具。它讓你能夠以一種無模板、宣告式的方式客製化 Kubernetes 應用的設定。其核心思想是使用一個基礎 (base) 的 YAML 設定，然後為不同的環境（如開發、預備、生產）建立疊加層 (overlays) 來修改基礎設定。

## 前置需求

1.  **Kubernetes Cluster**: 你需要一個正在運行的 Kubernetes 叢集。
2.  **kubectl v1.14+**: Kustomize 已整合到 `kubectl` 中，無需額外安裝。
3.  **容器映像檔**: 確保所有應用程式的 Docker 映像檔已經被建置並推送到容器倉庫。

## 目錄結構

-   `base/`: 存放所有環境共享的基礎 Kubernetes 資源清單。
    -   `kustomization.yaml`: 定義了基礎資源。
-   `overlays/`: 存放不同環境的客製化配置。
    -   `staging/`: 預備環境的配置。它會繼承 `base`，並在此基礎上進行修改（例如，增加副本數、使用不同的映像檔標籤、添加環境標籤等）。
    -   `production/`: 生產環境的配置（可以仿照 `staging` 建立）。

## 使用方法

Kustomize 的操作是透過 `kubectl` 的 `-k` 或 `--kustomize` 旗標來完成的。

### 部署基礎配置

如果你只想部署未經修改的基礎版本（不推薦，因為映像檔名稱可能不對），可以執行：

```bash
kubectl apply -k kustomize/base
```

### 部署 Staging 環境

這是最常見的用法。`kubectl` 會讀取 `staging` 目錄下的 `kustomization.yaml`，它會自動找到 `base` 配置，然後應用 `staging` 的補丁，最後將最終產生的配置部署到叢集。

```bash
# 部署 staging 環境的所有資源
kubectl apply -k kustomize/overlays/staging
```

你也可以在部署前預覽將要生成的 YAML：
```bash
kubectl kustomize kustomize/overlays/staging
```

### 清理部署

若要刪除部署的資源，只需在相同的 `apply` 命令後加上 `--prune` 並指定一個標籤，或者直接使用 `delete`。

```bash
# 刪除 staging 環境的所有資源
kubectl delete -k kustomize/overlays/staging
```

### 如何客製化？

1.  **修改映像檔**: 編輯 `overlays/staging/kustomization.yaml` 中的 `images` 區塊，將 `newName` 和 `newTag` 改成你自己的映像檔。
2.  **修改副本數**: 編輯 `overlays/staging/frontend-replicas.patch.yaml` 中的 `replicas` 值。
3.  **新增資源或補丁**: 在 `base` 或 `overlays` 目錄下新增 YAML 檔案，並在對應的 `kustomization.yaml` 中引用它們。 