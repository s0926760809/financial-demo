# 路由配置驗證

## 前端API配置
- **Base URL**: `/api/v1` (VITE_API_BASE_URL=/api)
- **Security Test**: `POST /api/v1/security/test/{endpoint}`
- **WebSocket**: `/ws/events`

## Nginx.conf 路由配置
```nginx
location ^~ /api/v1/ {
    # 路由到trading-api-service:8080
    location ~ ^/api/v1/(orders|portfolio|trades|user|system|market|trading)(/.*)?$ { ... }
    location ~ ^/api/v1/tetragon(/.*)?$ { ... }
    location ~ ^/api/v1/security(/.*)?$ { ... }
}

location ^~ /api/risk/ {
    # 路由到risk-engine-service:8081
}

location ^~ /api/payment/ {
    # 路由到payment-gateway-service:8082
}

location ^~ /api/audit/ {
    # 路由到audit-service-service:8083
}

location /ws/ {
    # WebSocket路由到audit-service-service:8083
}
```

## Ingress 路由配置
```yaml
paths:
  - path: /api/v1          # -> trading-api-service:8080
  - path: /api/risk        # -> risk-engine-service:8081
  - path: /api/payment     # -> payment-gateway-service:8082
  - path: /api/audit       # -> audit-service-service:8083
  - path: /ws              # -> audit-service-service:8083
  - path: /                # -> frontend:8080 (default)
```

## 服務配置
```yaml
backendServices:
  - name: trading-api      # -> trading-api-service:8080
  - name: risk-engine      # -> risk-engine-service:8081
  - name: payment-gateway  # -> payment-gateway-service:8082
  - name: audit-service    # -> audit-service-service:8083
```

## 預期的API調用路徑
1. **前端 → Ingress → Frontend Service → Nginx → Backend Services**
2. **外部 → Ingress → Backend Services (直接)**

## 驗證要點
✅ 前端使用 `/api/v1` 作為base URL
✅ Nginx 正確配置 `/api/v1/` 路由到 trading-api
✅ Ingress 配置 `/api/v1` 優先路由
✅ 所有API路徑匹配一致
✅ WebSocket 路由配置正確
✅ 前端環境變數 `VITE_API_BASE_URL=/api` 設定正確 