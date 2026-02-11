// Trading Service - Facade for TradingEngine
// This module provides backward-compatible API while delegating to the new TradingEngine
import { Position, AccountBalance, CloseAllResult } from '../models/types';
import { hyperliquidClient } from './HyperliquidClient';
import { tradingEngine } from './TradingEngine';
import { loggingService } from './LoggingService';
import { logger } from '../utils/logger';

export class TradingService {
  // Start the trading engine loop
  async startEngine(): Promise<void> {
    await tradingEngine.start();
  }

  // Stop the trading engine loop
  async stopEngine(): Promise<void> {
    await tradingEngine.stop();
  }

  // Emergency: close all positions and stop engine
  async emergencyStop(): Promise<CloseAllResult> {
    await tradingEngine.stop();
    const result = await hyperliquidClient.closeAllPositions();
    if (result.success) {
      await loggingService.logSystemEvent('EMERGENCY_POSITIONS_CLOSED', 'WARNING', {
        closed: result.closed,
        totalPnL: result.totalPnL,
      });
    }
    return result;
  }

  async closeAllPositions(): Promise<CloseAllResult> {
    try {
      const result = await hyperliquidClient.closeAllPositions();
      if (result.success) {
        await loggingService.logSystemEvent('POSITIONS_CLOSED', 'INFO', { count: result.closed });
      }
      return result;
    } catch (error) {
      logger.error('Failed to close all positions', { error });
      return { success: false, attempted: 0, closed: 0, failed: 0, failedPositions: [], totalPnL: 0 };
    }
  }

  async getActivePositions(): Promise<Position[]> {
    return await hyperliquidClient.getOpenPositions();
  }

  async getAccountBalance(): Promise<AccountBalance> {
    return await hyperliquidClient.getAccountInfo();
  }

  // Get engine status for dashboard
  getEngineStatus() {
    return tradingEngine.getStatus();
  }
}

export const tradingService = new TradingService();
