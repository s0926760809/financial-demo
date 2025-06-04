# 金融微服務eBPF演示系統 - 完整部署教學

## 目錄
1. [系統概述](#系統概述)
2. [本機啟動方法](#本機啟動方法)
3. [Docker啟動方法](#docker啟動方法)
4. [Container Image打包](#container-image打包)
5. [Kubernetes部署](#kubernetes部署)
6. [常見問題解決](#常見問題解決)

---

## 系統概述

### 系統架構
```
┌─────────────────┐    ┌─────────────────────────────────────────┐
│   前端界面      │    │              後端微服務                 │
│  (React/Vite)   │    │                                         │
│   Port: 5173    │◄───┤ Trading API     Risk Engine            │
└─────────────────┘    │  Port: 30080     Port: 8081            │
                       │                                         │
                       │ Payment Gateway  Audit Service         │
                       │  Port: 8082      Port: 8083            │
                       └─────────────────────────────────────────┘
```

### 技術棧
- **前端**: React 18 + TypeScript + Vite + Ant Design
- **後端**: Go 1.20 + Gin + Redis + PostgreSQL
- **監控**: Prometheus + Grafana + eBPF
- **容器化**: Docker + Kubernetes

---

## 本機啟動方法

### 1. 環境準備

#### 安裝依賴 (macOS)
```bash
# 安裝 Homebrew (如果未安裝)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝必要工具
brew install postgresql@14 redis go node git

# 啟動數據庫服務
brew services start postgresql@14
brew services start redis
```

#### 安裝依賴 (Ubuntu/Debian)
```bash
# 更新包管理器
sudo apt update

# 安裝PostgreSQL 14
sudo apt install -y postgresql-14 postgresql-client-14

# 安裝Redis
sudo apt install -y redis-server

# 安裝Go 1.20
wget https://go.dev/dl/go1.20.linux-amd64.tar.gz
sudo tar -xvf go1.20.linux-amd64.tar.gz -C /usr/local
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 安裝Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 啟動數據庫服務
sudo systemctl start postgresql
sudo systemctl start redis-server
```

### 2. 數據庫初始化

```bash
# 進入項目目錄
cd /path/to/fintech-ebpf-demo

# 創建數據庫
createdb fintech_db

# 初始化數據庫結構和數據
psql -d fintech_db -f init.sql
```

### 3. 啟動後端微服務

#### 方式一：逐個啟動
```bash
# 終端1: Trading API
cd backend/trading-api
DATABASE_HOST=localhost DATABASE_USER=$USER DATABASE_PASSWORD="" DATABASE_NAME=fintech_db REDIS_HOST=localhost REDIS_PASSWORD="" go run main.go

# 終端2: Risk Engine  
cd backend/risk-engine
DATABASE_HOST=localhost DATABASE_USER=$USER DATABASE_PASSWORD="" DATABASE_NAME=fintech_db REDIS_HOST=localhost REDIS_PASSWORD="" go run main.go

# 終端3: Payment Gateway
cd backend/payment-gateway
DATABASE_HOST=localhost DATABASE_USER=$USER DATABASE_PASSWORD="" DATABASE_NAME=fintech_db REDIS_HOST=localhost REDIS_PASSWORD="" go run main.go

# 終端4: Audit Service
cd backend/audit-service
DATABASE_HOST=localhost DATABASE_USER=$USER DATABASE_PASSWORD="" DATABASE_NAME=fintech_db REDIS_HOST=localhost REDIS_PASSWORD="" go run main.go
```

#### 方式二：使用啟動腳本
```bash
# 創建啟動腳本
cat > start_backend.sh << 'EOF'
#!/bin/bash

# 設置環境變量
export DATABASE_HOST=localhost
export DATABASE_USER=$USER
export DATABASE_PASSWORD=""
export DATABASE_NAME=fintech_db
export REDIS_HOST=localhost
export REDIS_PASSWORD=""

# 函數：啟動微服務
start_service() {
    local service=$1
    local port=$2
    echo "啟動 $service 在端口 $port..."
    cd backend/$service
    go run main.go &
    echo $! > /tmp/$service.pid
    cd ../..
}

# 啟動所有微服務
start_service "trading-api" "30080"
start_service "risk-engine" "8081"
start_service "payment-gateway" "8082"
start_service "audit-service" "8083"

echo "所有後端服務已啟動"
echo "使用 './stop_backend.sh' 停止服務"
EOF

chmod +x start_backend.sh
./start_backend.sh
```

#### 停止腳本
```bash
# 創建停止腳本
cat > stop_backend.sh << 'EOF'
#!/bin/bash

services=("trading-api" "risk-engine" "payment-gateway" "audit-service")

for service in "${services[@]}"; do
    if [ -f "/tmp/$service.pid" ]; then
        pid=$(cat /tmp/$service.pid)
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            echo "停止 $service (PID: $pid)"
        fi
        rm -f /tmp/$service.pid
    fi
done

echo "所有後端服務已停止"
EOF

chmod +x stop_backend.sh
```

### 4. 啟動前端

```bash
# 進入前端目錄
cd frontend

# 安裝依賴 (首次運行)
npm install

# 啟動開發服務器
npm run dev
```

### 5. 驗證部署

```bash
# 檢查所有服務狀態
curl http://localhost:30080/health  # Trading API
curl http://localhost:8081/health   # Risk Engine
curl http://localhost:8082/health   # Payment Gateway
curl http://localhost:8083/health   # Audit Service

# 訪問前端界面
open http://localhost:5173
```

---

## Docker啟動方法

### 1. 創建Docker Compose配置

```bash
# 創建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # 數據庫服務
  postgres:
    image: postgres:14
    container_name: fintech_postgres
    environment:
      POSTGRES_DB: fintech_db
      POSTGRES_USER: fintech_user
      POSTGRES_PASSWORD: fintech_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - fintech_network

  redis:
    image: redis:7
    container_name: fintech_redis
    ports:
      - "6379:6379"
    networks:
      - fintech_network

  # 後端微服務
  trading-api:
    build:
      context: ./backend/trading-api
      dockerfile: Dockerfile
    container_name: fintech_trading_api
    ports:
      - "30080:30080"
    environment:
      DATABASE_HOST: postgres
      DATABASE_USER: fintech_user
      DATABASE_PASSWORD: fintech_pass
      DATABASE_NAME: fintech_db
      REDIS_HOST: redis
      REDIS_PASSWORD: ""
    depends_on:
      - postgres
      - redis
    networks:
      - fintech_network

  risk-engine:
    build:
      context: ./backend/risk-engine
      dockerfile: Dockerfile
    container_name: fintech_risk_engine
    ports:
      - "8081:8081"
    environment:
      DATABASE_HOST: postgres
      DATABASE_USER: fintech_user
      DATABASE_PASSWORD: fintech_pass
      DATABASE_NAME: fintech_db
      REDIS_HOST: redis
      REDIS_PASSWORD: ""
    depends_on:
      - postgres
      - redis
    networks:
      - fintech_network

  payment-gateway:
    build:
      context: ./backend/payment-gateway
      dockerfile: Dockerfile
    container_name: fintech_payment_gateway
    ports:
      - "8082:8082"
    environment:
      DATABASE_HOST: postgres
      DATABASE_USER: fintech_user
      DATABASE_PASSWORD: fintech_pass
      DATABASE_NAME: fintech_db
      REDIS_HOST: redis
      REDIS_PASSWORD: ""
    depends_on:
      - postgres
      - redis
    networks:
      - fintech_network

  audit-service:
    build:
      context: ./backend/audit-service
      dockerfile: Dockerfile
    container_name: fintech_audit_service
    ports:
      - "8083:8083"
    environment:
      DATABASE_HOST: postgres
      DATABASE_USER: fintech_user
      DATABASE_PASSWORD: fintech_pass
      DATABASE_NAME: fintech_db
      REDIS_HOST: redis
      REDIS_PASSWORD: ""
    depends_on:
      - postgres
      - redis
    networks:
      - fintech_network

  # 前端服務
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: fintech_frontend
    ports:
      - "5173:5173"
    depends_on:
      - trading-api
      - risk-engine
      - payment-gateway
      - audit-service
    networks:
      - fintech_network

volumes:
  postgres_data:

networks:
  fintech_network:
    driver: bridge
EOF
```

### 2. 啟動Docker環境

```bash
# 構建並啟動所有服務
docker-compose up --build -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f

# 停止所有服務
docker-compose down

# 停止並刪除所有數據
docker-compose down -v
```

### 3. Docker管理命令

```bash
# 重新構建特定服務
docker-compose build trading-api
docker-compose up -d trading-api

# 進入容器調試
docker exec -it fintech_trading_api /bin/sh

# 查看特定服務日誌
docker-compose logs -f trading-api

# 重啟特定服務
docker-compose restart trading-api
```

---

## Container Image打包

### 1. 創建Dockerfile

#### Trading API Dockerfile
```bash
cat > backend/trading-api/Dockerfile << 'EOF'
# 構建階段
FROM golang:1.20-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# 運行階段
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/config ./config

EXPOSE 30080
CMD ["./main"]
EOF
```

#### Risk Engine Dockerfile
```bash
cat > backend/risk-engine/Dockerfile << 'EOF'
FROM golang:1.20-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/config ./config

EXPOSE 8081
CMD ["./main"]
EOF
```

#### Payment Gateway Dockerfile
```bash
cat > backend/payment-gateway/Dockerfile << 'EOF'
FROM golang:1.20-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .

EXPOSE 8082
CMD ["./main"]
EOF
```

#### Audit Service Dockerfile
```bash
cat > backend/audit-service/Dockerfile << 'EOF'
FROM golang:1.20-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .

EXPOSE 8083
CMD ["./main"]
EOF
```

#### Frontend Dockerfile
```bash
cat > frontend/Dockerfile << 'EOF'
# 構建階段
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 運行階段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
```

#### Frontend Nginx配置
```bash
cat > frontend/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # 處理SPA路由
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API代理
        location /api/ {
            proxy_pass http://trading-api:30080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
EOF
```

### 2. 構建Image命令

```bash
# 構建所有後端服務鏡像
docker build -t fintech/trading-api:latest ./backend/trading-api
docker build -t fintech/risk-engine:latest ./backend/risk-engine
docker build -t fintech/payment-gateway:latest ./backend/payment-gateway
docker build -t fintech/audit-service:latest ./backend/audit-service

# 構建前端鏡像
docker build -t fintech/frontend:latest ./frontend

# 構建腳本
cat > build_images.sh << 'EOF'
#!/bin/bash

echo "構建金融微服務Docker鏡像..."

services=("trading-api" "risk-engine" "payment-gateway" "audit-service")

for service in "${services[@]}"; do
    echo "構建 $service..."
    docker build -t fintech/$service:latest ./backend/$service
    if [ $? -eq 0 ]; then
        echo "✅ $service 構建成功"
    else
        echo "❌ $service 構建失敗"
        exit 1
    fi
done

echo "構建前端..."
docker build -t fintech/frontend:latest ./frontend
if [ $? -eq 0 ]; then
    echo "✅ frontend 構建成功"
else
    echo "❌ frontend 構建失敗"
    exit 1
fi

echo "🎉 所有鏡像構建完成"
docker images | grep fintech
EOF

chmod +x build_images.sh
./build_images.sh
```

### 3. 推送到Registry

```bash
# 推送到Docker Hub
docker tag fintech/trading-api:latest your-username/fintech-trading-api:latest
docker push your-username/fintech-trading-api:latest

# 推送到私有Registry
docker tag fintech/trading-api:latest registry.example.com/fintech-trading-api:latest
docker push registry.example.com/fintech-trading-api:latest

# 批量推送腳本
cat > push_images.sh << 'EOF'
#!/bin/bash

REGISTRY="your-username"  # 修改為你的Registry
services=("trading-api" "risk-engine" "payment-gateway" "audit-service" "frontend")

for service in "${services[@]}"; do
    echo "推送 $service..."
    docker tag fintech/$service:latest $REGISTRY/fintech-$service:latest
    docker push $REGISTRY/fintech-$service:latest
done

echo "🚀 所有鏡像推送完成"
EOF

chmod +x push_images.sh
./push_images.sh
```

---

## Kubernetes部署

### 1. 創建命名空間和配置

```bash
# 創建命名空間
kubectl create namespace fintech-demo

# 創建ConfigMap
cat > k8s/configmap.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: fintech-config
  namespace: fintech-demo
data:
  database-host: "postgres-service"
  database-name: "fintech_db"
  database-user: "fintech_user"
  redis-host: "redis-service"
  redis-password: ""
EOF

# 創建Secret
cat > k8s/secret.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: fintech-secrets
  namespace: fintech-demo
type: Opaque
data:
  database-password: ZmludGVjaF9wYXNz  # base64 encoded "fintech_pass"
EOF
```

### 2. 數據庫服務部署

```bash
# PostgreSQL部署
cat > k8s/postgres.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: fintech-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: fintech-config
              key: database-name
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: fintech-config
              key: database-user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: fintech-secrets
              key: database-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: init-script
          mountPath: /docker-entrypoint-initdb.d
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: init-script
        configMap:
          name: postgres-init
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: fintech-demo
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: fintech-demo
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF

# Redis部署
cat > k8s/redis.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: fintech-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: fintech-demo
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
EOF
```

### 3. 微服務部署

```bash
# Trading API部署
cat > k8s/trading-api.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-api
  namespace: fintech-demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trading-api
  template:
    metadata:
      labels:
        app: trading-api
    spec:
      containers:
      - name: trading-api
        image: fintech/trading-api:latest
        ports:
        - containerPort: 30080
        env:
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: fintech-config
              key: database-host
        - name: DATABASE_USER
          valueFrom:
            configMapKeyRef:
              name: fintech-config
              key: database-user
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: fintech-secrets
              key: database-password
        - name: DATABASE_NAME
          valueFrom:
            configMapKeyRef:
              name: fintech-config
              key: database-name
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: fintech-config
              key: redis-host
        - name: REDIS_PASSWORD
          valueFrom:
            configMapKeyRef:
              name: fintech-config
              key: redis-password
        livenessProbe:
          httpGet:
            path: /health
            port: 30080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 30080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: trading-api-service
  namespace: fintech-demo
spec:
  selector:
    app: trading-api
  ports:
  - port: 30080
    targetPort: 30080
  type: ClusterIP
EOF

# 其他微服務類似部署...
```

### 4. 完整部署腳本

```bash
# 創建完整部署腳本
cat > deploy_k8s.sh << 'EOF'
#!/bin/bash

echo "🚀 開始部署金融微服務到Kubernetes..."

# 創建命名空間
echo "創建命名空間..."
kubectl create namespace fintech-demo --dry-run=client -o yaml | kubectl apply -f -

# 部署配置
echo "部署配置文件..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# 部署數據庫
echo "部署數據庫服務..."
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# 等待數據庫就緒
echo "等待數據庫啟動..."
kubectl wait --for=condition=ready pod -l app=postgres -n fintech-demo --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n fintech-demo --timeout=300s

# 部署微服務
echo "部署微服務..."
kubectl apply -f k8s/trading-api.yaml
kubectl apply -f k8s/risk-engine.yaml
kubectl apply -f k8s/payment-gateway.yaml
kubectl apply -f k8s/audit-service.yaml

# 部署前端
echo "部署前端..."
kubectl apply -f k8s/frontend.yaml

# 創建Ingress
echo "創建Ingress..."
kubectl apply -f k8s/ingress.yaml

echo "✅ 部署完成！"
echo ""
echo "查看部署狀態："
echo "kubectl get pods -n fintech-demo"
echo ""
echo "查看服務："
echo "kubectl get services -n fintech-demo"
echo ""
echo "獲取訪問地址："
echo "kubectl get ingress -n fintech-demo"
EOF

chmod +x deploy_k8s.sh
```

### 5. Ingress配置

```bash
cat > k8s/ingress.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fintech-ingress
  namespace: fintech-demo
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: fintech-demo.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: trading-api-service
            port:
              number: 30080
EOF
```

---

## 常見問題解決

### 1. Google訂單不成交問題

**問題**: Google (GOOGL) 限價單不會成交

**原因**: 在`backend/trading-api/handlers/trading.go`的`processOrder`函數中，限價單成交邏輯使用隨機填充率，可能導致填充率為0。

**解決方案**:
```bash
# 修復訂單成交邏輯
cat > fix_order_execution.patch << 'EOF'
--- a/backend/trading-api/handlers/trading.go
+++ b/backend/trading-api/handlers/trading.go
@@ -378,10 +378,15 @@ func processOrder(order *models.Order) {
 		order.AvgPrice = generateRandomPrice(order.Symbol)
 	} else {
 		// 限價單部分成交
-		fillRatio := rand.Float64()
+		// 為了演示，確保GOOGL訂單有較高的成交率
+		fillRatio := rand.Float64()
+		if order.Symbol == "GOOGL" {
+			fillRatio = 0.7 + rand.Float64()*0.3 // 70%-100%成交率
+		} else if fillRatio < 0.3 {
+			fillRatio = 0.3 + rand.Float64()*0.7 // 最低30%成交率
+		}
 		order.FilledQty = order.Quantity * fillRatio
 		order.RemainingQty = order.Quantity - order.FilledQty
 		order.AvgPrice = order.Price
 		
 		if order.FilledQty > 0 {
 			order.Status = "partially_filled"
+		} else {
+			order.Status = "pending"
 		}
+		
+		// 如果成交率超過95%，標記為完全成交
+		if fillRatio > 0.95 {
+			order.Status = "filled"
+			order.RemainingQty = 0
+			order.FilledQty = order.Quantity
+		}
 	}
 	
 	order.UpdatedAt = time.Now()
EOF

# 應用修復
patch -p1 < fix_order_execution.patch
```

### 2. 端口佔用問題

```bash
# 檢查端口佔用
netstat -tulpn | grep :30080
lsof -i :30080

# 釋放端口
kill -9 $(lsof -ti:30080)
```

### 3. 數據庫連接問題

```bash
# 檢查PostgreSQL狀態
brew services list | grep postgresql
sudo systemctl status postgresql

# 重啟數據庫
brew services restart postgresql@14
sudo systemctl restart postgresql

# 檢查連接
psql -h localhost -U $USER -d fintech_db -c "SELECT 1;"
```

### 4. Redis連接問題

```bash
# 檢查Redis狀態
brew services list | grep redis
sudo systemctl status redis

# 測試連接
redis-cli ping
```

### 5. Go模塊問題

```bash
# 清理Go模塊快取
go clean -modcache

# 重新下載依賴
go mod download
go mod tidy
```

### 6. Docker問題

```bash
# 清理Docker資源
docker system prune -a

# 重建鏡像（無快取）
docker build --no-cache -t fintech/trading-api:latest ./backend/trading-api

# 查看容器日誌
docker logs -f container_name
```

### 7. Kubernetes問題

```bash
# 查看Pod狀態
kubectl get pods -n fintech-demo -o wide

# 查看Pod日誌
kubectl logs -f deployment/trading-api -n fintech-demo

# 重新部署
kubectl rollout restart deployment/trading-api -n fintech-demo

# 清理資源
kubectl delete namespace fintech-demo
```

---

## 監控和維護

### 1. 健康檢查

```bash
# 創建健康檢查腳本
cat > health_check.sh << 'EOF'
#!/bin/bash

services=(
    "http://localhost:30080/health:Trading API"
    "http://localhost:8081/health:Risk Engine"
    "http://localhost:8082/health:Payment Gateway"
    "http://localhost:8083/health:Audit Service"
    "http://localhost:5173:Frontend"
)

echo "🔍 檢查服務健康狀態..."
echo ""

for service in "${services[@]}"; do
    url="${service%%:*}"
    name="${service##*:}"
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo "✅ $name - 健康"
    else
        echo "❌ $name - 異常"
    fi
done
EOF

chmod +x health_check.sh
./health_check.sh
```

### 2. 日誌監控

```bash
# 查看所有服務日誌
tail -f backend/*/logs/*.log

# Docker環境日誌
docker-compose logs -f

# Kubernetes環境日誌
kubectl logs -f -l app=trading-api -n fintech-demo
```

### 3. 性能監控

```bash
# 訪問Prometheus指標
curl http://localhost:30080/metrics
curl http://localhost:8081/metrics
curl http://localhost:8082/metrics
curl http://localhost:8083/metrics
```

---

## 總結

本教學文件涵蓋了金融微服務eBPF演示系統的完整部署流程：

1. **本機啟動**: 適合開發和測試環境
2. **Docker啟動**: 適合快速部署和環境一致性
3. **Container打包**: 用於生產環境部署
4. **Kubernetes部署**: 適合生產環境的容器編排

每種方式都有其優勢和適用場景。建議開發時使用本機啟動，測試時使用Docker，生產環境使用Kubernetes。

**重要提醒**: 此系統包含故意設計的安全漏洞，僅用於eBPF安全監控演示，請勿在生產環境中使用。 