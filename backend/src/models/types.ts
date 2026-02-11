// TypeScript Type Definitions - Complete Trading System

// ========== USER & AUTH ==========
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

// ========== TRADING CORE ==========
export type TradeAction = 'OPEN_LONG' | 'OPEN_SHORT' | 'CLOSE' | 'HOLD';
export type TradeSide = 'long' | 'short';
export type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'ALO';

export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  entry_price: number;
  exit_price: number | null;
  size: number;
  leverage: number;
  entry_timestamp: Date;
  exit_timestamp: Date | null;
  realized_pnl: number | null;
  fees_paid: number;
  strategy: string | null;
  ai_reasoning: string | null;
  market_context: MarketContext | null;
  stop_loss: number | null;
  take_profit: number | null;
  trailing_stop: number | null;
  max_unrealized_pnl: number | null;
  min_unrealized_pnl: number | null;
  evaluation: 'good' | 'bad' | null;
  exit_reason: string | null;
  created_at: Date;
}

export interface Position {
  id: string;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  liquidationPrice: number | null;
  unrealizedPnL: {
    absolute: number;
    percentage: number;
  };
  marginUsed: number;
  openedAt: Date;
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface MarketContext {
  entryConditions?: string;
  exitConditions?: string;
  rsi?: number;
  macd?: number;
  ema_trend?: string;
  volatility?: number;
  volume_profile?: string;
  market_regime?: MarketRegime;
  confluence_score?: number;
  bollingerBands?: {
    upper: number;
    lower: number;
    middle: number;
    bandwidth: number;
  };
  atr?: number;
  support_levels?: number[];
  resistance_levels?: number[];
}

// ========== MARKET DATA ==========
export type MarketRegime = 'trending_up' | 'trending_down' | 'ranging' | 'volatile' | 'low_volatility';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  ohlcv: OHLCV[];
  indicators: TechnicalIndicators;
  orderBook: OrderBookSummary;
  marketRegime: MarketRegime;
  timestamp: Date;
}

export interface OrderBookSummary {
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadPercent: number;
  bidDepth: number;
  askDepth: number;
  imbalance: number;
}

export interface TechnicalIndicators {
  // Trend
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  sma20: number;
  sma50: number;
  // Momentum
  rsi14: number;
  rsi7: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  // Volatility
  atr14: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  };
  // Volume
  vwap: number;
  volumeSMA20: number;
  volumeRatio: number;
  // Custom
  trendStrength: number;
  volatilityPercentile: number;
}

// ========== AI & DECISIONS ==========
export interface TradeDecision {
  action: TradeAction;
  reasoning: string;
  confidence: number;
  suggestedSize: number;
  suggestedLeverage: number;
  strategy: string;
  stopLoss: number | null;
  takeProfit: number | null;
  trailingStop: number | null;
  timeframe: string;
  riskRewardRatio: number;
  marketRegime: MarketRegime;
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
  execution_time_ms: number;
  created_at: Date;
}

// ========== RISK MANAGEMENT ==========
export interface RiskCheckResult {
  approved: boolean;
  reason?: string;
  adjustedSize?: number;
  adjustedLeverage?: number;
  warnings?: string[];
}

export interface RiskMetrics {
  totalEquity: number;
  availableBalance: number;
  marginUsed: number;
  marginUsedPercent: number;
  currentDrawdown: number;
  maxDrawdown: number;
  drawdownPercent: number;
  peakEquity: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  dailyLossLimit: number;
  dailyLossUsed: number;
  openPositions: number;
  maxPositions: number;
  portfolioHeat: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  consecutiveLosses: number;
  maxConsecutiveLosses: number;
  circuitBreakerActive: boolean;
  circuitBreakerReason?: string;
  cooldownUntil?: Date;
}

export interface RiskLimits {
  maxPositionSizePercent: number;
  maxPortfolioHeat: number;
  maxDailyLossPercent: number;
  maxDrawdownPercent: number;
  maxConsecutiveLosses: number;
  maxLeverage: number;
  maxPositions: number;
  minConfidence: number;
  minRiskRewardRatio: number;
  cooldownMinutes: number;
  maxOrderSizeUSD: number;
  maxSlippagePercent: number;
}

// ========== SIGNAL ==========
export interface TradingSignal {
  symbol: string;
  action: TradeAction;
  confidence: number;
  source: 'technical' | 'ai' | 'confluence';
  indicators: {
    name: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    weight: number;
    value: any;
  }[];
  confluenceScore: number;
  suggestedEntry: number;
  suggestedStop: number;
  suggestedTarget: number;
  riskRewardRatio: number;
  timestamp: Date;
}

// ========== ACCOUNT ==========
export interface AccountBalance {
  totalBalance: number;
  availableBalance: number;
  marginUsed: number;
  unrealizedPnL: number;
  withdrawable: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  fillPrice?: number;
  filledSize?: number;
  fees?: number;
  slippage?: number;
  error?: string;
  executionTimeMs?: number;
}

export interface CloseAllResult {
  success: boolean;
  attempted: number;
  closed: number;
  failed: number;
  totalPnL: number;
  failedPositions: string[];
}

// ========== PERFORMANCE ==========
export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  avgWinAmount: number;
  avgLossAmount: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  avgHoldingTime: number;
  bestStrategy: string;
  worstStrategy: string;
  pnlByDay: { date: string; pnl: number }[];
  pnlByStrategy: { strategy: string; pnl: number; trades: number; winRate: number }[];
}

// ========== SYSTEM ==========
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
  status: 'running' | 'stopped' | 'emergency_stop' | 'cooldown';
  last_analysis_at: Date | null;
  last_trade_at: Date | null;
  current_cycle: number;
  total_cycles: number;
  errors_count: number;
  updated_at: Date;
}

// ========== CANDLE INTERVALS ==========
export type CandleInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
