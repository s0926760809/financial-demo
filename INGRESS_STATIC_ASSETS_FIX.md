# Ingress 静态资源访问修复指南

## 🔍 问题分析

**现象**: 通过 `fintech-demo.local` 访问时，静态资源返回 HTML 内容而非正确的文件类型
```
GET http://fintech-demo.local/assets/index-C4Rwhnyp.css 
返回: Content-Type: text/html (错误)
期望: Content-Type: text/css (正确)
```

**原因**: Ingress 路由配置问题，静态资源路径被错误处理

## ✅ 验证测试

### 1. 直接访问前端服务 (正常)
```bash
curl -I http://localhost:3000/assets/index-C4Rwhnyp.css
# 返回: HTTP/1.1 200 OK, Content-Type: text/css ✅
```

### 2. 通过 Ingress 访问 (有问题)
```bash
curl -I http://fintech-demo.local/assets/index-C4Rwhnyp.css
# 返回: Content-Type: text/html ❌
```

## 🔧 解决方案

### 方案 1: 修复 Ingress 配置 (推荐)

需要确保 `fintech-demo.local` 指向正确的 IP 地址：

```bash
# 1. 获取 Ingress IP
kubectl get ingress -n fintech-demo
# 结果显示: ADDRESS = 192.168.1.210

# 2. 添加到 hosts 文件
echo "192.168.1.210 fintech-demo.local" | sudo tee -a /etc/hosts

# 3. 或者在 Windows 上编辑 C:\Windows\System32\drivers\etc\hosts
# 添加行: 192.168.1.210 fintech-demo.local
```

### 方案 2: 使用端口转发 (临时方案)

```bash
# 已经在运行的端口转发
kubectl port-forward svc/frontend 3000:80 -n fintech-demo &

# 访问: http://localhost:3000/security
```

### 方案 3: 使用 IP 地址直接访问

```bash
# 直接使用 Ingress IP
# 访问: http://192.168.1.210/security
# 注意: 需要设置 Host 头部
curl -H "Host: fintech-demo.local" http://192.168.1.210/security
```

## 🎯 验证修复

修复后，这些命令应该都返回正确的 Content-Type：

```bash
# 测试静态资源
curl -I http://fintech-demo.local/assets/index-C4Rwhnyp.css
# 期望: Content-Type: text/css

curl -I http://fintech-demo.local/assets/index-CAR0_c0j.js  
# 期望: Content-Type: application/javascript

# 测试页面访问
curl -I http://fintech-demo.local/security
# 期望: Content-Type: text/html (正确的 HTML 页面)
```

## 📋 当前系统状态

### ✅ 正常运行的服务
- **前端服务**: localhost:3000 (端口转发)
- **所有后端 API**: 通过 Ingress 正常路由
- **WebSocket 连接**: 通过 Ingress 正常路由
- **静态文件**: 在前端服务内部正常

### ❌ 需要修复的问题
- **域名解析**: `fintech-demo.local` 需要指向 `192.168.1.210`
- **浏览器缓存**: 可能需要清除缓存以避免缓存的错误响应

## 🔄 快速修复步骤

```bash
# 1. 添加域名解析
echo "192.168.1.210 fintech-demo.local" | sudo tee -a /etc/hosts

# 2. 清除浏览器缓存
# 在浏览器中按 Ctrl+Shift+R 强制刷新

# 3. 验证访问
curl http://fintech-demo.local/security
```

## 🛠️ 排查命令

```bash
# 检查 Ingress 状态
kubectl get ingress -n fintech-demo
kubectl describe ingress fintech-demo-fintech-chart-ingress -n fintech-demo

# 检查前端服务
kubectl get svc frontend -n fintech-demo
kubectl logs deployment/frontend -n fintech-demo

# 测试网络连通性
ping 192.168.1.210
telnet 192.168.1.210 80
```

---

## 📊 当前架构状态

```
用户浏览器 
    ↓ (fintech-demo.local)
域名解析 (需要修复: 指向 192.168.1.210)
    ↓
Nginx Ingress Controller (192.168.1.210)
    ↓ (路由规则)
    ├── /api/v1/* → trading-api-service:8080
    ├── /api/risk/* → risk-engine-service:8081  
    ├── /api/payment/* → payment-gateway-service:8082
    ├── /api/audit/* → audit-service-service:8083
    ├── /ws/events → tetragon-stream:8090
    └── /* → frontend:80 (包含静态资源)
```

**关键点**: 所有静态资源 (`/assets/*`) 都应该路由到前端服务，前端服务的 nginx 能正确处理这些请求。 