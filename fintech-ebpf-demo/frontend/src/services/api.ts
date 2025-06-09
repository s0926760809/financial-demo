import axios from 'axios';
import { message } from 'antd';
import { Event } from '../types';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiService = axios.create({
  baseURL: VITE_API_BASE_URL,
  timeout: 10000,
});

apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    message.error(errorMessage);
    return Promise.reject(error);
  }
);

export const triggerSecurityTest = async (endpoint: string, payload: any) => {
  try {
    // Based on backend route analysis, the correct structure is:
    // POST /api/v1/security/test/{endpoint}
    const response = await apiService.post(`/security/test/${endpoint}`, payload);
    return response.data;
  } catch (error: any) {
    console.error(`Error triggering security test for ${endpoint}:`, error);
    throw new Error(error.response?.data?.error || `Failed to trigger test for ${endpoint}`);
  }
};

export const connectWebSocket = (onMessage: (event: Event) => void): WebSocket => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.host;
  // The backend WebSocket is exposed at /api/v1/tetragon/ws via Ingress
  const wsUrl = `${wsProtocol}//${wsHost}/api/v1/tetragon/ws`;
  
  console.log(`Connecting to WebSocket: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connection established');
    message.success('已連接到實時事件流');
  };

  ws.onmessage = (event) => {
    try {
      const eventData: Event = JSON.parse(event.data);
      onMessage(eventData);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    message.error('WebSocket 連接錯誤');
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
    message.warning('已從實時事件流斷開');
  };

  return ws;
}; 