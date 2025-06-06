#!/bin/bash

# 系統清理腳本
# 版本: v1.0.0
# 用途: 清理日誌、臨時文件和無用數據

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

# 清理日誌文件
cleanup_logs() {
    log "清理日誌文件..."
    
    if [ -d "logs" ]; then
        # 備份最近的日誌
        if [ -f "logs/trading-api.log" ]; then
            tail -100 logs/trading-api.log > logs/trading-api.recent.log
        fi
        
        # 清理舊日誌
        find logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
        
        # 清理大型日誌文件
        for log_file in logs/*.log; do
            if [ -f "$log_file" ] && [ $(wc -l < "$log_file") -gt 1000 ]; then
                tail -500 "$log_file" > "${log_file}.tmp"
                mv "${log_file}.tmp" "$log_file"
                log "截斷大型日誌文件: $(basename "$log_file")"
            fi
        done
        
        log "日誌清理完成"
    else
        warn "日誌目錄不存在"
    fi
}

# 清理臨時文件
cleanup_temp() {
    log "清理臨時文件..."
    
    # 清理Node.js臨時文件
    rm -rf frontend/node_modules/.cache 2>/dev/null || true
    rm -rf backend/node_modules/.cache 2>/dev/null || true
    
    # 清理構建文件
    rm -rf frontend/dist 2>/dev/null || true
    rm -rf frontend/.vite 2>/dev/null || true
    
    # 清理Go編譯文件
    find backend -name "*.exe" -delete 2>/dev/null || true
    find backend -name "main" -delete 2>/dev/null || true
    
    log "臨時文件清理完成"
}

# 清理Docker資源
cleanup_docker() {
    log "清理Docker資源..."
    
    if command -v docker >/dev/null 2>&1; then
        # 清理無用的容器
        docker container prune -f 2>/dev/null || true
        
        # 清理無用的鏡像
        docker image prune -f 2>/dev/null || true
        
        # 清理無用的卷
        docker volume prune -f 2>/dev/null || true
        
        log "Docker資源清理完成"
    else
        warn "Docker未安裝，跳過Docker清理"
    fi
}

# 清理系統緩存
cleanup_cache() {
    log "清理系統緩存..."
    
    # 清理npm緩存
    if command -v npm >/dev/null 2>&1; then
        npm cache clean --force 2>/dev/null || true
    fi
    
    # 清理Go模塊緩存
    if command -v go >/dev/null 2>&1; then
        go clean -modcache 2>/dev/null || true
    fi
    
    log "系統緩存清理完成"
}

# 檢查磁盤使用情況
check_disk_usage() {
    log "檢查磁盤使用情況..."
    
    echo "磁盤使用情況:"
    df -h . | head -2
    
    echo ""
    echo "目錄大小:"
    du -sh . 2>/dev/null
    du -sh logs 2>/dev/null || echo "logs: 目錄不存在"
    du -sh frontend/node_modules 2>/dev/null || echo "frontend/node_modules: 目錄不存在"
    du -sh backend/node_modules 2>/dev/null || echo "backend/node_modules: 目錄不存在"
}

# 安全清理模式
safe_cleanup() {
    log "執行安全清理模式..."
    cleanup_logs
    cleanup_temp
    check_disk_usage
    log "安全清理完成"
}

# 深度清理模式
deep_cleanup() {
    warn "執行深度清理模式..."
    warn "這將清理所有緩存和臨時文件"
    
    read -p "確定要繼續嗎？ (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup_logs
        cleanup_temp
        cleanup_docker
        cleanup_cache
        check_disk_usage
        log "深度清理完成"
    else
        log "取消清理操作"
    fi
}

# 主函數
main() {
    case "${1:-safe}" in
        safe)
            safe_cleanup
            ;;
        deep)
            deep_cleanup
            ;;
        logs)
            cleanup_logs
            ;;
        temp)
            cleanup_temp
            ;;
        docker)
            cleanup_docker
            ;;
        cache)
            cleanup_cache
            ;;
        check)
            check_disk_usage
            ;;
        *)
            echo "用法: $0 [safe|deep|logs|temp|docker|cache|check]"
            echo "  safe   - 安全清理模式 (默認)"
            echo "  deep   - 深度清理模式"
            echo "  logs   - 僅清理日誌"
            echo "  temp   - 僅清理臨時文件"
            echo "  docker - 僅清理Docker資源"
            echo "  cache  - 僅清理緩存"
            echo "  check  - 檢查磁盤使用情況"
            ;;
    esac
}

main "$@" 