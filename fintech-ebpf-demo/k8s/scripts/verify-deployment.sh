#!/bin/bash

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查集群狀態
check_cluster() {
    log_info "檢查集群狀態..."
    
    if ! kubectl cluster-info > /dev/null 2>&1; then
        log_error "無法連接到Kubernetes集群"
        exit 1
    fi
    
    log_success "集群連接正常"
    kubectl get nodes -o wide
}

# 檢查Cilium狀態
check_cilium() {
    log_info "檢查Cilium狀態..."
    
    if ! command -v cilium &> /dev/null; then
        log_warning "Cilium CLI未安裝，跳過Cilium檢查"
        return
    fi
    
    cilium status --brief
    
    # 檢查Cilium Pods
    CILIUM_PODS=$(kubectl get pods -n kube-system -l k8s-app=cilium --no-headers | wc -l)
    if [ "$CILIUM_PODS" -gt 0 ]; then
        log_success "Cilium Pods運行正常 ($CILIUM_PODS個)"
    else
        log_error "Cilium Pods未找到"
    fi
}

# 檢查Tetragon狀態
check_tetragon() {
    log_info "檢查Tetragon狀態..."
    
    TETRAGON_PODS=$(kubectl get pods -n kube-system -l app.kubernetes.io/name=tetragon --no-headers | wc -l)
    if [ "$TETRAGON_PODS" -gt 0 ]; then
        log_success "Tetragon Pods運行正常 ($TETRAGON_PODS個)"
        
        # 檢查TracingPolicies
        POLICIES=$(kubectl get tracingpolicies -A --no-headers 2>/dev/null | wc -l)
        log_info "TracingPolicies數量: $POLICIES"
    else
        log_error "Tetragon Pods未找到"
    fi
}

# 檢查命名空間
check_namespace() {
    log_info "檢查fintech-demo命名空間..."
    
    if kubectl get namespace fintech-demo > /dev/null 2>&1; then
        log_success "fintech-demo命名空間存在"
    else
        log_error "fintech-demo命名空間不存在"
        exit 1
    fi
}

# 檢查數據庫服務
check_database() {
    log_info "檢查數據庫服務..."
    
    # PostgreSQL
    POSTGRES_STATUS=$(kubectl get pods -n fintech-demo -l app=postgresql -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "NotFound")
    if [[ "$POSTGRES_STATUS" == "Running" ]]; then
        log_success "PostgreSQL運行正常"
    else
        log_error "PostgreSQL狀態: $POSTGRES_STATUS"
    fi
    
    # Redis
    REDIS_STATUS=$(kubectl get pods -n fintech-demo -l app=redis -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "NotFound")
    if [[ "$REDIS_STATUS" == "Running" ]]; then
        log_success "Redis運行正常"
    else
        log_error "Redis狀態: $REDIS_STATUS"
    fi
}

# 檢查微服務
check_microservices() {
    log_info "檢查微服務狀態..."
    
    services=("trading-api" "risk-engine" "payment-gateway" "audit-service")
    
    for service in "${services[@]}"; do
        STATUS=$(kubectl get pods -n fintech-demo -l app=$service -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "NotFound")
        if [[ "$STATUS" == "Running" ]]; then
            log_success "$service: 運行正常"
        else
            log_warning "$service: 狀態 $STATUS"
        fi
    done
}

# 檢查服務端點
check_services() {
    log_info "檢查服務端點..."
    
    # 獲取NodePort端口
    TRADING_PORT=$(kubectl get svc trading-api-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "N/A")
    RISK_PORT=$(kubectl get svc risk-engine-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "N/A")
    PAYMENT_PORT=$(kubectl get svc payment-gateway-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "N/A")
    AUDIT_PORT=$(kubectl get svc audit-service-service -n fintech-demo -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "N/A")
    
    echo "服務端口映射："
    echo "  Trading API:     $TRADING_PORT"
    echo "  Risk Engine:     $RISK_PORT"
    echo "  Payment Gateway: $PAYMENT_PORT"
    echo "  Audit Service:   $AUDIT_PORT"
}

# 測試服務健康檢查
test_health_checks() {
    log_info "測試服務健康檢查..."
    
    services=(
        "trading-api-service:8080"
        "risk-engine-service:8081"
        "payment-gateway-service:8082"
        "audit-service-service:8083"
    )
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"
        
        # 使用kubectl port-forward測試
        if kubectl get svc $service -n fintech-demo > /dev/null 2>&1; then
            log_info "測試 $service 健康檢查..."
            
            # 啟動port-forward在後台
            kubectl port-forward -n fintech-demo svc/$service $port:$port > /dev/null 2>&1 &
            PF_PID=$!
            
            # 等待端口轉發建立
            sleep 3
            
            # 測試健康檢查端點
            if curl -s -f http://localhost:$port/health > /dev/null 2>&1; then
                log_success "$service 健康檢查通過"
            else
                log_warning "$service 健康檢查失敗或超時"
            fi
            
            # 停止port-forward
            kill $PF_PID > /dev/null 2>&1 || true
            sleep 1
        else
            log_warning "服務 $service 不存在"
        fi
    done
}

# 檢查監控服務
check_monitoring() {
    log_info "檢查監控服務..."
    
    # Prometheus
    PROMETHEUS_STATUS=$(kubectl get pods -n fintech-demo -l app=prometheus -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "NotFound")
    if [[ "$PROMETHEUS_STATUS" == "Running" ]]; then
        log_success "Prometheus運行正常"
    else
        log_warning "Prometheus狀態: $PROMETHEUS_STATUS"
    fi
    
    # Grafana
    GRAFANA_STATUS=$(kubectl get pods -n fintech-demo -l app=grafana -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "NotFound")
    if [[ "$GRAFANA_STATUS" == "Running" ]]; then
        log_success "Grafana運行正常"
    else
        log_warning "Grafana狀態: $GRAFANA_STATUS"
    fi
}

# 檢查安全策略
check_security_policies() {
    log_info "檢查安全策略..."
    
    # 檢查NetworkPolicies
    NETPOL_COUNT=$(kubectl get networkpolicies -n fintech-demo --no-headers 2>/dev/null | wc -l)
    log_info "NetworkPolicies數量: $NETPOL_COUNT"
    
    # 檢查RBAC
    RBAC_COUNT=$(kubectl get clusterroles | grep -c fintech || echo "0")
    log_info "相關ClusterRoles數量: $RBAC_COUNT"
    
    # 檢查ServiceAccounts
    SA_COUNT=$(kubectl get serviceaccounts -n fintech-demo --no-headers | wc -l)
    log_info "ServiceAccounts數量: $SA_COUNT"
}

# 檢查資源使用情況
check_resources() {
    log_info "檢查資源使用情況..."
    
    echo "Pod資源使用："
    kubectl top pods -n fintech-demo 2>/dev/null || log_warning "metrics-server未安裝，無法獲取資源使用情況"
    
    echo ""
    echo "節點資源使用："
    kubectl top nodes 2>/dev/null || log_warning "metrics-server未安裝，無法獲取節點資源使用"
}

# 顯示部署摘要
show_summary() {
    echo ""
    log_info "🎯 部署摘要"
    echo "========================================"
    
    # Pod統計
    TOTAL_PODS=$(kubectl get pods -n fintech-demo --no-headers | wc -l)
    RUNNING_PODS=$(kubectl get pods -n fintech-demo --field-selector=status.phase=Running --no-headers | wc -l)
    
    echo "📊 Pod狀態: $RUNNING_PODS/$TOTAL_PODS 運行中"
    
    # 服務統計  
    TOTAL_SERVICES=$(kubectl get services -n fintech-demo --no-headers | wc -l)
    echo "🔗 服務數量: $TOTAL_SERVICES"
    
    # Tetragon事件
    echo ""
    echo "🔍 Tetragon監控:"
    echo "  查看實時事件: kubectl logs -f -n kube-system -l app.kubernetes.io/name=tetragon"
    echo "  查看策略: kubectl get tracingpolicies -A"
    
    echo ""
    echo "🧪 測試命令："
    echo "  健康檢查: curl http://localhost:30080/health"
    echo "  創建訂單: curl -X POST http://localhost:30080/api/v1/orders -d '{\"symbol\":\"AAPL\",\"side\":\"buy\",\"order_type\":\"market\",\"quantity\":100}' -H 'Content-Type: application/json'"
    echo "  安全測試: curl -X POST http://localhost:30080/debug/execute -d '{\"command\":\"ls\",\"args\":[\"-la\"]}' -H 'Content-Type: application/json'"
    
    echo "========================================"
}

# 主函數
main() {
    log_info "🔍 開始驗證金融微服務eBPF演示環境部署"
    echo "========================================"
    
    check_cluster
    echo ""
    
    check_cilium
    echo ""
    
    check_tetragon  
    echo ""
    
    check_namespace
    echo ""
    
    check_database
    echo ""
    
    check_microservices
    echo ""
    
    check_services
    echo ""
    
    test_health_checks
    echo ""
    
    check_monitoring
    echo ""
    
    check_security_policies
    echo ""
    
    check_resources
    echo ""
    
    show_summary
    
    log_success "✅ 部署驗證完成！"
}

# 執行主函數
main 