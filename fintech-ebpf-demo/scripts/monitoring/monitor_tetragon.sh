#!/bin/bash

# Tetragon eBPF 監控腳本
# 版本: v1.0.0
# 用途: 實時監控Tetragon事件流

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
TETRAGON_API="http://localhost:30080/api/v1/tetragon"
LOG_FILE="logs/tetragon_monitor.log"
PID_FILE="logs/tetragon_monitor.pid"

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

# 檢查Tetragon API可用性
check_tetragon_api() {
    log "檢查Tetragon API連接..."
    if curl -s "${TETRAGON_API}/statistics" >/dev/null 2>&1; then
        log "Tetragon API 連接正常"
        return 0
    else
        error "Tetragon API 連接失敗"
        return 1
    fi
}

# 獲取Tetragon統計信息
get_statistics() {
    log "獲取Tetragon統計信息..."
    curl -s "${TETRAGON_API}/statistics" | jq '.'
}

# 實時監控事件流
monitor_events() {
    log "開始實時監控Tetragon事件..."
    log "按 Ctrl+C 停止監控"
    
    while true; do
        events=$(curl -s "${TETRAGON_API}/events" | jq -r '.events[]? | "\(.timestamp) [\(.severity)] \(.process_name): \(.description)"')
        
        if [ -n "$events" ]; then
            echo "$events" | while read -r event; do
                if [[ "$event" == *"CRITICAL"* ]]; then
                    echo -e "${RED}🚨 $event${NC}"
                elif [[ "$event" == *"HIGH"* ]]; then
                    echo -e "${YELLOW}⚠️ $event${NC}"
                else
                    echo -e "${GREEN}ℹ️ $event${NC}"
                fi
            done
        fi
        
        sleep 2
    done
}

# 生成監控報告
generate_report() {
    local output_file="reports/tetragon_report_$(date +%Y%m%d_%H%M%S).json"
    mkdir -p reports
    
    log "生成Tetragon監控報告: $output_file"
    
    {
        echo "{"
        echo "  \"timestamp\": \"$(date -Iseconds)\","
        echo "  \"statistics\": $(curl -s "${TETRAGON_API}/statistics"),"
        echo "  \"recent_events\": $(curl -s "${TETRAGON_API}/events")"
        echo "}"
    } > "$output_file"
    
    log "報告已生成: $output_file"
}

# 主函數
main() {
    case "${1:-monitor}" in
        monitor)
            check_tetragon_api && monitor_events
            ;;
        stats)
            check_tetragon_api && get_statistics
            ;;
        report)
            check_tetragon_api && generate_report
            ;;
        *)
            echo "用法: $0 [monitor|stats|report]"
            echo "  monitor - 實時監控事件流 (默認)"
            echo "  stats   - 顯示統計信息"
            echo "  report  - 生成監控報告"
            ;;
    esac
}

# 信號處理
trap 'log "監控已停止"; exit 0' SIGINT SIGTERM

main "$@" 