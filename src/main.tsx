// @ts-nocheck
import React from 'react'
import ReactDOM from 'react-dom/client'

// 極其簡單的測試組件
function TestApp() {
  return React.createElement('div', {
    style: { padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }
  }, 
    React.createElement('h1', { style: { color: 'green' } }, '🚀 FinTech eBPF Demo 測試頁面'),
    React.createElement('p', null, '如果您看到這個頁面，說明React已經正常工作了！'),
    React.createElement('button', { 
      onClick: () => alert('測試按鈕工作正常！'),
      style: { padding: '10px', marginTop: '10px' }
    }, '點擊測試'),
    React.createElement('div', {
      style: { marginTop: '20px', padding: '10px', backgroundColor: 'white', border: '1px solid #ccc' }
    }, 
      React.createElement('h3', null, '系統信息'),
      React.createElement('p', null, '時間: ' + new Date().toLocaleString()),
      React.createElement('p', null, '用戶代理: ' + navigator.userAgent)
    )
  );
}

// 調試信息
console.log('🚀 FinTech eBPF Demo 前端應用啟動');
console.log('📦 版本:', '3.0.0');

// 渲染應用
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ 找不到 root 元素！');
} else {
  console.log('✅ 找到 root 元素，開始渲染...');
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(TestApp));
    console.log('✅ React 應用渲染成功！');
  } catch (error) {
    console.error('❌ React 渲染失敗:', error);
  }
} 