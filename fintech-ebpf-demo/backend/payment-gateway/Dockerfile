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

RUN apk --no-cache add ca-certificates curl dig

WORKDIR /root/

COPY --from=builder /app/main .

# 故意添加敏感文件用於演示
RUN echo "payment_gateway:payment_secret" > /root/.credentials
RUN echo "stripe_secret_key=sk_live_51234567890abcdef" > /root/.payment_keys
RUN echo "paypal_client_secret=EBPaypal123Secret456" >> /root/.payment_keys
RUN echo "postgres://payment:paypass@localhost:5432/payments" > /root/.db_connection
RUN chmod 600 /root/.credentials /root/.payment_keys /root/.db_connection

# 創建支付配置文件
RUN echo "fraud_detection_rules:" > /root/payment_config.yaml
RUN echo "  - max_amount: 50000" >> /root/payment_config.yaml
RUN echo "  - blacklist_countries: [NK, IR]" >> /root/payment_config.yaml

EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8082/health || exit 1

ENV GIN_MODE=release

CMD ["./main"] 