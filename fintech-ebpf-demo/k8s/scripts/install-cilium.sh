#!/bin/bash

set -e

echo "🔧 安裝 Cilium CNI..."

# 檢查Cilium CLI是否已安裝
if ! command -v cilium &> /dev/null; then
    echo "📦 安裝 Cilium CLI..."
    
    # 根據操作系統安裝Cilium CLI
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
        CLI_ARCH=amd64
        if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
        curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
        sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
        sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
        rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
        CLI_ARCH=amd64
        if [ "$(uname -m)" = "arm64" ]; then CLI_ARCH=arm64; fi
        curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-darwin-${CLI_ARCH}.tar.gz{,.sha256sum}
        shasum -a 256 -c cilium-darwin-${CLI_ARCH}.tar.gz.sha256sum
        sudo tar xzvfC cilium-darwin-${CLI_ARCH}.tar.gz /usr/local/bin
        rm cilium-darwin-${CLI_ARCH}.tar.gz{,.sha256sum}
    fi
fi

echo "🚀 部署 Cilium 到 Kind 集群..."

# 使用 Cilium CLI 安裝，啟用 eBPF 功能
cilium install \
    --version=1.14.5 \
    --set kubeProxyReplacement=strict \
    --set k8sServiceHost=fintech-ebpf-demo-control-plane \
    --set k8sServicePort=6443 \
    --set hubble.relay.enabled=true \
    --set hubble.ui.enabled=true \
    --set prometheus.enabled=true \
    --set operator.prometheus.enabled=true \
    --set hubble.enabled=true \
    --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}" \
    --set bpf.masquerade=true \
    --set ipam.mode=kubernetes \
    --set enableRuntimeSecurity=true \
    --set enableCiliumEndpointSlice=true

echo "⏳ 等待 Cilium 就緒..."
cilium status --wait

echo "🔍 驗證 Cilium 安裝..."
cilium connectivity test --test-concurrency=1 --all-flows=false --collect-sysdump-on-failure=false

echo "📊 啟用 Hubble UI (可選)..."
# 將 Hubble UI 暴露為 NodePort 服務
kubectl patch svc hubble-ui -n kube-system -p '{"spec":{"type":"NodePort","ports":[{"port":80,"nodePort":30012,"targetPort":8081}]}}'

echo "🔧 配置 Cilium 網絡策略..."

# 創建全局網絡策略，允許 Prometheus 抓取指標
cat << EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-prometheus
  namespace: fintech-demo
spec:
  endpointSelector: {}
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: prometheus
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      - port: "8081" 
        protocol: TCP
      - port: "8082"
        protocol: TCP
      - port: "8083"
        protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-inter-service
  namespace: fintech-demo
spec:
  endpointSelector: {}
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: trading-api
    - matchLabels:
        app: risk-engine
    - matchLabels:
        app: payment-gateway
    - matchLabels:
        app: audit-service
  egress:
  - toEndpoints:
    - matchLabels:
        app: postgresql
    - matchLabels:
        app: redis
    - matchLabels:
        app: trading-api
    - matchLabels:
        app: risk-engine
    - matchLabels:
        app: payment-gateway
    - matchLabels:
        app: audit-service
  - toServices:
    - k8sService:
        serviceName: kube-dns
        namespace: kube-system
  # 允許外部 DNS 查詢（用於演示）
  - toFQDNs:
    - matchName: "google.com"
    - matchName: "github.com"
    - matchPattern: "*.paypal.com"
    - matchPattern: "*.stripe.com"
EOF

echo "📋 Cilium 狀態："
kubectl get pods -n kube-system -l k8s-app=cilium
echo ""
echo "🔍 Hubble UI 訪問："
echo "  http://localhost:30012"
echo ""
echo "✅ Cilium 安裝完成" 