#!/bin/sh

# 設置預設值
VITE_API_BASE_URL=${VITE_API_BASE_URL:-/api/v1}

# 在index.html中注入運行時配置
cat <<EOF > /usr/share/nginx/html/config.js
window.__RUNTIME_CONFIG__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}",
  API_ENDPOINTS: {
    trading: "/api/trading",
    risk: "/api/risk",
    payment: "/api/payment", 
    audit: "/api/audit"
  }
};
EOF

echo "運行時配置已生成:"
cat /usr/share/nginx/html/config.js

# 啟動nginx
exec "$@" 