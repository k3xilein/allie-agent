// Axios API Client
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth
export const authAPI = {
  setup: (data: { username: string; password: string; passwordConfirm: string }) =>
    api.post('/auth/setup', data),
  
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () =>
    api.post('/auth/logout'),
  
  checkSession: () =>
    api.get('/auth/session'),
};

// Dashboard
export const dashboardAPI = {
  getOverview: () =>
    api.get('/dashboard/overview'),
  
  getActivePositions: () =>
    api.get('/positions/active'),
  
  getTradeHistory: (page: number = 1, limit: number = 20) =>
    api.get(`/trades/history?page=${page}&limit=${limit}`),
  
  getTradeDetails: (id: string) =>
    api.get(`/trades/${id}`),
};

// Agent Control
export const agentAPI = {
  start: () =>
    api.post('/agent/start'),
  
  stop: () =>
    api.post('/agent/stop'),
  
  emergencyStop: (confirmation: string) =>
    api.post('/agent/emergency-stop', { confirmation }),
  
  resetEmergency: () =>
    api.post('/agent/reset-emergency'),
  
  getStatus: () =>
    api.get('/agent/status'),
};

export default api;
