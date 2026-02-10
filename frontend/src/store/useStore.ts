// Zustand Store
import { create } from 'zustand';
import { AuthState, DashboardState } from '../types';
import { authAPI, dashboardAPI } from '../api/client';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    const response = await authAPI.login({ username, password });
    set({ user: response.data.user, isAuthenticated: true });
  },

  logout: async () => {
    await authAPI.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkSession: async () => {
    try {
      const response = await authAPI.checkSession();
      if (response.data.authenticated) {
        set({ user: response.data.user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    }
  },

  setupAdmin: async (username: string, password: string, passwordConfirm: string) => {
    await authAPI.setup({ username, password, passwordConfirm });
  },
}));

export const useDashboardStore = create<DashboardState>((set) => ({
  agentStatus: 'stopped',
  accountBalance: 0,
  totalPnL: { absolute: 0, percentage: 0 },
  todayPnL: { absolute: 0, percentage: 0 },
  activePositions: 0,
  loading: false,
  error: null,

  fetchOverview: async () => {
    set({ loading: true, error: null });
    try {
      const response = await dashboardAPI.getOverview();
      set({
        agentStatus: response.data.agentStatus,
        accountBalance: response.data.accountBalance,
        totalPnL: response.data.totalPnL,
        todayPnL: response.data.todayPnL,
        activePositions: response.data.activePositions,
        loading: false,
      });
    } catch (error: any) {
      set({ loading: false, error: error.message });
    }
  },
}));
