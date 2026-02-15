import { Router, Request, Response } from 'express';
import { SettingsService } from '../services/SettingsService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { loadSettingsIntoConfig } from '../config/environment';
import { hyperliquidClient } from '../services/HyperliquidClient';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/settings - Get user settings
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const settings = await SettingsService.getSettings(userId);
    
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/settings - Update settings
router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const settingsData = req.body;
    
    const updated = await SettingsService.updateSettings(userId, settingsData);
    
    // Reload API keys + settings into runtime config so services use updated values
    await loadSettingsIntoConfig();
    
    // Force reconnect with new credentials
    hyperliquidClient.reconnect().catch(err => 
      logger.warn('HyperliquidClient reconnect after settings save:', { error: String(err) })
    );
    
    res.json(updated);
  } catch (error: any) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  }
});

// POST /api/settings/onboarding - Save initial onboarding settings
router.post('/onboarding', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const settingsData = req.body;
    
    // Mark onboarding as completed
    const settings = {
      ...settingsData,
      onboardingCompleted: true,
    };
    
    const saved = await SettingsService.saveOnboarding(userId, settings);
    
    // Reload API keys + settings into runtime config
    await loadSettingsIntoConfig();
    
    // Force reconnect with new credentials
    hyperliquidClient.reconnect().catch(err => 
      logger.warn('HyperliquidClient reconnect after onboarding save:', { error: String(err) })
    );
    
    res.json(saved);
  } catch (error) {
    console.error('Error saving onboarding:', error);
    res.status(500).json({ error: 'Failed to save onboarding settings' });
  }
});

export default router;
