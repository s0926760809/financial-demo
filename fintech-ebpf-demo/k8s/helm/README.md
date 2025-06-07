# Helm 部署方案

這個目錄包含了一個用於部署完整「金融微服務 eBPF 演示系統」的 Helm Chart。

## 什麼是 Helm？

Helm 是 Kubernetes 的套件管理器。它允許你將一組複雜的 Kubernetes 應用定義為一個可配置的、可重用的套件（稱為 Chart），極大地簡化了應用的部署與管理。

## 前置需求

1.  **Kubernetes Cluster**: 你需要一個正在運行的 Kubernetes 叢集。
2.  **kubectl**: 已經設定好 `kubectl` 並連接到你的叢集。
3.  **Helm**: 已安裝 Helm v3+。
4.  **容器映像檔**: 確保所有應用程式的 Docker 映像檔已經被建置並推送到 `values.yaml` 中所指定的容器倉庫。

## Chart 結構

- `Chart.yaml`: Chart 的元數據。
- `values.yaml`: Chart 的所有可配置選項與預設值。這是你最常需要修改的檔案。
- `templates/`: 存放所有 Kubernetes 資源的模板檔案。
- `templates/_helpers.tpl`: 存放可重用的模板輔助函式。

## 安裝 Chart

你可以使用 `helm install` 指令來部署此 Chart。

```bash
# 語法: helm install [RELEASE_NAME] [CHART_PATH]

# 範例：部署一個名為 "my-fintech-app" 的 release
helm install my-fintech-app ./fintech-chart
```

## 組態

修改 `values.yaml` 是最直接的組態方式。但你也可以在安裝時透過 `--set` 參數或外部 `yaml` 檔案來覆寫預設值。

### 範例 1: 在安裝時指定映像檔標籤和副本數

```bash
helm install my-fintech-app ./fintech-chart \
  --set image.tag="1.2.3" \
  --set frontend.replicaCount=2
```

### 範例 2: 使用自訂的 values 檔案

首先，建立一個 `my-values.yaml`:
```yaml
# my-values.yaml
frontend:
  replicaCount: 3
  image:
    repository: my-private-acr.azurecr.io/fintech-demo/frontend

tradingApi:
  image:
    tag: "sha-123456"
```

然後在安裝時使用它：
```bash
helm install my-fintech-app ./fintech-chart -f my-values.yaml
```

## 升級部署

當你修改了組態或 Chart 模板後，可以使用 `helm upgrade` 來更新已有的部署。

```bash
# 升級 my-fintech-app release
helm upgrade my-fintech-app ./fintech-chart -f my-values.yaml
```

## 解除安裝

若要從叢集中移除部署，請使用 `helm uninstall`。

```bash
helm uninstall my-fintech-app
``` 