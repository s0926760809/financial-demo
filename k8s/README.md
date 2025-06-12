# 金融微服務 Kubernetes + eBPF 安全演示

## 🏗️ 階段2：Kubernetes + Cilium + Tetragon 部署

### 架構概述

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│  Cilium CNI (eBPF-based networking & security)             │
├─────────────────────────────────────────────────────────────┤
│  Tetragon (eBPF Runtime Security Observability)           │
├─────────────────────────────────────────────────────────────┤
│  金融微服務 Pods                                              │
│  ├── Trading API                                           │
│  ├── Risk Engine                                           │
│  ├── Payment Gateway                                       │
│  └── Audit Service                                         │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 部署要求

### 系統要求
- Kubernetes 1.25+
- Linux Kernel 5.4+ (支持eBPF)
- 至少 8GB RAM
- 4 CPU cores

### 支持的部署環境
- **本地開發**: Kind, Minikube, K3s
- **雲端**: EKS, GKE, AKS
- **自建**: kubeadm

## 🚀 快速部署

### 方法1：一鍵部署腳本
```bash
# 克隆項目
git clone <repository>
cd fintech-ebpf-demo/k8s

# 執行部署腳本
./deploy.sh
```

### 方法2：逐步部署
```bash
# 1. 創建Kind集群
./scripts/setup-kind-cluster.sh

# 2. 安裝Cilium CNI
./scripts/install-cilium.sh

# 3. 部署Tetragon
./scripts/install-tetragon.sh

# 4. 部署金融微服務
kubectl apply -f manifests/

# 5. 驗證部署
./scripts/verify-deployment.sh
```

## 🔍 eBPF 監控功能

### Tetragon 安全策略
- 文件系統監控
- 網絡流量分析
- 進程執行追蹤
- 系統調用監控

### 監控重點
1. **敏感文件訪問**
   - `/etc/passwd`, `/etc/shadow`
   - SSL證書和私鑰
   - 數據庫配置文件

2. **可疑網絡活動**
   - 外部DNS查詢
   - 未授權的出站連接
   - 內部服務間異常通信

3. **危險命令執行**
   - Shell命令注入
   - 權限提升嘗試
   - 加密貨幣挖礦行為

## 📊 監控和指標

### Prometheus + Grafana
- 集群資源使用率
- 微服務業務指標
- eBPF安全事件統計

### Tetragon Events
- 實時安全事件流
- JSON格式日誌輸出
- 可集成SIEM系統

## 🔒 安全演示場景

### 場景1：命令注入攻擊
```bash
# 觸發Trading API的命令執行漏洞
kubectl exec -it <trading-api-pod> -- curl -X POST localhost:8080/debug/execute \
  -d '{"command":"cat","args":["/etc/passwd"]}'
```

### 場景2：敏感文件訪問
```bash
# 觸發文件讀取監控
kubectl exec -it <pod> -- cat /root/.ssh/id_rsa
```

### 場景3：異常網絡活動
```bash
# 觸發DNS查詢監控
kubectl exec -it <payment-pod> -- nslookup malicious-domain.com
```

## 📁 文件結構

```
k8s/
├── README.md                 # 本文件
├── deploy.sh                 # 一鍵部署腳本
├── scripts/                  # 部署腳本
│   ├── setup-kind-cluster.sh
│   ├── install-cilium.sh
│   ├── install-tetragon.sh
│   └── verify-deployment.sh
├── manifests/                # Kubernetes manifests
│   ├── namespace.yaml
│   ├── database/
│   ├── microservices/
│   ├── monitoring/
│   └── rbac/
├── tetragon/                 # Tetragon配置
│   ├── policies/
│   └── events/
├── cilium/                   # Cilium配置
│   └── values.yaml
└── helm/                     # Helm charts
    └── fintech-demo/
```

## ⚠️ 注意事項

1. **安全警告**: 此系統包含故意漏洞，僅用於演示
2. **資源要求**: 確保集群有足夠資源
3. **內核支持**: 驗證eBPF功能可用性
4. **網絡策略**: Cilium網絡安全策略已啟用

## 🔄 下一步

完成Kubernetes部署後，將進入：
- **階段3**: React前端開發
- **階段4**: 攻擊場景腳本
- **階段5**: 完整演示環境

---

**版本**: 2.0.0  
**階段**: Kubernetes + eBPF 部署  
**更新日期**: 2023-12-01 