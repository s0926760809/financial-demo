# 在 Windows 上搭建 eBPF 實驗環境

本指南將引導你如何在 Windows 筆記型電腦上，透過 WSL 2 (Windows Subsystem for Linux 2) 和 Docker Desktop，快速搭建一個功能完整的 Kubernetes 叢集，並在其中運行包含 eBPF 安全監控的金融演示專案。

## 核心技術

-   **WSL 2**: 讓你在 Windows 上能運行一個真實的 Linux 內核，這是執行 eBPF 的基礎。
-   **Docker Desktop (WSL 2 backend)**: 提供必要的 Linux 虛擬機環境，所有容器都在 WSL 2 中運行。
-   **k3d**: 一個非常輕量的工具，用於快速建立與管理 k3s 叢集。
-   **Chocolatey**: Windows 的套件管理器，用於簡化工具的安裝。
-   **Cilium & Tetragon**: 提供 eBPF 安全可觀測性。
-   **Helm**: 用於部署我們的金融應用。

## 自動化安裝 (推薦)

我們提供了一個一鍵式的 PowerShell 安裝腳本，能夠自動化完成所有設定。

### 1. 前置需求

在執行腳本前，請手動完成以下安裝：

1.  **啟用 WSL 2**: 請依照 [微軟官方文件](https://docs.microsoft.com/zh-tw/windows/wsl/install) 的指示安裝 WSL 2。一個簡單的方式是以系統管理員身分開啟 PowerShell 並執行：
    ```powershell
    wsl --install
    ```
2.  **Docker Desktop for Windows**: 請從 [Docker 官網](https://www.docker.com/products/docker-desktop/) 下載並安裝。在設定中，**請確保使用 WSL 2 作為後端**。安裝後請啟動 Docker Desktop。
3.  **Git for Windows**: 請從 [官網](https://git-scm.com/download/win) 下載並安裝，這會提供 `bash` 環境讓 PowerShell 可以執行 `.sh` 腳本。

### 2. 執行安裝腳本

開啟 **PowerShell Core** (建議，非 Windows PowerShell)，進入此目錄 (`experiment-on-laptop/windows`)，然後執行：

```powershell
# 執行腳本
.\setup-windows.ps1
```

腳本將會：
-   自動使用 `Chocolatey` (如果尚未安裝會提示) 來安裝 `k3d`, `kubernetes-cli`, `kubernetes-helm`。
-   建立一個名為 `ebpf-demo-cluster` 的 k3d 叢集，並配置好本地映像檔倉庫。
-   執行專案的 CI 打包腳本，將所有服務的 Docker 映像檔建置並推送到該本地倉庫。
-   透過 Helm 安裝 Cilium 和 Tetragon。
-   透過 Helm 部署我們的金融應用。

### 3. 存取應用

腳本執行成功後，請依照終端機的提示完成最後步驟：

1.  **修改 hosts 檔案**:
    你需要以**系統管理員身分**開啟記事本 (Notepad)，然後開啟 `C:\Windows\System32\drivers\etc\hosts` 檔案，在檔案末尾添加一行：
    ```
    127.0.0.1 fintech.local
    ```
    儲存並退出。

2.  **開啟瀏覽器**:
    現在你可以在瀏覽器中開啟 [http://fintech.local](http://fintech.local) 來存取應用。

### 4. 驗證 eBPF 監控

若要即時查看由 Tetragon 捕捉到的 eBPF 事件，請開啟一個新的 PowerShell 終端機並執行：
```powershell
kubectl -n kube-system exec -it ds/tetragon -- tetra getevents -o compact
```
你可以嘗試在應用中進行一些操作，然後觀察終端機中滾動輸出的事件。

## 手動清理

若要刪除整個實驗環境，只需執行：
```powershell
k3d cluster delete ebpf-demo-cluster
```
這將會刪除 k3d 叢集以及所有相關的容器和資源。 