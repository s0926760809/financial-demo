// 基礎事件結構
export interface Event {
    id: string;
    type: string;
    timestamp: string;
    level: 'critical' | 'high' | 'medium' | 'low' | 'info';
    summary: string;
    service: string;
    pod_name: string;
    process_name: string;
    data?: Record<string, any>;
}

// 安全測試結果
export interface TestResult {
    id: string;
    test_name: string;
    success: boolean;
    message: string;
    data?: any;
    timestamp: string;
    risk_level: string;
    ebpf_events?: string[];
}

// 安全測試定義
export interface SecurityTest {
    id: string;
    name: string;
    endpoint: string;
    icon: React.ReactNode;
    description: string;
    payload?: Record<string, any>;
}

// 用戶信息
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'admin' | 'trader' | 'viewer';
    team: string;
    lastLogin: string;
    riskScore: number;
    preferences: {
        theme: 'light' | 'dark';
        notifications: boolean;
    };
} 