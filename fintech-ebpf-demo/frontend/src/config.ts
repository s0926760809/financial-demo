// API 端點配置
interface ApiEndpoints {
  trading: string;
  risk: string;
  payment: string;
  audit: string;
  base: string;
}

// 聲明全局運行時配置類型
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      VITE_API_BASE_URL: string;
      API_ENDPOINTS: {
        trading: string;
        risk: string;
        payment: string;
        audit: string;
      };
    };
  }
}

// 優先使用運行時配置，然後是環境變數，最後是預設值
const runtimeConfig = (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) || null;

const apiEndpoints: ApiEndpoints = {
  base: runtimeConfig?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1',
  trading: runtimeConfig?.API_ENDPOINTS?.trading || '/api/trading',
  risk: runtimeConfig?.API_ENDPOINTS?.risk || '/api/risk', 
  payment: runtimeConfig?.API_ENDPOINTS?.payment || '/api/payment',
  audit: runtimeConfig?.API_ENDPOINTS?.audit || '/api/audit'
};

export default apiEndpoints; 