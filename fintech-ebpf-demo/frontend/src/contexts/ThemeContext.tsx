import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { theme } from 'antd';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  getThemeConfig: () => any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 從localStorage讀取用戶偏好設置
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // 保存主題偏好到localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getThemeConfig = () => {
    const { defaultAlgorithm, darkAlgorithm } = theme;
    
    return {
      algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      token: {
        colorPrimary: '#1890ff',
        colorSuccess: '#52c41a',
        colorWarning: '#faad14',
        colorError: '#ff4d4f',
        colorInfo: '#1890ff',
        borderRadius: 6,
        wireframe: false,
        // 暗色模式下的特殊配置
        ...(isDarkMode && {
          colorBgBase: '#141414',
          colorTextBase: '#fff',
        }),
      },
      components: {
        Layout: {
          headerBg: isDarkMode ? '#141414' : '#fff',
          siderBg: isDarkMode ? '#001529' : '#001529',
          bodyBg: isDarkMode ? '#141414' : '#fff',
        },
        Menu: {
          darkItemBg: isDarkMode ? '#001529' : '#001529',
          darkSubMenuItemBg: isDarkMode ? '#000c17' : '#000c17',
        },
        Card: {
          colorBgContainer: isDarkMode ? '#1f1f1f' : '#fff',
        },
        Table: {
          colorBgContainer: isDarkMode ? '#1f1f1f' : '#fff',
          headerBg: isDarkMode ? '#262626' : '#fafafa',
        },
      },
    };
  };

  const value = {
    isDarkMode,
    toggleDarkMode,
    getThemeConfig,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}; 