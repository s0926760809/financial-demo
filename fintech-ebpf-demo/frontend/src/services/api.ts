import { message } from 'antd';

// API基础配置
const API_BASE_URL = '/api/v1';
const WS_BASE_URL = `ws://${window.location.host}/api/v1`;

// 类型定义
export interface User {
  user_id: string;
  email: string;
  display_name: string;
  current_balance: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit';
  quantity: number;
  price?: number;
  status: string;
  created_at: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
}

export interface Portfolio {
  total_value: number;
  cash_balance: number;
  positions: Position[];
  today_pnl: number;
  total_pnl: number;
}

export interface SecurityTest {
  test_name: string;
  success: boolean;
  message: string;
  data: any;
  risk_level: 'low' | 'medium' | 'high';
}

export interface TetragonEvent {
  timestamp: string;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  process_name?: string;
  command?: string;
  source_ip?: string;
  destination_ip?: string;
  file_path?: string;
}

// API请求工具函数
class ApiService {
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // 默认请求头
    const headers = {
      'Content-Type': 'application/json',
      'X-User-ID': 'demo-user', // 默认用户ID
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 尝试解析JSON，如果失败则返回文本
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      message.error(`API请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  // 用户管理 API
  async getUserProfile(): Promise<User> {
    return this.request('/user/profile');
  }

  async updateUserProfile(data: Partial<User>): Promise<any> {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async resetUserAccount(options: {
    reset_balance?: number;
    clear_positions?: boolean;
    clear_trades?: boolean;
  }): Promise<any> {
    return this.request('/user/reset', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // 交易 API
  async createOrder(order: {
    symbol: string;
    side: 'buy' | 'sell';
    order_type: 'market' | 'limit';
    quantity: number;
    price?: number;
  }): Promise<Order> {
    return this.request('/order', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request(`/order/${orderId}`);
  }

  async getUserOrders(): Promise<Order[]> {
    return this.request('/orders/user');
  }

  async getPortfolio(): Promise<Portfolio> {
    return this.request('/portfolio');
  }

  async getTradingHistory(): Promise<Order[]> {
    return this.request('/trading/history');
  }

  async getStockQuote(symbol: string): Promise<any> {
    return this.request(`/stock/quote/${symbol}`);
  }

  async getSupportedStocks(): Promise<string[]> {
    return this.request('/stock/supported');
  }

  // 安全测试 API
  async getSecurityTests(): Promise<string[]> {
    return this.request('/security/tests');
  }

  async runSecurityTest(testName: string, params: any = {}): Promise<SecurityTest> {
    return this.request(`/security/test/${testName}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // 可用的安全测试
  async runCommandTest(command: string): Promise<SecurityTest> {
    return this.runSecurityTest('command', { command });
  }

  async runFileTest(filePath: string): Promise<SecurityTest> {
    return this.runSecurityTest('file', { file_path: filePath });
  }

  async runNetworkTest(params: any): Promise<SecurityTest> {
    return this.runSecurityTest('network', params);
  }

  async runSensitiveTest(): Promise<SecurityTest> {
    return this.runSecurityTest('sensitive');
  }

  async runSqlTest(query: string): Promise<SecurityTest> {
    return this.runSecurityTest('sql', { query });
  }

  async runPrivilegeTest(): Promise<SecurityTest> {
    return this.runSecurityTest('privilege');
  }

  async runCryptoTest(): Promise<SecurityTest> {
    return this.runSecurityTest('crypto');
  }

  async runMemoryTest(): Promise<SecurityTest> {
    return this.runSecurityTest('memory');
  }

  async runAllSecurityTests(): Promise<SecurityTest> {
    return this.runSecurityTest('all');
  }

  // Tetragon/eBPF 监控 API
  async getTetragonEvents(): Promise<TetragonEvent[]> {
    return this.request('/tetragon/events');
  }

  async getTetragonAlerts(): Promise<TetragonEvent[]> {
    return this.request('/tetragon/alerts');
  }

  async getTetragonStats(): Promise<any> {
    return this.request('/tetragon/stats');
  }

  // WebSocket连接用于实时事件
  createTetragonWebSocket(onMessage: (event: TetragonEvent) => void): WebSocket {
    const ws = new WebSocket(`${WS_BASE_URL}/tetragon/ws`);
    
    ws.onopen = () => {
      console.log('🔗 Tetragon WebSocket 连接已建立');
      message.success('实时监控连接已建立');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 Tetragon WebSocket 连接已关闭');
      message.warning('实时监控连接已断开');
    };

    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      message.error('实时监控连接错误');
    };

    return ws;
  }
}

// 导出单例实例
export const apiService = new ApiService();

// 便捷的API调用方法（用于现有代码兼容）
export const testAPI = async (endpoint: string, name: string) => {
  try {
    const response = await fetch(`/api/v1${endpoint}`, {
      headers: { 'X-User-ID': 'demo-user' }
    });
    const data = await response.text();
    message.success(`${name} API调用成功: ${response.status}`);
    console.log(`${name} 响应:`, data);
    return { success: true, data, status: response.status };
  } catch (error) {
    message.error(`${name} API调用失败: ${error}`);
    console.error(`${name} 错误:`, error);
    throw error;
  }
};

export default apiService; 