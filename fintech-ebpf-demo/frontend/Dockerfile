# 金融微服務前端 Dockerfile
# 多階段構建，優化鏡像大小

# 構建階段
FROM node:18-alpine AS builder

# 設置工作目錄
WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝所有依賴（包括 devDependencies 用於建置）
RUN npm install && npm cache clean --force

# 複製源代碼
COPY . .

# 修復 Rollup 可選依賴問題並構建應用
RUN rm -rf node_modules/.vite && \
    npm install && \
    npm run build

# 生產階段
FROM nginx:alpine AS production

# 安裝必要的工具
RUN apk add --no-cache curl

# 複製自定義 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 複製構建產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 創建非root用戶
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001

# 故意暴露一些敏感信息用於演示
COPY --from=builder /app/package.json /usr/share/nginx/html/package.json
RUN echo "demo_api_key_12345" > /usr/share/nginx/html/api-key.txt
RUN echo "admin_token_67890" > /usr/share/nginx/html/admin-token.txt

# 設置權限
RUN chown -R frontend:frontend /usr/share/nginx/html && \
    chown -R frontend:frontend /var/cache/nginx && \
    chown -R frontend:frontend /var/log/nginx && \
    chown -R frontend:frontend /etc/nginx/conf.d

# 故意使用 root 權限運行（不安全演示）
# USER frontend

# 暴露端口
EXPOSE 80

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"] 