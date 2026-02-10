// TypeScript Type Definitions
export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: number;
  token: string;
  ip_address: string | null;
  created_at: Date;
  expires_at: Date;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  size: number;
  entry_timestamp: Date;
  exit_timestamp: Date | null;
  realized_pnl: number | null;
  strategy: string | null;
  ai_reasoning: string | null;
  market_context: MarketContext | null;
  evaluation: 'good' | 'bad' | null;
  created_at: Date;
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
  openedAt: Date;
}

export interface MarketContext {
  entryConditions?: string;
  exitConditions?: string;
  rsi?: number;
  macd?: number;
  bollingerBands?: {
    upper: number;
    lower: number;
  };
}

export interface AIAnalysis {
  id: string;
  timestamp: Date;
  symbol: string;
  market_data: any;
  current_position: any;
  ai_response: string;
  decision: TradeAction;
  confidence: number;
  action_taken: boolean;
  rejection_reason: string | null;
  created_at: Date;
}

export type TradeAction = 'OPEN_LONG' | 'OPEN_SHORT' | 'CLOSE' | 'HOLD';

export interface TradeDecision {
  action: TradeAction;
  reasoning: string;
  confidence: number;
  suggestedSize: number;
  strategy: string;
}

export interface SystemLog {
  id: string;
  event_type: string;
  timestamp: Date;
  user_id: number | null;
  details: any;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  created_at: Date;
}

export interface AuditLog {
  id: string;
  action_type: string;
  timestamp: Date;
  user_id: number;
  ip_address: string | null;
  result: 'SUCCESS' | 'FAILURE';
  details: any;
  created_at: Date;
}

export interface AgentState {
  id: number;
  status: 'running' | 'stopped' | 'emergency_stop';
  last_analysis_at: Date | null;
  last_trade_at: Date | null;
  updated_at: Date;
}

export interface AccountBalance {
  totalBalance: number;
  availableBalance: number;
  marginUsed: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  fillPrice?: number;
  filledSize?: number;
  error?: string;
}

export interface CloseAllResult {
  success: boolean;
  attempted: number;
  closed: number;
  failed: number;
  failedPositions: string[];
}

export interface MarketData {
  currentPrice: number;
  symbol: string;
  volume24h?: number;
  ohlcv?: any[];
  indicators?: {
    rsi?: number;
    macd?: { value: number; signal: number };
    bollingerBands?: { upper: number; lower: number };
  };
}

export interface RiskCheckResult {
  approved: boolean;
  reason?: string;
}
