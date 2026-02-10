import { pool } from '../config/database';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

interface SettingsData {
  apiKeys?: {
    hyperliquid?: {
      apiKey: string;
      privateKey: string;
      testnet: boolean;
    };
    openrouter?: {
      apiKey: string;
    };
  };
  riskManagement?: {
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossPercent: number;
    takeProfitPercent: number;
  };
  strategy?: {
    type: string;
    timeframe: string;
    minConfidence: number;
  };
  notifications?: {
    email: boolean;
    tradeAlerts: boolean;
    dailyReport: boolean;
  };
  onboardingCompleted?: boolean;
}

export class SettingsService {
  // Encrypt sensitive data
  private static encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  // Decrypt sensitive data
  private static decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Get user settings
  static async getSettings(userId: number): Promise<SettingsData> {
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default settings
      return {
        apiKeys: {
          hyperliquid: {
            apiKey: '',
            privateKey: '',
            testnet: true,
          },
          openrouter: {
            apiKey: '',
          },
        },
        riskManagement: {
          maxPositionSize: 10,
          maxDailyLoss: 5,
          stopLossPercent: 2,
          takeProfitPercent: 5,
        },
        strategy: {
          type: 'balanced',
          timeframe: '15m',
          minConfidence: 70,
        },
        notifications: {
          email: false,
          tradeAlerts: true,
          dailyReport: false,
        },
        onboardingCompleted: false,
      };
    }

    const settings = result.rows[0];

    // Decrypt API keys if they exist
    let apiKeys = settings.api_keys;
    if (settings.api_keys_encrypted && settings.api_keys_iv && settings.api_keys_tag) {
      try {
        const decrypted = this.decrypt(
          settings.api_keys_encrypted,
          settings.api_keys_iv,
          settings.api_keys_tag
        );
        apiKeys = JSON.parse(decrypted);
      } catch (error) {
        console.error('Failed to decrypt API keys:', error);
      }
    }

    return {
      apiKeys: apiKeys || {
        hyperliquid: { apiKey: '', privateKey: '', testnet: true },
        openrouter: { apiKey: '' },
      },
      riskManagement: settings.risk_management || {},
      strategy: settings.strategy || {},
      notifications: settings.notifications || {},
      onboardingCompleted: settings.onboarding_completed || false,
    };
  }

  // Update settings
  static async updateSettings(userId: number, settingsData: SettingsData): Promise<SettingsData> {
    // Encrypt API keys
    let apiKeysEncrypted = null;
    let apiKeysIv = null;
    let apiKeysTag = null;

    if (settingsData.apiKeys) {
      const { encrypted, iv, tag } = this.encrypt(JSON.stringify(settingsData.apiKeys));
      apiKeysEncrypted = encrypted;
      apiKeysIv = iv;
      apiKeysTag = tag;
    }

    await pool.query(
      `INSERT INTO user_settings 
        (user_id, api_keys_encrypted, api_keys_iv, api_keys_tag, risk_management, strategy, notifications, onboarding_completed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        api_keys_encrypted = EXCLUDED.api_keys_encrypted,
        api_keys_iv = EXCLUDED.api_keys_iv,
        api_keys_tag = EXCLUDED.api_keys_tag,
        risk_management = EXCLUDED.risk_management,
        strategy = EXCLUDED.strategy,
        notifications = EXCLUDED.notifications,
        onboarding_completed = EXCLUDED.onboarding_completed,
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        apiKeysEncrypted,
        apiKeysIv,
        apiKeysTag,
        JSON.stringify(settingsData.riskManagement || {}),
        JSON.stringify(settingsData.strategy || {}),
        JSON.stringify(settingsData.notifications || {}),
        settingsData.onboardingCompleted || false,
      ]
    );

    return this.getSettings(userId);
  }

  // Save onboarding settings
  static async saveOnboarding(userId: number, settingsData: SettingsData): Promise<SettingsData> {
    return this.updateSettings(userId, {
      ...settingsData,
      onboardingCompleted: true,
    });
  }

  // Check if onboarding is completed
  static async isOnboardingCompleted(userId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT onboarding_completed FROM user_settings WHERE user_id = $1',
      [userId]
    );

    return result.rows.length > 0 && result.rows[0].onboarding_completed === true;
  }
}
