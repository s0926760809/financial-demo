import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 導入主題Provider
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { NotificationProvider } from './contexts/NotificationContext';

// 導入頁面組件
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Portfolio from './pages/Portfolio';
import Risk from './pages/Risk';
import Security from './pages/Security';
import Monitoring from './pages/Monitoring';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// 導入樣式
import './App.css';

// 設置中文
dayjs.locale('zh-cn');

// 創建Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分鐘
    },
  },
});

// 應用主體組件
const AppContent: React.FC = () => {
  const { getThemeConfig, isDarkMode } = useTheme();
  
  return (
    <ConfigProvider locale={zhCN} theme={getThemeConfig()}>
      <AntApp>
        <Router>
          <div className={`App ${isDarkMode ? 'dark-theme' : ''}`}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="trading" element={<Trading />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="risk" element={<Risk />} />
                <Route path="security" element={<Security />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              {/* 故意留一個隱藏的調試路由 */}
              <Route 
                path="/debug" 
                element={
                  <div style={{ padding: '20px' }}>
                    <h2>調試信息</h2>
                    <pre>{JSON.stringify({
                      version: '3.0.0',
                      buildTime: new Date().toISOString(),
                      apiEndpoints: {
                        trading: 'http://localhost:30080',
                        risk: 'http://localhost:30081',
                        payment: 'http://localhost:30082',
                        audit: 'http://localhost:30083'
                      },
                      // 故意暴露一些敏感信息用於安全演示
                      secrets: {
                        apiKey: 'demo_api_key_12345',
                        adminToken: 'admin_token_67890'
                      }
                    }, null, 2)}</pre>
                  </div>
                } 
              />
            </Routes>
          </div>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 