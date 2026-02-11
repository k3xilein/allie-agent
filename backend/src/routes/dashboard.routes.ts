// Dashboard Routes
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { tradingService } from '../services/TradingService';
import { loggingService } from '../services/LoggingService';
import { agentStateService } from '../services/AgentStateService';
import { logger } from '../utils/logger';
import pool from '../config/database';

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
    const engineStatus = tradingService.getEngineStatus();

    // Calculate real PnL from database
    const totalPnLResult = await pool.query(
      `SELECT 
        COALESCE(SUM(realized_pnl), 0) as total_pnl,
        COUNT(*) as total_trades
      FROM trades WHERE realized_pnl IS NOT NULL`
    );
    const totalPnLAbs = parseFloat(totalPnLResult.rows[0]?.total_pnl || '0');

    const todayPnLResult = await pool.query(
      `SELECT COALESCE(SUM(realized_pnl), 0) as today_pnl
      FROM trades 
      WHERE realized_pnl IS NOT NULL 
        AND exit_timestamp >= CURRENT_DATE`
    );
    const todayPnLAbs = parseFloat(todayPnLResult.rows[0]?.today_pnl || '0');

    // Win rate
    const winRateResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE realized_pnl > 0) as wins,
        COUNT(*) FILTER (WHERE realized_pnl <= 0) as losses
      FROM trades WHERE realized_pnl IS NOT NULL`
    );
    const wins = parseInt(winRateResult.rows[0]?.wins || '0');
    const losses = parseInt(winRateResult.rows[0]?.losses || '0');
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;

    // Unrealized PnL from open positions
    const unrealizedPnL = activePositions.reduce((sum, p) => sum + p.unrealizedPnL.absolute, 0);

    res.json({
      agentStatus: state.status,
      accountBalance: balance.totalBalance,
      availableBalance: balance.availableBalance,
      totalPnL: { 
        absolute: totalPnLAbs, 
        percentage: balance.totalBalance > 0 ? (totalPnLAbs / balance.totalBalance * 100) : 0,
      },
      todayPnL: { 
        absolute: todayPnLAbs,
        percentage: balance.totalBalance > 0 ? (todayPnLAbs / balance.totalBalance * 100) : 0,
      },
      unrealizedPnL,
      activePositions: activePositions.length,
      positions: activePositions,
      totalTrades,
      winRate: winRate.toFixed(1),
      engine: engineStatus,
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

    // Get real total count from DB
    const countResult = await pool.query('SELECT COUNT(*) as total FROM trades WHERE exit_timestamp IS NOT NULL');
    const totalTrades = parseInt(countResult.rows[0]?.total || '0');
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
