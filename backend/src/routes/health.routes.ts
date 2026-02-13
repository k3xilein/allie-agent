// Health Check Routes
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { healthCheckService } from '../services/HealthCheckService';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireAuth);
router.use(apiLimiter);

// Full diagnostics (runs all checks live)
router.get('/check', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const includeTestTrade = req.query.testTrade === 'true';
    const report = await healthCheckService.runFullCheck(includeTestTrade);
    res.json(report);
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Cached last result (fast, for polling)
router.get('/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = healthCheckService.getLastReport();
    if (!report) {
      res.json({ timestamp: null, overall: 'unknown', checks: [], readyToTrade: false });
      return;
    }
    res.json(report);
  } catch (error: any) {
    logger.error('Health status failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
