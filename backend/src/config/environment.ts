// Environment Configuration
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Auto-generate SESSION_SECRET if not provided
const generateSessionSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/allie_agent',
  },
  session: {
    secret: process.env.SESSION_SECRET || generateSessionSecret(),
    expirationHours: 24,
  },
  hyperliquid: {
    apiKey: process.env.HYPERLIQUID_API_KEY || '',
    privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || '',
    walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS || '',
    testnet: process.env.HYPERLIQUID_TESTNET !== 'false', // Default true for safety
  },
  ai: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.AI_MODEL || 'moonshot/kimi-k2',
  },
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  trading: {
    symbol: process.env.TRADING_SYMBOL || 'BTC-PERP',
    analysisIntervalMinutes: parseInt(process.env.ANALYSIS_INTERVAL || '5', 10),
    maxPositionSizePercent: parseFloat(process.env.MAX_POSITION_SIZE_PCT || '10'),
    maxDailyLossPercent: parseFloat(process.env.MAX_DAILY_LOSS_PCT || '5'),
    maxDrawdownPercent: parseFloat(process.env.MAX_DRAWDOWN_PCT || '15'),
    maxLeverage: parseInt(process.env.MAX_LEVERAGE || '5', 10),
    maxPositions: parseInt(process.env.MAX_POSITIONS || '3', 10),
    minConfidence: parseInt(process.env.MIN_CONFIDENCE || '70', 10),
    minRiskRewardRatio: parseFloat(process.env.MIN_RISK_REWARD || '1.5'),
    maxConsecutiveLosses: parseInt(process.env.MAX_CONSECUTIVE_LOSSES || '3', 10),
    cooldownMinutes: parseInt(process.env.COOLDOWN_MINUTES || '30', 10),
    maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PCT || '0.5'),
    stopLossPercent: parseFloat(process.env.DEFAULT_STOP_LOSS_PCT || '2'),
    takeProfitPercent: parseFloat(process.env.DEFAULT_TAKE_PROFIT_PCT || '4'),
  },
};

// Validate required env vars
export function validateConfig() {
  const required = [
    'DATABASE_URL',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Info: SESSION_SECRET auto-generated if not provided
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠ SESSION_SECRET not set - using auto-generated secret (sessions will reset on restart)');
  }

  // Warn if trading keys are missing (but don't block)
  if (!process.env.HYPERLIQUID_API_KEY) {
    console.warn('⚠ HYPERLIQUID_API_KEY not set - trading will not work');
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('⚠ OPENROUTER_API_KEY not set - AI analysis will not work');
  }
}
