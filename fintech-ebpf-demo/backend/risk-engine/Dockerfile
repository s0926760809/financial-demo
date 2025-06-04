# 多階段構建
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# 最終鏡像
FROM alpine:latest

RUN apk --no-cache add ca-certificates curl

WORKDIR /root/

COPY --from=builder /app/main .

# 故意添加敏感文件用於演示
RUN echo "risk_engine:secret123" > /root/.credentials
RUN echo "postgres://risk_user:risk_pass@localhost:5432/risk_db" > /root/.db_connection
RUN echo "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7..." > /root/.private_key
RUN chmod 600 /root/.credentials /root/.db_connection /root/.private_key

# 創建風險配置文件
RUN echo "high_risk_users: [user_123, user_456]" > /root/risk_config.yaml
RUN echo "trading_limits: max_daily: 1000000" >> /root/risk_config.yaml

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1

ENV GIN_MODE=release

CMD ["./main"] 