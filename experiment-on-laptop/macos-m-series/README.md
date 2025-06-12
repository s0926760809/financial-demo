# 在 macOS (Apple Silicon) 上搭建 eBPF 實驗環境

本指南將引導你如何在搭載 Apple Silicon (M1/M2/M3) 晶片的 macOS 筆記型電腦上，快速搭建一個功能完整的 Kubernetes 叢集，並在其中運行包含 eBPF 安全監控的金融演示專案。

## 核心技術

-   **Docker Desktop**: 提供必要的 Linux 虛擬機環境，所有容器都在其中運行。
-   **k3d**: 一個非常輕量的工具，用於快速建立與管理 k3s 叢集。k3s 是一個經 CNCF 認證的輕量級 Kubernetes 發行版。
-   **Cilium & Tetragon**: Cilium 作為 CNI (容器網路介面)，並啟用其內建的 Tetragon 功能來提供 eBPF 安全可觀測性。
-   **Helm**: 用於將我們的金融應用打包並部署到叢集中。

## 自動化安裝 (推薦)

我們提供了一個一鍵式的安裝腳本，能夠自動化完成所有設定。

### 1. 前置需求

在執行腳本前，請手動完成以下安裝：

1.  **Homebrew**: macOS 的套件管理器。如果尚未安裝，請開啟終端機執行：
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
2.  **Docker Desktop for Mac**: 請從 [Docker 官網](https://www.docker.com/products/docker-desktop/) 下載並安裝。**安裝後請務必啟動 Docker Desktop**。

### 2. 執行安裝腳本

開啟終端機，進入此目錄 (`experiment-on-laptop/macos-m-series`)，然後執行：

```bash
# 賦予腳本執行權限
chmod +x setup-macos.sh

# 執行腳本
./setup-macos.sh
```

腳本將會：
-   自動使用 `brew` 安裝 `k3d`, `kubectl`, `helm`。
-   建立一個名為 `ebpf-demo-cluster` 的 k3d 叢集，並配置好本地映像檔倉庫。
-   執行專案的 CI 打包腳本，將所有服務的 Docker 映像檔建置並推送到該本地倉庫。
-   透過 Helm 安裝 Cilium 和 Tetragon。
-   透過 Helm 部署我們的金融應用。

### 3. 存取應用

腳本執行成功後，請依照終端機的提示完成最後步驟：

1.  **修改 hosts 檔案**:
    你需要編輯 `/etc/hosts` 檔案來將 `fintech.local` 指向你的本機。
    ```bash
    sudo nano /etc/hosts
    ```
    在檔案末尾添加一行：
    ```
    127.0.0.1 fintech.local
    ```
    儲存並退出。

2.  **開啟瀏覽器**:
    現在你可以在瀏覽器中開啟 [http://fintech.local](http://fintech.local) 來存取應用。

### 4. 驗證 eBPF 監控

若要即時查看由 Tetragon 捕捉到的 eBPF 事件，請執行：
```bash
kubectl -n kube-system exec -it ds/tetragon -- tetra getevents -o compact
```
你可以嘗試在應用中進行一些操作（例如，訪問不同頁面），然後觀察終端機中滾動輸出的事件。

## 手動清理

若要刪除整個實驗環境，只需執行：
```bash
k3d cluster delete ebpf-demo-cluster
```
這將會刪除 k3d 叢集以及所有相關的容器和資源。 