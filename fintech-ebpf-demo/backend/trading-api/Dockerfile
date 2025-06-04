# 多階段構建
FROM golang:1.21-alpine AS builder

# 安裝必要的工具
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# 複製go mod文件
COPY go.mod go.sum ./
RUN go mod download

# 複製源代碼
COPY . .

# 構建應用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# 最終鏡像
FROM alpine:latest

# 安裝必要的運行時依賴
RUN apk --no-cache add ca-certificates curl

WORKDIR /root/

# 從builder階段複製編譯好的二進制文件
COPY --from=builder /app/main .

# 複製配置文件
COPY config/ ./config/

# 故意添加一些敏感文件用於安全演示
RUN echo "admin:admin123" > /root/.credentials
RUN echo "postgres://admin:password123@localhost:5432/trading" > /root/.db_connection
RUN echo "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7..." > /root/.private_key
RUN chmod 600 /root/.credentials /root/.db_connection /root/.private_key

# 創建非特權用戶（但故意使用root運行以展示安全問題）
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# 故意保持root權限運行 - 安全風險
# USER appuser

# 暴露端口
EXPOSE 8080

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# 設置環境變量
ENV GIN_MODE=release
ENV LOG_LEVEL=info

# 運行應用
CMD ["./main"] 