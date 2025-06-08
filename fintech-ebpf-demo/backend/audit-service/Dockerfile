# 多階段構建
FROM golang:1.23-alpine AS builder

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
RUN echo "audit_service:audit_admin_pass" > /root/.credentials
RUN echo "postgres://audit:auditpass@localhost:5432/audit_db" > /root/.db_connection
RUN echo "audit_encryption_key=AuditKey123456789" > /root/.audit_keys
RUN chmod 600 /root/.credentials /root/.db_connection /root/.audit_keys

# 創建審計目錄和敏感配置
RUN mkdir -p /var/log/audit
RUN echo "sensitive_operations:" > /root/audit_config.yaml
RUN echo "  - admin_access" >> /root/audit_config.yaml
RUN echo "  - data_export" >> /root/audit_config.yaml
RUN echo "retention_policy: 7_years" >> /root/audit_config.yaml

# 添加一些假的歷史日誌文件
RUN echo '{"user":"admin","action":"login","timestamp":"2023-12-01T10:00:00Z","ip":"192.168.1.1"}' > /var/log/audit/admin_access.log
RUN echo '{"user":"user_123","action":"large_transfer","amount":1000000,"timestamp":"2023-12-01T11:00:00Z"}' >> /var/log/audit/admin_access.log

EXPOSE 8083

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8083/health || exit 1

ENV GIN_MODE=release

CMD ["./main"] 