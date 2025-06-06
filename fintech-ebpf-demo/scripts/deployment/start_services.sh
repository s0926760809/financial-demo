#!/bin/bash

# 金融eBPF演示系統 - 服務啟動腳本
# 版本: v3.0.0
# 更新時間: 2025/01/06

set -e  # 出錯時退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO:${NC} $1"
}

# 檢查端口是否被佔用
check_port() {
    local port=$1
    local service=$2
    if lsof -ti:$port >/dev/null 2>&1; then
        warn "端口 $port 已被佔用 ($service)，嘗試停止現有服務..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# 等待服務啟動
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    info "等待 $service_name 服務啟動..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log "$service_name 服務已啟動 ✓"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    error "$service_name 服務啟動失敗"
    return 1
}

# 構建Go服務
build_go_service() {
    local service_dir=$1
    local service_name=$2
    
    info "構建 $service_name..."
    cd "$service_dir"
    if [ -f "go.mod" ]; then
        go mod tidy >/dev/null 2>&1
        go build -o "$service_name" . >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            log "$service_name 構建成功"
        else
            error "$service_name 構建失敗"
            return 1
        fi
    else
        error "$service_dir 中未找到 go.mod 文件"
        return 1
    fi
    cd - >/dev/null
    return 0
}

# 主函數
main() {
    log "🚀 開始啟動金融eBPF演示系統..."
    
    # 檢查並創建日誌目錄
    mkdir -p logs
    
    # 檢查端口並停止衝突服務
    info "檢查端口狀態..."
    check_port 30080 "Trading API"
    check_port 30081 "Risk API" 
    check_port 30082 "Payment API"
    check_port 30083 "Audit API"
    check_port 3000 "Frontend"
    
    # 啟動後端API服務
    log "啟動後端API服務..."
    
    # 啟動 Trading API (端口 30080)
    info "啟動 Trading API..."
    if build_go_service "backend/trading-api" "trading-api"; then
        cd backend/trading-api
        nohup ./trading-api > ../../logs/trading-api.log 2>&1 &
        TRADING_PID=$!
        echo $TRADING_PID > ../../logs/trading-api.pid
        cd ../..
        
        # 等待 Trading API 啟動
        if wait_for_service "http://localhost:30080/health" "Trading API"; then
            log "Trading API 已啟動 (PID: $TRADING_PID)"
        else
            error "Trading API 啟動失敗，檢查日誌: logs/trading-api.log"
            exit 1
        fi
    else
        error "Trading API 構建失敗"
        exit 1
    fi
    
    # 啟動 Risk API (端口 30081)
    info "啟動 Risk API..."
    if build_go_service "backend/risk-engine" "risk-engine"; then
        cd backend/risk-engine
        nohup ./risk-engine > ../../logs/risk-api.log 2>&1 &
        RISK_PID=$!
        echo $RISK_PID > ../../logs/risk-api.pid
        cd ../..
        log "Risk API 已啟動 (PID: $RISK_PID)"
    else
        warn "Risk API 構建失敗，跳過啟動"
    fi
    
    # 啟動 Payment API (端口 30082)
    info "啟動 Payment API..."
    if build_go_service "backend/payment-gateway" "payment-gateway"; then
        cd backend/payment-gateway
        nohup ./payment-gateway > ../../logs/payment-api.log 2>&1 &
        PAYMENT_PID=$!
        echo $PAYMENT_PID > ../../logs/payment-api.pid
        cd ../..
        log "Payment API 已啟動 (PID: $PAYMENT_PID)"
    else
        warn "Payment API 構建失敗，跳過啟動"
    fi
    
    # 啟動 Audit API (端口 30083)
    info "啟動 Audit API..."
    if build_go_service "backend/audit-service" "audit-service"; then
        cd backend/audit-service
        nohup ./audit-service > ../../logs/audit-api.log 2>&1 &
        AUDIT_PID=$!
        echo $AUDIT_PID > ../../logs/audit-api.pid
        cd ../..
        log "Audit API 已啟動 (PID: $AUDIT_PID)"
    else
        warn "Audit API 構建失敗，跳過啟動"
    fi
    
    # 等待其他服務啟動
    sleep 3
    
    # 啟動前端應用
    log "啟動前端應用..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        info "安裝前端依賴..."
        npm install >/dev/null 2>&1
    fi
    
    # 使用正確的前端啟動命令
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    cd ..
    
    # 等待前端啟動
    if wait_for_service "http://localhost:3000" "Frontend"; then
        log "Frontend 已啟動 (PID: $FRONTEND_PID)"
    else
        error "Frontend 啟動失敗，檢查日誌: logs/frontend.log"
    fi
    
    # 服務狀態檢查
    log "檢查服務狀態..."
    sleep 5
    
    # 檢查各項服務
    check_service_status() {
        local url=$1
        local name=$2
        if curl -s "$url" >/dev/null 2>&1; then
            log "$name: ✅ 運行中"
        else
            warn "$name: ❌ 未響應"
        fi
    }
    
    check_service_status "http://localhost:30080/health" "Trading API"
    check_service_status "http://localhost:30081/health" "Risk API"
    check_service_status "http://localhost:30082/health" "Payment API"
    check_service_status "http://localhost:30083/health" "Audit API"
    check_service_status "http://localhost:3000" "Frontend"
    
    # 顯示服務信息
    echo ""
    log "🎉 系統啟動完成！"
    echo ""
    info "服務地址:"
    echo "  💻 Web應用:     http://localhost:3000"
    echo "  📊 Trading API: http://localhost:30080"
    echo "  ⚠️  Risk API:   http://localhost:30081" 
    echo "  💳 Payment API: http://localhost:30082"
    echo "  📝 Audit API:   http://localhost:30083"
    echo ""
    info "特色功能:"
    echo "  🔐 Tetragon eBPF 安全監控"
    echo "  📈 實時金融數據"
    echo "  🌙 暗色/亮色主題切換"
    echo "  🚨 可控的安全告警系統"
    echo ""
    info "日誌位置: logs/ 目錄"
    info "停止系統: ./stop_services.sh"
    echo ""
    log "系統已就緒！請訪問 http://localhost:3000 開始使用"
}

# 執行主函數
main "$@" 