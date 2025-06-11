# 金融微服務前端 Dockerfile
# 多階段構建，優化鏡像大小和安全性

# 構建階段
FROM node:18-alpine AS builder

# 安裝必要的構建工具
RUN apk add --no-cache python3 make g++

# 設置工作目錄
WORKDIR /app

# 創建非root用戶
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001 -G frontend

# 複製 package 文件（利用 Docker 緩存）
COPY package*.json ./

# 安裝依賴並清理緩存
RUN npm ci --only=production --ignore-scripts && \
    npm install --save-dev && \
    npm cache clean --force

# 改變文件所有權到非root用戶
RUN chown -R frontend:frontend /app
USER frontend

# 複製源代碼
COPY --chown=frontend:frontend . .

# 設置環境變量
ARG VITE_API_BASE_URL=/api
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 構建應用
RUN npm run build

# 生產階段
FROM nginx:1.25-alpine AS production

# 安裝必要的工具
RUN apk add --no-cache curl dumb-init

# 創建非root用戶
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001 -G frontend

# 複製自定義 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 創建必要的目錄並設置權限
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    /var/log/nginx \
    /var/run && \
    touch /var/run/nginx.pid

# 複製構建產物
COPY --from=builder --chown=frontend:frontend /app/dist /usr/share/nginx/html

# 故意暴露一些敏感信息用於演示 (保持原有的安全演示功能)
COPY --from=builder --chown=frontend:frontend /app/package.json /usr/share/nginx/html/package.json
RUN echo "demo_api_key_12345" > /usr/share/nginx/html/api-key.txt && \
    echo "admin_token_67890" > /usr/share/nginx/html/admin-token.txt

# 設置權限
RUN chown -R frontend:frontend /usr/share/nginx/html \
    /var/cache/nginx \
    /var/log/nginx \
    /etc/nginx/conf.d \
    /var/run/nginx.pid && \
    chmod -R 755 /usr/share/nginx/html

# 切換到非root用戶 (修復安全問題)
USER frontend

# 暴露端口
EXPOSE 8080

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 使用 dumb-init 作為 PID 1 來處理信號
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"] 