// Dashboard Routes
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { tradingService } from '../services/TradingService';
import { loggingService } from '../services/LoggingService';
import { agentStateService } from '../services/AgentStateService';
import { logger } from '../utils/logger';

const router = Router();

// All dashboard routes require authentication
router.use(requireAuth);
router.use(apiLimiter);

// Dashboard overview
router.get('/overview', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = await agentStateService.getState();
    const balance = await tradingService.getAccountBalance();
    const activePositions = await tradingService.getActivePositions();

    // Calculate PnL (mock for now)
    const totalPnL = { absolute: 250.50, percentage: 2.51 };
    const todayPnL = { absolute: -45.20, percentage: -0.45 };

    res.json({
      agentStatus: state.status,
      accountBalance: balance.totalBalance,
      totalPnL,
      todayPnL,
      activePositions: activePositions.length,
    });
  } catch (error: any) {
    logger.error('Failed to get dashboard overview', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Active positions
router.get('/active', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const positions = await tradingService.getActivePositions();
    res.json({ positions });
  } catch (error: any) {
    logger.error('Failed to get active positions', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trade history
router.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const trades = await loggingService.getRecentTrades(limit, offset);

    // Get total count (mock for now)
    const totalTrades = 98;
    const totalPages = Math.ceil(totalTrades / limit);

    res.json({
      trades,
      pagination: {
        currentPage: page,
        totalPages,
        totalTrades,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get trade history', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Single trade details
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Query single trade
    const result = await loggingService.getRecentTrades(1, 0);
    const trade = result[0];

    if (!trade) {
      res.status(404).json({ success: false, error: 'Trade not found' });
      return;
    }

    res.json({ trade });
  } catch (error: any) {
    logger.error('Failed to get trade details', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
