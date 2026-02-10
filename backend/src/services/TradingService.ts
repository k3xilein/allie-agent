// Trading Service
import pool from '../config/database';
import { Position, AccountBalance, OrderResult, CloseAllResult, RiskCheckResult, TradeDecision } from '../models/types';
import { hyperliquidClient } from './HyperliquidClient';
import { loggingService } from './LoggingService';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

export class TradingService {
  async executeMarketOrder(decision: TradeDecision): Promise<OrderResult> {
    try {
      // Get account balance
      const balance = await hyperliquidClient.getAccountInfo();
      
      // Determine side
      const side = decision.action === 'OPEN_LONG' ? 'buy' : 'sell';
      const size = decision.suggestedSize / 45000; // Mock conversion to BTC
      
      // Place order
      const result = await hyperliquidClient.placeMarketOrder('BTC/USDT', side, size);
      
      if (result.success) {
        // Log trade
        await loggingService.logTrade({
          symbol: 'BTC/USDT',
          side: decision.action === 'OPEN_LONG' ? 'long' : 'short',
          entry_price: result.fillPrice!,
          size: result.filledSize!,
          entry_timestamp: new Date(),
          strategy: decision.strategy,
          ai_reasoning: decision.reasoning,
          market_context: {
            entryConditions: `Confidence: ${decision.confidence}%`,
          },
        });

        logger.info('Trade executed successfully', { 
          action: decision.action, 
          size: result.filledSize 
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to execute market order', { error });
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async closeAllPositions(): Promise<CloseAllResult> {
    try {
      const result = await hyperliquidClient.closeAllPositions();
      
      if (result.success) {
        await loggingService.logSystemEvent(
          'POSITIONS_CLOSED',
          'INFO',
          { count: result.closed }
        );
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to close all positions', { error });
      return {
        success: false,
        attempted: 0,
        closed: 0,
        failed: 0,
        failedPositions: [],
      };
    }
  }

  async getActivePositions(): Promise<Position[]> {
    return await hyperliquidClient.getOpenPositions();
  }

  async getAccountBalance(): Promise<AccountBalance> {
    return await hyperliquidClient.getAccountInfo();
  }

  async canExecuteTrade(decision: TradeDecision): Promise<RiskCheckResult> {
    try {
      // Check if action is HOLD or CLOSE (always allowed)
      if (decision.action === 'HOLD' || decision.action === 'CLOSE') {
        return { approved: true };
      }

      // Check confidence
      if (decision.confidence < config.trading.minConfidence) {
        return {
          approved: false,
          reason: `Confidence too low: ${decision.confidence}% (min: ${config.trading.minConfidence}%)`,
        };
      }

      // Check account balance
      const balance = await this.getAccountBalance();
      const maxSize = balance.availableBalance * (config.trading.maxPositionSizePercent / 100);
      
      if (decision.suggestedSize > maxSize) {
        return {
          approved: false,
          reason: `Position size too large: $${decision.suggestedSize} (max: $${maxSize.toFixed(2)})`,
        };
      }

      // Check if already have open position (MVP: max 1 position)
      const activeTrade = await loggingService.getActiveTrade();
      if (activeTrade) {
        return {
          approved: false,
          reason: 'Already have an open position (MVP limit: 1 position)',
        };
      }

      return { approved: true };
    } catch (error) {
      logger.error('Risk check failed', { error });
      return {
        approved: false,
        reason: 'Risk check error',
      };
    }
  }
}

export const tradingService = new TradingService();
