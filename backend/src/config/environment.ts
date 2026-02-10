// Environment Configuration
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/allie_agent',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    expirationHours: 24,
  },
  hyperliquid: {
    apiKey: process.env.HYPERLIQUID_API_KEY || '',
    privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || '',
    testnet: process.env.HYPERLIQUID_TESTNET === 'true',
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
    analysisIntervalMinutes: 5,
    maxPositionSizePercent: 10, // Max 10% of balance per trade
    minConfidence: 70, // Min AI confidence to execute trade
  },
};

// Validate required env vars
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'SESSION_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn if trading keys are missing (but don't block)
  if (!process.env.HYPERLIQUID_API_KEY) {
    console.warn('⚠ HYPERLIQUID_API_KEY not set - trading will not work');
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('⚠ OPENROUTER_API_KEY not set - AI analysis will not work');
  }
}
