# 前端白屏問題診斷指南

## 問題描述
在透過Helm部署至K8s時，前端頁面打開是白的，出現錯誤：`uncaught TypeError undefined has no properties`

## 已修復的問題

### 1. 缺少配置文件 ✅
**問題**: `src/config.ts` 文件缺失，導致`App.tsx`中的import失敗
**解決**: 已創建`src/config.ts`文件，支持運行時配置

### 2. 環境變數配置 ✅ 
**問題**: Deployment中缺少環境變數配置
**解決**: 在`frontend-deployment.yaml`中添加了環境變數設置

### 3. Ingress路由配置 ✅
**問題**: Ingress中的服務名稱不正確
**解決**: 修正了所有服務名稱引用，使用helper模板

### 4. 運行時配置注入 ✅
**問題**: 生產環境無法獲取正確的API端點
**解決**: 添加了entrypoint腳本，支持運行時配置注入

## 部署檢查清單

### 1. 檢查Pod狀態
```bash
# 查看所有Pod狀態
kubectl get pods -l app.kubernetes.io/name=fintech-chart

# 查看前端Pod詳細信息
kubectl describe pod -l app.kubernetes.io/component=frontend

# 查看前端Pod日志
kubectl logs -l app.kubernetes.io/component=frontend
```

### 2. 檢查Service配置
```bash
# 查看所有服務
kubectl get svc

# 測試前端服務連通性
kubectl port-forward svc/frontend 8080:80
```

### 3. 檢查Ingress配置
```bash
# 查看Ingress狀態
kubectl get ingress
kubectl describe ingress

# 檢查Ingress Controller是否正常
kubectl get pods -n ingress-nginx
```

### 4. 檢查DNS解析
```bash
# 在bastion主機上確認hosts文件配置
cat /etc/hosts | grep fintech-demo.local

# 測試域名解析
nslookup fintech-demo.local
ping fintech-demo.local
```

## 調試步驟

### 1. 驗證前端容器配置
```bash
# 進入前端容器
kubectl exec -it $(kubectl get pod -l app.kubernetes.io/component=frontend -o jsonpath='{.items[0].metadata.name}') -- sh

# 檢查運行時配置文件
cat /usr/share/nginx/html/config.js

# 檢查nginx配置
cat /etc/nginx/nginx.conf

# 檢查HTML文件
cat /usr/share/nginx/html/index.html
```

### 2. 測試API連通性
```bash
# 從前端容器內測試後端服務
kubectl exec -it $(kubectl get pod -l app.kubernetes.io/component=frontend -o jsonpath='{.items[0].metadata.name}') -- sh
wget -qO- http://trading-api-service:8080/health
wget -qO- http://risk-engine-service:8081/health
```

### 3. 檢查瀏覽器開發者工具
1. 打開瀏覽器開發者工具 (F12)
2. 查看Console頁籤的錯誤信息
3. 查看Network頁籤，確認資源加載狀態
4. 查看Sources頁籤，確認config.js是否正確加載

### 4. 驗證運行時配置
在瀏覽器控制台執行：
```javascript
// 檢查運行時配置
console.log(window.__RUNTIME_CONFIG__);

// 檢查API端點
console.log('Current API endpoints:', {
  base: '/api/v1',
  trading: '/api/trading',
  risk: '/api/risk',
  payment: '/api/payment',
  audit: '/api/audit'
});
```

## 常見問題排查

### 1. 白屏 + JavaScript錯誤
**可能原因**: 
- React應用崩潰
- 配置文件加載失敗
- 依賴包問題

**排查方法**:
```bash
# 檢查前端容器日志
kubectl logs -l app.kubernetes.io/component=frontend

# 檢查瀏覽器控制台錯誤
# 檢查Network頁籤的失敗請求
```

### 2. API請求失敗
**可能原因**:
- Ingress配置錯誤
- 後端服務未就緒
- 網絡策略阻擋

**排查方法**:
```bash
# 檢查後端服務狀態
kubectl get pods -l app.kubernetes.io/name=fintech-chart
kubectl logs -l app.kubernetes.io/component=trading-api

# 測試Ingress路由
curl -H "Host: fintech-demo.local" http://<INGRESS_IP>/api/v1/health
```

### 3. 資源加載失敗
**可能原因**:
- nginx配置錯誤
- 文件權限問題
- 路徑配置錯誤

**排查方法**:
```bash
# 檢查nginx錯誤日志
kubectl exec -it $(kubectl get pod -l app.kubernetes.io/component=frontend -o jsonpath='{.items[0].metadata.name}') -- cat /var/log/nginx/error.log

# 檢查文件權限
kubectl exec -it $(kubectl get pod -l app.kubernetes.io/component=frontend -o jsonpath='{.items[0].metadata.name}') -- ls -la /usr/share/nginx/html/
```

## 重新部署步驟

1. **清理現有部署**:
```bash
helm uninstall fintech-demo
```

2. **重新部署**:
```bash
cd fintech-ebpf-demo/k8s/helm
helm install fintech-demo ./fintech-chart --values ./fintech-chart/values.yaml
```

3. **等待所有Pod就緒**:
```bash
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=fintech-chart --timeout=300s
```

4. **測試訪問**:
```bash
# 獲取Ingress IP
kubectl get ingress

# 確保/etc/hosts配置正確
echo "<INGRESS_IP> fintech-demo.local" | sudo tee -a /etc/hosts

# 訪問應用
curl -H "Host: fintech-demo.local" http://<INGRESS_IP>/
```

## 成功指標

前端部署成功的指標：
1. ✅ 前端Pod狀態為Running且Ready
2. ✅ 瀏覽器能正常訪問頁面（不是白屏）
3. ✅ 瀏覽器控制台無JavaScript錯誤
4. ✅ API請求能正常響應
5. ✅ 頁面功能正常（登錄、導航等）

## 聯繫支持

如果問題仍然存在，請提供以下信息：
1. `kubectl get pods -o wide` 輸出
2. `kubectl get svc` 輸出  
3. `kubectl get ingress` 輸出
4. 前端Pod日志
5. 瀏覽器開發者工具的錯誤信息截圖 