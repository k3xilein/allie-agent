import { Router } from 'express';
import { SettingsService } from '../services/SettingsService';
import { authenticateSession } from '../middleware/auth';

const router = Router();

// GET /api/settings - Get user settings
router.get('/', authenticateSession, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const settings = await SettingsService.getSettings(userId);
    
    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/settings - Update settings
router.put('/', authenticateSession, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const settingsData = req.body;
    
    const updated = await SettingsService.updateSettings(userId, settingsData);
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/settings/onboarding - Save initial onboarding settings
router.post('/onboarding', authenticateSession, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const settingsData = req.body;
    
    // Mark onboarding as completed
    const settings = {
      ...settingsData,
      onboardingCompleted: true,
    };
    
    const saved = await SettingsService.saveOnboarding(userId, settings);
    
    res.json(saved);
  } catch (error) {
    console.error('Error saving onboarding:', error);
    res.status(500).json({ error: 'Failed to save onboarding settings' });
  }
});

export default router;
