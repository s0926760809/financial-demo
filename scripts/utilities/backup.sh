#!/bin/bash

# 系統備份腳本
# 版本: v1.0.0
# 用途: 創建完整的系統備份，包含配置、日誌和重要文件

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="fintech_ebpf_backup_$TIMESTAMP"
FULL_BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

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

# 創建備份目錄
create_backup_dir() {
    log "創建備份目錄: $FULL_BACKUP_PATH"
    mkdir -p "$FULL_BACKUP_PATH"
}

# 備份前端文件
backup_frontend() {
    log "備份前端文件..."
    
    if [ -d "frontend" ]; then
        mkdir -p "$FULL_BACKUP_PATH/frontend"
        
        # 備份源代碼
        cp -r frontend/src "$FULL_BACKUP_PATH/frontend/"
        cp -r frontend/public "$FULL_BACKUP_PATH/frontend/"
        
        # 備份配置文件
        cp frontend/package.json "$FULL_BACKUP_PATH/frontend/" 2>/dev/null || warn "package.json 不存在"
        cp frontend/vite.config.ts "$FULL_BACKUP_PATH/frontend/" 2>/dev/null || warn "vite.config.ts 不存在"
        cp frontend/tsconfig.json "$FULL_BACKUP_PATH/frontend/" 2>/dev/null || warn "tsconfig.json 不存在"
        cp frontend/index.html "$FULL_BACKUP_PATH/frontend/" 2>/dev/null || warn "index.html 不存在"
        
        log "前端文件備份完成"
    else
        warn "前端目錄不存在，跳過"
    fi
}

# 備份後端文件
backup_backend() {
    log "備份後端文件..."
    
    if [ -d "backend" ]; then
        mkdir -p "$FULL_BACKUP_PATH/backend"
        
        # 備份各個微服務
        for service in trading-api risk-engine payment-gateway audit-service; do
            if [ -d "backend/$service" ]; then
                mkdir -p "$FULL_BACKUP_PATH/backend/$service"
                
                # 備份源代碼
                find "backend/$service" -name "*.go" -exec cp {} "$FULL_BACKUP_PATH/backend/$service/" \; 2>/dev/null || true
                
                # 備份配置文件
                cp "backend/$service/config.yaml" "$FULL_BACKUP_PATH/backend/$service/" 2>/dev/null || true
                cp "backend/$service/go.mod" "$FULL_BACKUP_PATH/backend/$service/" 2>/dev/null || true
                cp "backend/$service/go.sum" "$FULL_BACKUP_PATH/backend/$service/" 2>/dev/null || true
                
                # 備份二進制文件
                cp "backend/$service/$service" "$FULL_BACKUP_PATH/backend/$service/" 2>/dev/null || true
                cp "backend/$service/main" "$FULL_BACKUP_PATH/backend/$service/" 2>/dev/null || true
                
                log "服務 $service 備份完成"
            fi
        done
        
        log "後端文件備份完成"
    else
        warn "後端目錄不存在，跳過"
    fi
}

# 備份腳本
backup_scripts() {
    log "備份腳本文件..."
    
    if [ -d "scripts" ]; then
        cp -r scripts "$FULL_BACKUP_PATH/"
        log "腳本文件備份完成"
    else
        warn "腳本目錄不存在，跳過"
    fi
}

# 備份配置文件
backup_configs() {
    log "備份配置文件..."
    
    mkdir -p "$FULL_BACKUP_PATH/configs"
    
    # 備份根目錄配置文件
    cp *.md "$FULL_BACKUP_PATH/configs/" 2>/dev/null || warn "沒有 Markdown 文件需要備份"
    cp *.json "$FULL_BACKUP_PATH/configs/" 2>/dev/null || warn "沒有 JSON 配置文件"
    cp *.yaml "$FULL_BACKUP_PATH/configs/" 2>/dev/null || warn "沒有 YAML 配置文件"
    cp *.yml "$FULL_BACKUP_PATH/configs/" 2>/dev/null || warn "沒有 YML 配置文件"
    cp .gitignore "$FULL_BACKUP_PATH/configs/" 2>/dev/null || warn ".gitignore 不存在"
    
    # 備份重要的SQL文件
    cp *.sql "$FULL_BACKUP_PATH/configs/" 2>/dev/null || warn "沒有 SQL 文件需要備份"
    
    log "配置文件備份完成"
}

# 備份日誌（最近的）
backup_logs() {
    log "備份日誌文件..."
    
    if [ -d "logs" ]; then
        mkdir -p "$FULL_BACKUP_PATH/logs"
        
        # 只備份最近100行的日誌文件
        for log_file in logs/*.log; do
            if [ -f "$log_file" ]; then
                tail -100 "$log_file" > "$FULL_BACKUP_PATH/logs/$(basename "$log_file")"
            fi
        done
        
        # 備份所有PID文件
        cp logs/*.pid "$FULL_BACKUP_PATH/logs/" 2>/dev/null || warn "沒有PID文件需要備份"
        
        log "日誌文件備份完成"
    else
        warn "日誌目錄不存在，跳過"
    fi
}

# 備份測試報告
backup_test_reports() {
    log "備份測試報告..."
    
    if [ -d "scripts/testing/unit-test/reports" ]; then
        mkdir -p "$FULL_BACKUP_PATH/test_reports"
        cp scripts/testing/unit-test/reports/* "$FULL_BACKUP_PATH/test_reports/" 2>/dev/null || warn "沒有測試報告需要備份"
        log "測試報告備份完成"
    else
        warn "測試報告目錄不存在，跳過"
    fi
}

# 創建系統快照信息
create_system_snapshot() {
    log "創建系統快照信息..."
    
    local snapshot_file="$FULL_BACKUP_PATH/system_snapshot.txt"
    
    {
        echo "================================================================"
        echo "金融eBPF演示系統 - 系統快照"
        echo "================================================================"
        echo "備份時間: $(date)"
        echo "備份名稱: $BACKUP_NAME"
        echo "系統信息: $(uname -a)"
        echo "主機名稱: $(hostname)"
        echo "用戶: $(whoami)"
        echo ""
        
        echo "Git狀態:"
        git status 2>/dev/null || echo "不是Git倉庫或Git不可用"
        echo ""
        
        echo "最近的Git提交:"
        git log --oneline -5 2>/dev/null || echo "沒有Git提交歷史"
        echo ""
        
        echo "運行中的服務:"
        ps aux | grep -E "(trading-api|risk-engine|payment-gateway|audit-service)" | grep -v grep || echo "沒有發現運行中的服務"
        echo ""
        
        echo "端口使用情況:"
        netstat -an | grep LISTEN | grep -E "(3000|30080|30081|30082|30083)" || echo "沒有發現相關端口"
        echo ""
        
        echo "磁盤使用情況:"
        df -h .
        echo ""
        
        echo "目錄大小:"
        du -sh . 2>/dev/null
        du -sh logs 2>/dev/null || echo "logs: 目錄不存在"
        du -sh frontend/node_modules 2>/dev/null || echo "frontend/node_modules: 目錄不存在"
        echo ""
        
    } > "$snapshot_file"
    
    log "系統快照創建完成: $snapshot_file"
}

# 創建壓縮包
create_archive() {
    log "創建壓縮包..."
    
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    
    # 獲取壓縮包大小
    local archive_size=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
    
    log "壓縮包創建完成: ${BACKUP_NAME}.tar.gz ($archive_size)"
    
    # 刪除原始備份目錄
    rm -rf "$BACKUP_NAME"
    
    cd ..
}

# 清理舊備份
cleanup_old_backups() {
    log "清理舊備份..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # 保留最近5個備份
        local backup_count=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
        
        if [ "$backup_count" -gt 5 ]; then
            log "發現 $backup_count 個備份，保留最新5個"
            ls -1t "$BACKUP_DIR"/*.tar.gz | tail -n +6 | xargs rm -f
            log "舊備份清理完成"
        else
            log "備份數量 ($backup_count) 在限制範圍內，無需清理"
        fi
    fi
}

# 生成恢復腳本
generate_restore_script() {
    log "生成恢復腳本..."
    
    local restore_script="$BACKUP_DIR/restore_${BACKUP_NAME}.sh"
    
    cat > "$restore_script" << 'EOF'
#!/bin/bash

# 自動生成的恢復腳本
# 使用方法: ./restore_xxx.sh [目標目錄]

set -e

BACKUP_ARCHIVE="$(basename "$0" .sh | sed 's/restore_//')"
TARGET_DIR="${1:-.}"

echo "正在恢復備份: ${BACKUP_ARCHIVE}.tar.gz"
echo "目標目錄: $TARGET_DIR"

if [ ! -f "${BACKUP_ARCHIVE}.tar.gz" ]; then
    echo "錯誤: 備份文件 ${BACKUP_ARCHIVE}.tar.gz 不存在"
    exit 1
fi

# 創建目標目錄
mkdir -p "$TARGET_DIR"

# 解壓備份
tar -xzf "${BACKUP_ARCHIVE}.tar.gz" -C "$TARGET_DIR"

echo "備份恢復完成到: $TARGET_DIR/${BACKUP_ARCHIVE}"
echo "請手動檢查並移動文件到合適的位置"
EOF
    
    chmod +x "$restore_script"
    log "恢復腳本創建完成: $restore_script"
}

# 主函數
main() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 金融eBPF演示系統備份工具                    ║${NC}"
    echo -e "${GREEN}║                      v1.0.0                                 ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    info "開始創建系統備份..."
    info "備份名稱: $BACKUP_NAME"
    echo ""
    
    # 執行備份流程
    create_backup_dir
    backup_frontend
    backup_backend
    backup_scripts
    backup_configs
    backup_logs
    backup_test_reports
    create_system_snapshot
    create_archive
    cleanup_old_backups
    generate_restore_script
    
    echo ""
    log "備份完成！"
    echo "────────────────────────────────────"
    echo "備份文件: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    echo "恢復腳本: $BACKUP_DIR/restore_${BACKUP_NAME}.sh"
    echo "檢查備份:"
    echo "  ls -la $BACKUP_DIR/"
    echo "  tar -tzf $BACKUP_DIR/${BACKUP_NAME}.tar.gz | head"
    echo "────────────────────────────────────"
    echo ""
}

# 顯示使用說明
show_help() {
    echo "金融eBPF演示系統備份工具"
    echo ""
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -h, --help    顯示此幫助信息"
    echo ""
    echo "功能:"
    echo "  - 備份前端源代碼和配置"
    echo "  - 備份後端微服務代碼"
    echo "  - 備份所有腳本和工具"
    echo "  - 備份配置文件和文檔"
    echo "  - 備份最近的日誌文件"
    echo "  - 備份測試報告"
    echo "  - 創建系統快照信息"
    echo "  - 生成對應的恢復腳本"
    echo ""
    echo "備份位置: $BACKUP_DIR/"
    echo "自動清理: 保留最新5個備份"
}

# 參數處理
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac 