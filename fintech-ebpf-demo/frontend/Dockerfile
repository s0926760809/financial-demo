# 金融微服務前端 Dockerfile
# 多階段構建，優化鏡像大小

# 構建階段
FROM node:18-alpine AS builder

# 安裝構建工具和Python（某些npm包需要）
RUN apk add --no-cache python3 make g++

# 創建用戶
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001

# 設置工作目錄
WORKDIR /app

# 複製package.json和package-lock.json
COPY package*.json ./

# 安裝依賴並清理緩存
RUN npm install && \
    npm cache clean --force

# 複製源代碼
COPY . .

# 設置構建參數
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 構建應用
RUN npm run build

# 生產階段
FROM nginx:1.25-alpine AS production

# 安裝必要工具
RUN apk add --no-cache curl dumb-init

# 創建非root用戶
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001

# 複製自定義 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 設置 nginx 權限
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R frontend:frontend /var/cache/nginx && \
    chown -R frontend:frontend /var/log/nginx && \
    chown -R frontend:frontend /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown frontend:frontend /var/run/nginx.pid

# 複製構建產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 故意暴露一些敏感信息用於eBPF演示
COPY --from=builder /app/package.json /usr/share/nginx/html/package.json
RUN echo "demo_api_key_12345" > /usr/share/nginx/html/api-key.txt
RUN echo "admin_token_67890" > /usr/share/nginx/html/admin-token.txt
RUN echo '{"database_url":"postgresql://user:password@db:5432/fintech","secret_key":"super_secret_key_123"}' > /usr/share/nginx/html/config.json

# 設置HTML目錄權限
RUN chown -R frontend:frontend /usr/share/nginx/html

# 切換到非root用戶
USER frontend

# 暴露端口
EXPOSE 8080

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# 使用dumb-init啟動nginx
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"] 