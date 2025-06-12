#!/bin/bash
set -e

# Configuration for the remote registry
REGISTRY_PREFIX="quay.io/fintech"
TAG="v.1.1"
QUAY_USER="s0926760809@gmail.com"
QUAY_PASS="Haste0809"

# Login to Quay.io
echo "Logging in to Quay.io..."
echo "$QUAY_PASS" | sudo docker login quay.io -u "$QUAY_USER" --password-stdin

# Get the absolute path of the script's directory, which is /scripts
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
# The repo root is one level up from /scripts
REPO_ROOT="$SCRIPT_DIR/.."

echo "Using registry prefix: $REGISTRY_PREFIX"
echo "Repository root: $REPO_ROOT"
echo "Image tag: $TAG"

# Define services, their paths relative to REPO_ROOT, and image names
SERVICES=(
  "frontend:frontend:ebpf"
  "backend/trading-api:backend/trading-api:ebpf-trading-api"
  "backend/risk-engine:backend/risk-engine:ebpf-risk-engine"
  "backend/payment-gateway:backend/payment-gateway:ebpf-payment-gateway"
  "backend/audit-service:backend/audit-service:ebpf-audit-service"
)

# Build and push each service
for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r -a parts <<< "$service_info"
  # SERVICE_NAME is just for logging
  SERVICE_NAME_LOG="${parts[0]}"
  SERVICE_PATH="${parts[1]}"
  IMAGE_NAME="${parts[2]}"
  
  FULL_IMAGE_NAME="$REGISTRY_PREFIX/$IMAGE_NAME:$TAG"
  CONTEXT_PATH="$REPO_ROOT/$SERVICE_PATH"

  echo "--------------------------------------------------"
  echo "Building and pushing service: $SERVICE_NAME_LOG"
  echo "Image: $FULL_IMAGE_NAME"
  echo "Context: $CONTEXT_PATH"
  echo "--------------------------------------------------"

  if [ ! -d "$CONTEXT_PATH" ] || [ ! -f "$CONTEXT_PATH/Dockerfile" ]; then
    echo "Error: Dockerfile not found in $CONTEXT_PATH"
    exit 1
  fi
  
  sudo docker build -t "$FULL_IMAGE_NAME" "$CONTEXT_PATH"
  sudo docker push "$FULL_IMAGE_NAME"
done

echo "--------------------------------------------------"
echo "All images built and pushed successfully."
echo "--------------------------------------------------" 