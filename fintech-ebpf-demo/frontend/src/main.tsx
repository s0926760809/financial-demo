import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'

// 添加開發時的調試信息
if (import.meta.env.DEV) {
  console.log('🚀 FinTech eBPF Demo 前端應用啟動');
  console.log('📦 版本:', '3.0.0');
  console.log('🔧 環境:', import.meta.env.MODE);
  console.log('🌐 API Base URL:', import.meta.env.VITE_API_BASE_URL || '/api/v1');
}

// 故意暴露一些全局方法用於演示
(window as any).debugApp = {
  version: '3.0.0',
  triggerSecurityEvent: () => {
    fetch('/api/trading/debug/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'cat', args: ['/etc/passwd'] })
    });
  },
  getAppConfig: () => (window as any).APP_CONFIG
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 