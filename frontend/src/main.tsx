import React from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import App from './App'
import './App.css'

// 🔥 關鍵修復：在導入 antd 之前先確保 React 可用
console.log('🔍 React availability check:');
console.log('React available:', !!React);
console.log('React.createContext available:', !!React.createContext);
console.log('React version:', React.version || 'unknown');

// 🔥 確保React暴露到全局變量 - 必須在antd導入之前
(window as any).React = React
console.log('✅ React exposed to window:', !!(window as any).React)

// 添加開發時的調試信息
if (import.meta.env.DEV) {
  console.log('🚀 FinTech eBPF Demo 前端應用啟動')
  console.log('📦 版本:', '4.0.0')
  console.log('🔧 環境:', import.meta.env.MODE)
  console.log('🌐 API Base URL:', import.meta.env.VITE_API_BASE_URL || '/api/v1')
}

// 全局類型聲明
declare global {
  interface Window {
    React?: typeof React
    debugApp?: any
  }
}

// React錯誤邊界組件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error; errorInfo?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ React ErrorBoundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })

    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f5f5f5',
          padding: '20px'
        }}>
          <h1 style={{ color: '#ff4d4f', marginBottom: '16px' }}>🚨 React Error</h1>
          <p style={{ color: '#666', marginBottom: '24px', textAlign: 'center' }}>
            Application encountered an error. Check console for details.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '12px 24px',
              background: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '16px'
            }}
          >
            Reload Application
          </button>
          {this.state.error && (
            <details style={{ maxWidth: '600px', width: '100%' }}>
              <summary style={{ cursor: 'pointer', color: '#1890ff', marginBottom: '8px' }}>
                View Error Details
              </summary>
              <pre style={{
                background: 'white',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                border: '1px solid #d9d9d9',
                maxHeight: '300px'
              }}>
                {this.state.error.stack || this.state.error.message}
                {this.state.errorInfo && '\n\nComponent Stack:\n' + this.state.errorInfo}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// 創建React測試組件來驗證React是否正常工作
const TestComponent: React.FC = () => {
  React.useEffect(() => {
    console.log('✅ React hooks are working correctly')
  }, [])

  return <div style={{ display: 'none' }}>React is working!</div>
}

// 環境檢查函數
const performEnvironmentCheck = () => {
  console.log('🔍 Performing environment check...')
  
  // 檢查React
  if (!React) {
    throw new Error('React is not available')
  }
  if (!React.createContext) {
    throw new Error('React.createContext is not available')
  }
  
  // 檢查DOM
  if (typeof document === 'undefined') {
    throw new Error('DOM environment not available')
  }
  
  // 檢查root元素
  const container = document.getElementById('root')
  if (!container) {
    throw new Error('Failed to find the root element')
  }
  
  console.log('✅ Environment check passed:', {
    react: !!React,
    createContext: !!React.createContext,
    reactVersion: React.version,
    windowReact: !!(window as any).React,
    rootElement: !!container
  })
  
  return container
}

// 設置調試工具
const setupDebugTools = () => {
  if (import.meta.env.DEV) {
    (window as any).debugApp = {
      react: React,
      version: React.version,
      checkReact: () => {
        console.log('React check:', {
          available: !!React,
          createContext: !!React.createContext,
          version: React.version,
          global: !!(window as any).React
        })
      },
      triggerError: () => {
        throw new Error('Test error for debugging')
      },
      triggerSecurityEvent: () => {
        fetch('/api/trading/debug/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'cat', args: ['/etc/passwd'] })
        })
      },
      getAppConfig: () => (window as any).APP_CONFIG
    }
    console.log('🔧 Debug tools available at window.debugApp')
  }
}

// 主渲染函數
const renderApplication = () => {
  try {
    console.log('🚀 Starting FinTech eBPF Demo application...')
    
    // 環境檢查
    const container = performEnvironmentCheck()
    
    // 設置調試工具
    setupDebugTools()
    
    // 創建React根節點
    console.log('📦 Creating React root...')
    const root = createRoot(container)
    
    // 渲染應用
    console.log('🎯 Rendering application...')
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <TestComponent />
          <ConfigProvider 
            locale={zhCN}
            theme={{
              token: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              },
            }}
          >
            <App />
          </ConfigProvider>
        </ErrorBoundary>
      </React.StrictMode>
    )
    
    console.log('✅ Application rendered successfully')
    
  } catch (error) {
    console.error('❌ Failed to render application:', error)
    
    // 降級方案
    const container = document.getElementById('root')
    if (container) {
      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        ">
          <h1 style="color: #ff4d4f; margin-bottom: 16px;">🚨 Startup Failed</h1>
          <p style="color: #666; margin-bottom: 24px;">React module loading failed</p>
          <button 
            onclick="window.location.reload()" 
            style="
              padding: 12px 24px;
              background: #1890ff;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            "
          >
            Reload
          </button>
          <pre style="
            background: white;
            padding: 16px;
            border-radius: 4px;
            overflow: auto;
            font-size: 12px;
            margin-top: 16px;
            border: 1px solid #d9d9d9;
            max-width: 600px;
          ">${error instanceof Error ? error.stack : String(error)}</pre>
        </div>
      `
    }
  }
}

// 等待DOM準備就緒後啟動
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApplication)
} else {
  renderApplication()
} 