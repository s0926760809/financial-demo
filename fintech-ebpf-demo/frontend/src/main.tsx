import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'

// 故意添加一些全局調試信息
if (import.meta.env.DEV) {
  console.log('🚀 金融微服務 eBPF 演示系統啟動');
  console.log('📊 版本:', '3.0.0');
  console.log('🔧 環境:', import.meta.env.MODE);
  console.log('🌐 API端點:', {
    trading: 'http://localhost:30080',
    risk: 'http://localhost:30081',
    payment: 'http://localhost:30082',
    audit: 'http://localhost:30083'
  });
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