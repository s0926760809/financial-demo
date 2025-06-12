import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 安全的localStorage访问函数
const safeGetLocalStorage = (key: string, defaultValue: string): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        console.log(`🔍 成功从localStorage读取 ${key}:`, stored);
        return stored;
      }
    }
    console.log(`💡 使用默认值 ${key}:`, defaultValue);
    return defaultValue;
  } catch (error) {
    console.warn('⚠️ localStorage访问失败，使用默认值:', error);
    return defaultValue;
  }
};

const safeSetLocalStorage = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
      console.log(`💾 成功保存到localStorage ${key}:`, value);
    }
  } catch (error) {
    console.warn('⚠️ localStorage保存失败:', error);
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 安全地获取初始主题
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = safeGetLocalStorage('fintech-theme', 'light');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    console.log(`🎨 切换主题: ${theme} -> ${newTheme}`);
    setTheme(newTheme);
    safeSetLocalStorage('fintech-theme', newTheme);
  };

  const isDark = theme === 'dark';

  // 应用主题到body类
  useEffect(() => {
    try {
      const body = document.body;
      if (body) {
        body.className = body.className.replace(/theme-\w+/g, '');
        body.classList.add(`theme-${theme}`);
        console.log(`🎭 应用主题类: theme-${theme}`);
      }
    } catch (error) {
      console.warn('⚠️ 应用主题失败:', error);
    }
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    isDark,
  };

  console.log('🎨 ThemeProvider渲染，当前主题:', theme);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme必须在ThemeProvider内使用');
  }
  return context;
}; 