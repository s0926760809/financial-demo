#!/bin/bash

set -e

CLUSTER_NAME="fintech-ebpf-demo"
CLUSTER_CONFIG="kind-cluster-config.yaml"

echo "🔧 創建 Kind 集群配置..."

# 創建Kind集群配置文件
cat > ${CLUSTER_CONFIG} << EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ${CLUSTER_NAME}
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  # 微服務端口映射
  - containerPort: 30080  # Trading API
    hostPort: 30080
    protocol: TCP
  - containerPort: 30081  # Risk Engine
    hostPort: 30081
    protocol: TCP
  - containerPort: 30082  # Payment Gateway
    hostPort: 30082
    protocol: TCP
  - containerPort: 30083  # Audit Service
    hostPort: 30083
    protocol: TCP
  # 監控端口映射
  - containerPort: 30090  # Prometheus
    hostPort: 30090
    protocol: TCP
  - containerPort: 30300  # Grafana
    hostPort: 30300
    protocol: TCP
  extraMounts:
  # 掛載主機 /sys 用於 eBPF
  - hostPath: /sys
    containerPath: /sys
    readOnly: true
  # 掛載主機 /proc 用於監控
  - hostPath: /proc
    containerPath: /host/proc
    readOnly: true
- role: worker
  extraMounts:
  - hostPath: /sys
    containerPath: /sys
    readOnly: true
  - hostPath: /proc
    containerPath: /host/proc
    readOnly: true
- role: worker
  extraMounts:
  - hostPath: /sys
    containerPath: /sys
    readOnly: true
  - hostPath: /proc
    containerPath: /host/proc
    readOnly: true
# eBPF 相關配置
kubeadmConfigPatches:
- |
  kind: ClusterConfiguration
  apiServer:
    extraArgs:
      enable-admission-plugins: NodeRestriction,MutatingAdmissionWebhook,ValidatingAdmissionWebhook
  controllerManager:
    extraArgs:
      bind-address: 0.0.0.0
  scheduler:
    extraArgs:
      bind-address: 0.0.0.0
- |
  kind: KubeProxyConfiguration
  mode: ipvs
networking:
  disableDefaultCNI: true  # 禁用默認 CNI，使用 Cilium
  kubeProxyMode: none      # 禁用 kube-proxy，使用 Cilium 替代
EOF

echo "📦 創建 Kind 集群: ${CLUSTER_NAME}"
kind create cluster --config=${CLUSTER_CONFIG}

echo "⏳ 等待集群就緒..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

echo "🔧 配置集群設置..."

# 標記節點支持 eBPF
kubectl label nodes --all node.kubernetes.io/ebpf=supported --overwrite

# 設置節點容忍度，允許調度到控制平面
kubectl taint nodes ${CLUSTER_NAME}-control-plane node-role.kubernetes.io/control-plane:NoSchedule- || true

echo "📋 集群信息:"
kubectl cluster-info
echo ""
kubectl get nodes -o wide

echo "✅ Kind 集群創建完成"

# 清理配置文件
rm -f ${CLUSTER_CONFIG} 