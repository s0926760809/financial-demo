<#
.SYNOPSIS
    Windows 上的 eBPF 實驗環境自動化安裝腳本。

.DESCRIPTION
    此腳本會自動執行以下任務:
    1. 檢查並提示安裝必要工具 (Chocolatey, Docker Desktop, k3d, kubectl, helm)。
    2. 建立一個 k3d 叢集，並啟用與本地倉庫的映像檔共享。
    3. 安裝 Cilium 與 Tetragon。
    4. 使用 Helm Chart 部署金融演示應用。
#>

# 發生錯誤時停止執行
$ErrorActionPreference = "Stop"

# --- 組態 ---
$clusterName = "ebpf-demo-cluster"
$dockerRegistry = "k3d-my-registry:5000" # k3d 的本地映像檔倉庫
$imageTag = "local-dev"

# 函數: 檢查指令是否存在
function Check-Command {
    param (
        [string]$command
    )
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        Write-Host "⚠️ 缺少指令: $command. 請依照提示進行安裝。" -ForegroundColor Yellow
        switch ($command) {
            "choco" {
                Write-Host "請以系統管理員身分開啟 PowerShell 並執行以下指令安裝 Chocolatey:"
                Write-Host 'Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(''https://community.chocolatey.org/install.ps1''))'
                exit 1
            }
            "docker" {
                Write-Host "請從官網安裝 Docker Desktop for Windows (並啟用 WSL 2 後端): https://www.docker.com/products/docker-desktop/"
                exit 1
            }
            "k3d" {
                Write-Host "請執行: choco install k3d"
                exit 1
            }
            "kubectl" {
                Write-Host "請執行: choco install kubernetes-cli"
                exit 1
            }
            "helm" {
                Write-Host "請執行: choco install kubernetes-helm"
                exit 1
            }
        }
    }
}

Write-Host "### 步驟 1/5: 檢查前置需求... ###" -ForegroundColor Blue
Check-Command "choco"
Check-Command "docker"
Check-Command "k3d"
Check-Command "kubectl"
Check-Command "helm"
Write-Host "✅ 所有前置需求已滿足。" -ForegroundColor Green

Write-Host "`n### 步驟 2/5: 建立 k3d 叢集與本地倉庫... ###" -ForegroundColor Blue
# 檢查 k3d 本地倉庫是否存在
if (-not (k3d registry get my-registry -ErrorAction SilentlyContinue)) {
    Write-Host "建立 k3d 本地倉庫..."
    k3d registry create my-registry --port 5000
} else {
    Write-Host "k3d 本地倉庫 'my-registry' 已存在。"
}

# 建立 k3d 叢集
if (-not (k3d cluster get $clusterName -ErrorAction SilentlyContinue)) {
    Write-Host "建立 k3d 叢集 '$clusterName'..."
    k3d cluster create $clusterName --registry-use "k3d-my-registry:5000" --k3s-arg "--disable=traefik@server:0"
} else {
    Write-Host "k3d 叢集 '$clusterName' 已存在。"
}
Write-Host "✅ k3d 叢集已準備就緒。" -ForegroundColor Green

Write-Host "`n### 步驟 3/5: 建置應用映像檔並推送到本地倉庫... ###" -ForegroundColor Blue
$ciScriptPath = "..\..\..\k8s\ci\build-images.sh"
if (-not (Test-Path $ciScriptPath)) {
    Write-Host "錯誤: 找不到打包腳本: $ciScriptPath" -ForegroundColor Red
    exit 1
}
# 在 PowerShell 中執行 bash 腳本 (需要 WSL 或 Git Bash)
$env:DOCKER_REGISTRY = $dockerRegistry
$env:IMAGE_TAG = $imageTag
bash $ciScriptPath
$env:DOCKER_REGISTRY = $null
$env:IMAGE_TAG = $null
Write-Host "✅ 所有應用映像檔已成功建置並推送到本地倉庫。" -ForegroundColor Green

Write-Host "`n### 步驟 4/5: 安裝 Cilium 與 Tetragon... ###" -ForegroundColor Blue
helm repo add cilium https://helm.cilium.io/
helm repo update
helm install cilium cilium/cilium --version 1.15.5 --namespace kube-system --set tetragon.enabled=true
Write-Host "✅ Cilium 與 Tetragon 已成功安裝。" -ForegroundColor Green

Write-Host "`n### 步驟 5/5: 部署金融演示應用... ###" -ForegroundColor Blue
helm install fintech-app ..\..\..\..\k8s\helm\fintech-chart --set image.tag=$imageTag --set "frontend.image.repository=$dockerRegistry/frontend" --set "tradingApi.image.repository=$dockerRegistry/trading-api" --set "riskEngine.image.repository=$dockerRegistry/risk-engine" --set "paymentGateway.image.repository=$dockerRegistry/payment-gateway" --set "auditService.image.repository=$dockerRegistry/audit-service" --set ingress.enabled=true --set ingress.hosts[0].host=fintech.local --set-string "ingress.hosts[0].paths[0].path=/"
Write-Host "✅ 金融演示應用已成功部署。" -ForegroundColor Green

Write-Host "`n🚀 恭喜！eBPF 實驗環境已在你的 Windows 上準備就緒！`n" -ForegroundColor Green
Write-Host "請執行以下步驟來存取應用："
Write-Host "1. 以系統管理員身分開啟 Notepad，並編輯 C:\Windows\System32\drivers\etc\hosts 檔案，添加以下內容："
Write-Host "   127.0.0.1 fintech.local" -ForegroundColor Yellow
Write-Host "2. 在瀏覽器中開啟: http://fintech.local" -ForegroundColor Yellow
Write-Host "3. 若要查看 Tetragon 事件, 請執行: kubectl -n kube-system exec -it ds/tetragon -- tetra getevents -o compact" -ForegroundColor Yellow
Write-Host "4. 若要清理環境, 請執行: k3d cluster delete $clusterName" -ForegroundColor Yellow 