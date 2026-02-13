import { pool } from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

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
    let apiKeys: SettingsData['apiKeys'] = {
      hyperliquid: { apiKey: '', privateKey: '', testnet: true },
      openrouter: { apiKey: '' },
    };
    if (settings.api_keys_encrypted && settings.api_keys_iv && settings.api_keys_tag) {
      try {
        logger.info('[Settings] Attempting to decrypt API keys...');
        const decrypted = decrypt(
          settings.api_keys_encrypted,
          settings.api_keys_iv,
          settings.api_keys_tag
        );
        apiKeys = JSON.parse(decrypted);
        const hasHL = !!(apiKeys?.hyperliquid?.apiKey || apiKeys?.hyperliquid?.privateKey);
        const hasOR = !!apiKeys?.openrouter?.apiKey;
        logger.info(`[Settings] Decrypt OK — Hyperliquid keys: ${hasHL}, OpenRouter key: ${hasOR}`);
      } catch (error: any) {
        logger.error(`[Settings] Decrypt FAILED: ${error.message}`);
        // Keep the default empty keys so the UI doesn't break
      }
    } else {
      logger.info('[Settings] No encrypted API keys found in DB row');
    }

    return {
      apiKeys,
      riskManagement: settings.risk_management || {
        maxPositionSize: 10,
        maxDailyLoss: 5,
        stopLossPercent: 2,
        takeProfitPercent: 5,
      },
      strategy: settings.strategy || {
        type: 'balanced',
        timeframe: '15m',
        minConfidence: 70,
      },
      notifications: settings.notifications || {
        email: false,
        tradeAlerts: true,
        dailyReport: false,
      },
      onboardingCompleted: settings.onboarding_completed || false,
    };
  }

  // Update settings
  static async updateSettings(userId: number, settingsData: SettingsData): Promise<SettingsData> {
    // Encrypt API keys — but only if at least one key has a non-empty value.
    // This prevents overwriting valid encrypted keys when the frontend sends
    // empty keys (e.g. because a previous decrypt failed on page load).
    let apiKeysEncrypted = null;
    let apiKeysIv = null;
    let apiKeysTag = null;

    const hasAnyKey =
      settingsData.apiKeys?.hyperliquid?.apiKey ||
      settingsData.apiKeys?.hyperliquid?.privateKey ||
      settingsData.apiKeys?.openrouter?.apiKey;

    if (settingsData.apiKeys && hasAnyKey) {
      logger.info(`[Settings] Encrypting new API keys (hasHL: ${!!(settingsData.apiKeys.hyperliquid?.apiKey || settingsData.apiKeys.hyperliquid?.privateKey)}, hasOR: ${!!settingsData.apiKeys.openrouter?.apiKey})`);
      const { encrypted, iv, tag } = encrypt(JSON.stringify(settingsData.apiKeys));
      apiKeysEncrypted = encrypted;
      apiKeysIv = iv;
      apiKeysTag = tag;
      logger.info('[Settings] Encryption successful');
    }

    // If no new keys provided, preserve existing encrypted keys in DB
    if (!hasAnyKey) {
      logger.info('[Settings] No API keys in request — preserving existing DB keys');
      const existing = await pool.query(
        'SELECT api_keys_encrypted, api_keys_iv, api_keys_tag FROM user_settings WHERE user_id = $1',
        [userId]
      );
      if (existing.rows.length > 0 && existing.rows[0].api_keys_encrypted) {
        apiKeysEncrypted = existing.rows[0].api_keys_encrypted;
        apiKeysIv = existing.rows[0].api_keys_iv;
        apiKeysTag = existing.rows[0].api_keys_tag;
      }
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
