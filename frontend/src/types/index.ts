// TypeScript Types
export interface User {
  id: number;
  username: string;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  setupAdmin: (username: string, password: string, passwordConfirm: string) => Promise<void>;
}

export interface DashboardState {
  agentStatus: 'running' | 'stopped' | 'emergency_stop';
  accountBalance: number;
  totalPnL: { absolute: number; percentage: number };
  todayPnL: { absolute: number; percentage: number };
  activePositions: number;
  loading: boolean;
  error: string | null;
  fetchOverview: () => Promise<void>;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  size: number;
  unrealizedPnL: {
    absolute: number;
    percentage: number;
  };
  openedAt: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  size: number;
  entry_timestamp: string;
  exit_timestamp: string | null;
  realized_pnl: number | null;
  strategy: string | null;
  ai_reasoning: string | null;
  evaluation: 'good' | 'bad' | null;
}
