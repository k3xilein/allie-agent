// Agent Control Routes
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { controlLimiter } from '../middleware/rateLimiter';
import { agentStateService } from '../services/AgentStateService';
import { tradingService } from '../services/TradingService';
import { loggingService } from '../services/LoggingService';
import { emergencyStopSchema } from '../utils/validation';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireAuth);
router.use(controlLimiter);

// Start agent
router.post('/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = await agentStateService.getState();

    if (state.status === 'emergency_stop') {
      res.status(400).json({ 
        success: false, 
        error: 'Cannot start: Emergency stop active' 
      });
      return;
    }

    if (state.status === 'running') {
      res.status(409).json({ 
        success: false, 
        error: 'Agent is already running' 
      });
      return;
    }

    await agentStateService.updateStatus('running');
    await loggingService.logSystemEvent('AGENT_START', 'INFO', {}, req.user.id);
    await loggingService.logAuditAction('START', req.user.id, 'SUCCESS', req.ip);

    res.json({
      success: true,
      status: 'running',
      message: 'Trading agent started successfully',
    });
  } catch (error: any) {
    logger.error('Failed to start agent', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop agent
router.post('/stop', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = await agentStateService.getState();

    if (state.status !== 'running') {
      res.status(409).json({ 
        success: false, 
        error: 'Agent is not running' 
      });
      return;
    }

    await agentStateService.updateStatus('stopped');
    
    const activePositions = await tradingService.getActivePositions();
    
    await loggingService.logSystemEvent('AGENT_STOP', 'INFO', {}, req.user.id);
    await loggingService.logAuditAction('STOP', req.user.id, 'SUCCESS', req.ip);

    res.json({
      success: true,
      status: 'stopped',
      message: 'Trading agent stopped. Open positions remain active.',
      openPositions: activePositions.length,
    });
  } catch (error: any) {
    logger.error('Failed to stop agent', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emergency stop
router.post('/emergency-stop', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validation = emergencyStopSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid confirmation code' 
      });
      return;
    }

    // Close all positions
    const closeResult = await tradingService.closeAllPositions();

    // Set emergency status
    await agentStateService.updateStatus('emergency_stop');

    await loggingService.logSystemEvent(
      'EMERGENCY_STOP',
      'WARNING',
      { closedPositions: closeResult.closed },
      req.user.id
    );
    await loggingService.logAuditAction(
      'EMERGENCY_STOP',
      req.user.id,
      closeResult.success ? 'SUCCESS' : 'FAILURE',
      req.ip,
      closeResult
    );

    if (!closeResult.success) {
      res.status(500).json({
        success: false,
        error: 'Failed to close all positions',
        details: closeResult,
      });
      return;
    }

    res.json({
      success: true,
      status: 'emergency_stop',
      message: 'Emergency stop executed',
      closedPositions: closeResult.closed,
      details: {
        positionsClosed: closeResult.closed,
        totalPnL: 0, // Would calculate from actual trades
      },
    });
  } catch (error: any) {
    logger.error('Emergency stop failed', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset emergency
router.post('/reset-emergency', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = await agentStateService.getState();

    if (state.status !== 'emergency_stop') {
      res.status(400).json({ 
        success: false, 
        error: 'Not in emergency mode' 
      });
      return;
    }

    await agentStateService.updateStatus('stopped');
    await loggingService.logSystemEvent('EMERGENCY_RESET', 'INFO', {}, req.user.id);
    await loggingService.logAuditAction('EMERGENCY_RESET', req.user.id, 'SUCCESS', req.ip);

    res.json({
      success: true,
      status: 'stopped',
      message: 'Emergency mode reset successfully',
    });
  } catch (error: any) {
    logger.error('Failed to reset emergency', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent status
router.get('/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = await agentStateService.getState();

    res.json({
      status: state.status,
      uptime: state.last_analysis_at ? 
        Math.floor((Date.now() - new Date(state.last_analysis_at).getTime()) / 1000) : 
        0,
      lastAction: {
        action: 'start', // Would track from logs
        timestamp: state.updated_at,
        user: 'admin',
      },
    });
  } catch (error: any) {
    logger.error('Failed to get agent status', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
