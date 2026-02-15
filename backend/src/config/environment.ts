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
    model: process.env.AI_MODEL || 'google/gemini-2.0-flash-001',
  },
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  trading: {
    symbol: process.env.TRADING_SYMBOL || 'SOL-PERP',
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

/**
 * Load API keys from the database (user_settings) into the runtime config.
 * Called once on startup and again whenever settings are saved.
 * DB keys take priority over env vars — if a user enters keys in the UI, those win.
 */
export async function loadSettingsIntoConfig(): Promise<void> {
  try {
    // Dynamic import to avoid circular dependency (pool → config → pool)
    const { pool } = await import('./database');
    const { decrypt } = await import('../utils/encryption');

    // Find the first user that has settings (single-user system)
    const result = await pool.query(
      'SELECT api_keys_encrypted, api_keys_iv, api_keys_tag, risk_management, strategy FROM user_settings ORDER BY id LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('ℹ No user settings found in DB — using environment variables');
      return;
    }

    const row = result.rows[0];

    // Decrypt API keys if present
    if (row.api_keys_encrypted && row.api_keys_iv && row.api_keys_tag) {
      try {
        const decrypted = decrypt(row.api_keys_encrypted, row.api_keys_iv, row.api_keys_tag);
        const apiKeys = JSON.parse(decrypted);

        // Override config with DB values (only if non-empty)
        if (apiKeys.hyperliquid?.apiKey) {
          config.hyperliquid.apiKey = apiKeys.hyperliquid.apiKey;
        }
        if (apiKeys.hyperliquid?.privateKey) {
          config.hyperliquid.privateKey = apiKeys.hyperliquid.privateKey;
        }
        if (apiKeys.hyperliquid?.walletAddress) {
          config.hyperliquid.walletAddress = apiKeys.hyperliquid.walletAddress;
        }
        if (typeof apiKeys.hyperliquid?.testnet === 'boolean') {
          config.hyperliquid.testnet = apiKeys.hyperliquid.testnet;
        }
        if (apiKeys.openrouter?.apiKey) {
          config.ai.apiKey = apiKeys.openrouter.apiKey;
        }

        console.log('✅ Loaded API keys from database settings into runtime config');
      } catch (decryptErr) {
        console.error('⚠ Failed to decrypt API keys from DB — using env vars:', decryptErr);
      }
    }

    // Load risk management settings if present
    const risk = row.risk_management;
    if (risk && typeof risk === 'object') {
      if (risk.maxPositionSize) config.trading.maxPositionSizePercent = risk.maxPositionSize;
      if (risk.maxDailyLoss) config.trading.maxDailyLossPercent = risk.maxDailyLoss;
      if (risk.stopLossPercent) config.trading.stopLossPercent = risk.stopLossPercent;
      if (risk.takeProfitPercent) config.trading.takeProfitPercent = risk.takeProfitPercent;
    }

    // Load strategy settings if present
    const strat = row.strategy;
    if (strat && typeof strat === 'object') {
      if (strat.minConfidence) config.trading.minConfidence = strat.minConfidence;
    }
  } catch (error) {
    console.error('⚠ Could not load settings from DB — using environment variables:', error);
  }
}

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
