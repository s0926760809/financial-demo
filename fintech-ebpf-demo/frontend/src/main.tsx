import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'

// 简单的全局错误处理
window.addEventListener('error', (event) => {
  console.error('🚨 全局错误:', event.error);
  console.error('📍 错误位置:', event.filename, '行:', event.lineno, '列:', event.colno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 未处理的Promise拒绝:', event.reason);
});

console.log('🚀 金融微服务 eBPF 演示系统启动');
console.log('📦 React版本:', React.version);
console.log('🕐 启动时间:', new Date().toISOString());

// 直接渲染，不使用StrictMode或错误边界
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('❌ 找不到root元素');
}

console.log('🔄 开始渲染React应用...');

ReactDOM.createRoot(rootElement).render(<App />);

console.log('✅ React应用渲染完成'); 