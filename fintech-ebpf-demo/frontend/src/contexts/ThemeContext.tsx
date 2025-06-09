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
    console.warn('useTheme must be used within a ThemeProvider, returning default values');
    // 返回默认值而不是抛出错误
    return {
      isDarkMode: false,
      toggleDarkMode: () => {},
      getThemeConfig: () => ({
        token: {
          colorPrimary: '#1890ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1890ff',
          borderRadius: 6,
          wireframe: false,
        }
      })
    };
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false); // 初始值設為false

  // 僅在客戶端掛載後才從localStorage讀取
  useEffect(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      if (saved) {
        setIsDarkMode(JSON.parse(saved));
      }
    } catch (error) {
      console.error("無法從localStorage讀取主題:", error);
    }
  }, []);

  // 保存主題偏好到localStorage，並更新body的class
  useEffect(() => {
    try {
      localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
      if (isDarkMode) {
        document.body.classList.add('dark-mode');
        document.body.style.backgroundColor = '#141414';
      } else {
        document.body.classList.remove('dark-mode');
        document.body.style.backgroundColor = '#f0f2f5';
      }
    } catch (error) {
      console.error("無法保存主題偏好到localStorage:", error);
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getThemeConfig = () => {
    try {
      // 增加安全检查，防止undefined访问
      if (!theme) {
        console.warn('Ant Design theme object not available, using default config');
        return {
          token: {
            colorPrimary: '#1890ff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1890ff',
            borderRadius: 6,
            wireframe: false,
          }
        };
      }

      const { defaultAlgorithm, darkAlgorithm } = theme;
      
      if (!defaultAlgorithm || !darkAlgorithm) {
        console.warn('Ant Design theme algorithms not available, using default config');
        return {
          token: {
            colorPrimary: '#1890ff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1890ff',
            borderRadius: 6,
            wireframe: false,
            ...(isDarkMode && {
              colorBgBase: '#141414',
              colorTextBase: '#fff',
            }),
          }
        };
      }
      
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
          ...(isDarkMode && {
            colorBgBase: '#141414',
            colorTextBase: '#fff',
          }),
        },
        components: {
          Layout: {
            headerBg: isDarkMode ? '#141414' : '#fff',
            siderBg: '#001529',
            bodyBg: isDarkMode ? '#141414' : '#fff',
          },
          Menu: {
            darkItemBg: '#001529',
            darkSubMenuItemBg: '#000c17',
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
    } catch (error) {
      console.error('Error creating theme config:', error);
      return {
        token: {
          colorPrimary: '#1890ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1890ff',
          borderRadius: 6,
          wireframe: false,
        }
      };
    }
  };

  const value = {
    isDarkMode,
    toggleDarkMode,
    getThemeConfig,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}; 