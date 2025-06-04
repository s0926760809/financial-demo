#!/bin/bash

# 金融微服務eBPF演示系統 - 強制停止腳本
# 版本: 1.0
# 無需確認，立即停止所有服務

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}🛑 強制停止金融微服務系統...${NC}"

# 通過端口強制停止進程
ports=(30080 8081 8082 8083 5173)
stopped_count=0

for port in "${ports[@]}"; do
    pid=$(lsof -ti ":$port" 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}🔫 殺死端口 $port 的進程 (PID: $pid)${NC}"
        kill -9 "$pid" 2>/dev/null
        ((stopped_count++))
    fi
done

# 通過進程名稱強制停止
process_patterns=("trading-api" "node.*vite" "go.*main.go")

for pattern in "${process_patterns[@]}"; do
    pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        for pid in $pids; do
            echo -e "${YELLOW}🔫 殺死進程: $pattern (PID: $pid)${NC}"
            kill -9 "$pid" 2>/dev/null
            ((stopped_count++))
        done
    fi
done

# 清理 PID 文件
if [ -d "logs" ]; then
    rm -f logs/*.pid
    echo -e "${GREEN}🧹 清理 PID 文件${NC}"
fi

# 清理編譯的二進制文件
if [ -f "backend/trading-api/trading-api" ]; then
    rm -f backend/trading-api/trading-api
    echo -e "${GREEN}🧹 清理二進制文件${NC}"
fi

if [ $stopped_count -eq 0 ]; then
    echo -e "${GREEN}✅ 沒有找到運行中的服務${NC}"
else
    echo -e "${GREEN}✅ 強制停止了 $stopped_count 個進程${NC}"
fi

echo -e "${GREEN}🏁 強制停止完成！${NC}" 