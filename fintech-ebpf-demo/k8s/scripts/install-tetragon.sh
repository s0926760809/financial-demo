#!/bin/bash

set -e

echo "🛡️  安裝 Tetragon 安全監控..."

# 檢查 Tetragon CLI 是否已安裝
if ! command -v tetra &> /dev/null; then
    echo "📦 安裝 Tetragon CLI..."
    
    # 根據操作系統安裝 Tetragon CLI
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        TETRAGON_VERSION=$(curl -s https://api.github.com/repos/cilium/tetragon/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        curl -L https://github.com/cilium/tetragon/releases/download/${TETRAGON_VERSION}/tetra-linux-amd64.tar.gz -o tetra-linux-amd64.tar.gz
        tar -xzf tetra-linux-amd64.tar.gz
        sudo mv tetra /usr/local/bin/
        rm tetra-linux-amd64.tar.gz
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        TETRAGON_VERSION=$(curl -s https://api.github.com/repos/cilium/tetragon/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        if [ "$(uname -m)" = "arm64" ]; then
            curl -L https://github.com/cilium/tetragon/releases/download/${TETRAGON_VERSION}/tetra-darwin-arm64.tar.gz -o tetra-darwin-arm64.tar.gz
            tar -xzf tetra-darwin-arm64.tar.gz
            rm tetra-darwin-arm64.tar.gz
        else
            curl -L https://github.com/cilium/tetragon/releases/download/${TETRAGON_VERSION}/tetra-darwin-amd64.tar.gz -o tetra-darwin-amd64.tar.gz
            tar -xzf tetra-darwin-amd64.tar.gz
            rm tetra-darwin-amd64.tar.gz
        fi
        sudo mv tetra /usr/local/bin/
    fi
fi

echo "🚀 使用 Helm 部署 Tetragon..."

# 添加 Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# 安裝 Tetragon
helm install tetragon cilium/tetragon \
    --namespace kube-system \
    --set tetragon.grpc.enabled=true \
    --set tetragon.prometheus.enabled=true \
    --set tetragon.prometheus.port=2112 \
    --set tetragon.exportFilename=/var/log/tetragon/tetragon.log \
    --set daemonSetAnnotations."prometheus\.io/scrape"="true" \
    --set daemonSetAnnotations."prometheus\.io/port"="2112" \
    --set daemonSetAnnotations."prometheus\.io/path"="/metrics"

echo "⏳ 等待 Tetragon 就緒..."
kubectl rollout status daemonset/tetragon -n kube-system --timeout=300s

echo "🔧 部署金融微服務安全監控策略..."

# 創建 TracingPolicy 目錄
mkdir -p ../tetragon/policies

# 文件系統監控策略
cat > ../tetragon/policies/file-monitoring.yaml << 'EOF'
apiVersion: cilium.io/v2alpha1
kind: TracingPolicy
metadata:
  name: file-monitoring
  namespace: kube-system
spec:
  kprobes:
  - call: "fd_install"
    syscall: false
    args:
    - index: 0
      type: int
    - index: 1
      type: "file"
    selectors:
    - matchArgs:
      - index: 1
        operator: "Postfix"
        values:
        - "/etc/passwd"
        - "/etc/shadow"
        - "/root/.ssh/id_rsa"
        - "/root/.credentials"
        - "/root/.private_key"
        - "/root/.db_connection"
        - "/var/log/auth.log"
      matchActions:
      - action: Post
  - call: "security_file_open"
    syscall: false
    args:
    - index: 0
      type: "file"
    - index: 1
      type: "int"
    selectors:
    - matchArgs:
      - index: 0
        operator: "Postfix"
        values:
        - "/.credentials"
        - "/.private_key" 
        - "/.payment_keys"
        - "/.audit_keys"
      matchActions:
      - action: Post
EOF

# 網絡監控策略
cat > ../tetragon/policies/network-monitoring.yaml << 'EOF'
apiVersion: cilium.io/v2alpha1
kind: TracingPolicy
metadata:
  name: network-monitoring
  namespace: kube-system
spec:
  kprobes:
  - call: "tcp_connect"
    syscall: false
    args:
    - index: 0
      type: "sock"
    selectors:
    - matchArgs:
      - index: 0
        operator: "DAddr"
        values:
        - "8.8.8.8"
        - "1.1.1.1"
      matchActions:
      - action: Post
  - call: "__sys_connect"
    syscall: true
    args:
    - index: 0
      type: "int"
    - index: 1
      type: "sockaddr"
    - index: 2
      type: "int"
    selectors:
    - matchArgs:
      - index: 1
        operator: "Family"
        values:
        - "AF_INET"
        - "AF_INET6"
      matchActions:
      - action: Post
EOF

# 進程執行監控策略
cat > ../tetragon/policies/process-monitoring.yaml << 'EOF'
apiVersion: cilium.io/v2alpha1
kind: TracingPolicy
metadata:
  name: process-monitoring
  namespace: kube-system
spec:
  tracepoints:
  - subsystem: "syscalls"
    event: "sys_enter_execve"
    args:
    - index: 0
      type: "string"
    - index: 1
      type: "string_array"
    selectors:
    - matchArgs:
      - index: 0
        operator: "InMap"
        values:
        - "/bin/sh"
        - "/bin/bash"
        - "/bin/curl"
        - "/bin/wget"
        - "/usr/bin/curl"
        - "/usr/bin/wget"
        - "/usr/bin/nc"
        - "/usr/bin/netcat"
        - "/usr/bin/nmap"
        - "/usr/bin/dig"
        - "/usr/bin/nslookup"
      matchActions:
      - action: Post
  kprobes:
  - call: "__x64_sys_execve"
    syscall: true
    args:
    - index: 0
      type: "string"
    - index: 1
      type: "string_array"
    selectors:
    - matchArgs:
      - index: 0
        operator: "Postfix"
        values:
        - "curl"
        - "wget"
        - "nc"
        - "nmap"
        - "python"
        - "python3"
        - "node"
      matchActions:
      - action: Post
EOF

# 金融業務安全監控策略
cat > ../tetragon/policies/fintech-security.yaml << 'EOF'
apiVersion: cilium.io/v2alpha1
kind: TracingPolicy
metadata:
  name: fintech-security
  namespace: kube-system
spec:
  kprobes:
  # 監控敏感文件寫入
  - call: "vfs_write"
    syscall: false
    args:
    - index: 0
      type: "file"
    - index: 1
      type: "char_buf"
      sizeArgIndex: 3
    - index: 2
      type: "size_t"
    selectors:
    - matchArgs:
      - index: 0
        operator: "Postfix"
        values:
        - "audit.log"
        - "payment.log"
        - "trading.log"
        - ".credentials"
      matchActions:
      - action: Post
  # 監控加密相關系統調用
  - call: "crypto_aead_encrypt"
    syscall: false
    args:
    - index: 0
      type: "aead_request"
    selectors:
    - matchActions:
      - action: Post
  # 監控內存映射（潛在的代碼注入）
  - call: "__x64_sys_mmap"
    syscall: true
    args:
    - index: 0
      type: "unsigned_long"
    - index: 1
      type: "size_t"
    - index: 2
      type: "unsigned_long"
    selectors:
    - matchArgs:
      - index: 2
        operator: "Equal"
        values:
        - "7"  # PROT_READ|PROT_WRITE|PROT_EXEC
      matchActions:
      - action: Post
EOF

# 部署所有監控策略
echo "📋 部署安全監控策略..."
kubectl apply -f ../tetragon/policies/

echo "⏳ 等待策略生效..."
sleep 10

echo "🔍 驗證 Tetragon 安裝..."
kubectl get pods -n kube-system -l app.kubernetes.io/name=tetragon

echo "📊 配置 Tetragon 日誌輸出..."

# 創建 Tetragon 事件收集 ConfigMap
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: tetragon-config
  namespace: kube-system
data:
  tetragon.conf: |
    {
      "log-level": "info",
      "log-format": "json",
      "enable-export-aggregation": true,
      "export-filename": "/var/log/tetragon/tetragon.log",
      "export-file-max-size-mb": 100,
      "export-file-rotation-interval": "1h",
      "export-rate-limit": 1000
    }
EOF

# 重啟 Tetragon 使配置生效
kubectl rollout restart daemonset/tetragon -n kube-system

echo "🎯 創建演示用的事件過濾器..."

# 創建一個 Job 來測試事件收集
cat << EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: tetragon-test
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: test
        image: alpine:latest
        command: ["sh", "-c"]
        args:
        - |
          echo "Testing Tetragon event collection..."
          cat /etc/passwd
          wget -q -O /dev/null http://example.com || true
          echo "Test completed"
      restartPolicy: Never
  backoffLimit: 1
EOF

echo "📋 Tetragon 狀態："
kubectl get tracingpolicies -A
echo ""

echo "🔍 查看 Tetragon 事件的命令："
echo "  kubectl logs -f -n kube-system -l app.kubernetes.io/name=tetragon"
echo "  或者使用 Tetragon CLI："
echo "  kubectl exec -n kube-system ds/tetragon -- tetra getevents"
echo ""

echo "✅ Tetragon 安裝完成" 