import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// 定義用戶資料的接口
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  preferences: {
    theme: 'light' | 'dark';
  };
}

// 定義Context的值的接口
interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
}

// 創建Context
const UserContext = createContext<UserContextType | undefined>(undefined);

// 創建Provider組件
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/user/profile', {
        headers: { 'X-User-ID': 'demo-user-123' },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.profile);
      } else {
        // Fallback for demo if API fails
        setUser({ 
          id: 'demo-user-123', 
          name: '演示用戶', 
          email: 'demo@example.com', 
          avatarUrl: `https://i.pravatar.cc/150?u=demo-user-123`,
          preferences: { theme: 'light' }
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      setUser({ 
        id: 'demo-user-123', 
        name: '演示用戶', 
        email: 'demo@example.com', 
        avatarUrl: `https://i.pravatar.cc/150?u=demo-user-123`,
        preferences: { theme: 'light' }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

// 創建自定義Hook以方便使用
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    console.warn('useUser must be used within a UserProvider, returning default values');
    // 返回默认值而不是抛出错误
    return {
      user: {
        id: 'demo-user-123',
        name: '演示用戶',
        email: 'demo@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?u=demo-user-123',
        preferences: { theme: 'light' }
      },
      loading: false,
      fetchUser: async () => {}
    };
  }
  return context;
}; 