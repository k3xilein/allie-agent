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
