// Activity Log Routes
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { loggingService } from '../services/LoggingService';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireAuth);
router.use(apiLimiter);

// Get activity logs with pagination and filtering
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    const category = req.query.category as string | undefined;
    const severity = req.query.severity as string | undefined;

    const { logs, total } = await loggingService.getActivityLogs(limit, offset, category, severity);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get activity logs', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
