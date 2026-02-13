// Trading Engine - Main Orchestrator
// Coordinates: Market Analysis → AI Decision → Risk Check → Order Execution → Position Management
import * as cron from 'node-cron';
import pool from '../config/database';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { hyperliquidClient } from './HyperliquidClient';
import { marketAnalysisEngine } from './MarketAnalysisEngine';
import { aiService } from './AIService';
import { riskManagementEngine } from './RiskManagementEngine';
import { agentStateService } from './AgentStateService';
import { loggingService } from './LoggingService';
import { healthCheckService } from './HealthCheckService';
import { TradeDecision, Position, AccountBalance } from '../models/types';

export class TradingEngine {
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;
  private cycleCount: number = 0;
  private errorCount: number = 0;
  private maxConsecutiveErrors: number = 5;
  private consecutiveErrors: number = 0;
  private symbol: string;

  constructor() {
    this.symbol = config.trading.symbol;
  }

  // ============ ENGINE LIFECYCLE ============
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Trading engine already running');
      return;
    }

    logger.info('🚀 Starting Trading Engine', { symbol: this.symbol });

    // Run pre-start health check
    logger.info('🩺 Running pre-start diagnostics...');
    const healthResult = await healthCheckService.preStartCheck();
    if (!healthResult.ok) {
      const failMsg = healthResult.failures.join('; ');
      logger.error(`❌ Pre-start check failed: ${failMsg}`);
      throw new Error(`Pre-start check failed: ${failMsg}`);
    }
    logger.info('✅ Pre-start diagnostics passed');

    // Validate Hyperliquid connection
    const connected = await hyperliquidClient.validateConnection();
    if (!connected) {
      logger.warn('⚠️ Hyperliquid not connected. Engine will run in analysis-only mode.');
    }

    this.isRunning = true;
    this.consecutiveErrors = 0;

    // Set up cron schedule (every N minutes)
    const intervalMinutes = config.trading.analysisIntervalMinutes;
    const cronExpression = `*/${intervalMinutes} * * * *`;
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.executeCycle();
    });

    // Run first cycle immediately
    await this.executeCycle();

    logger.info(`✅ Trading Engine started. Cycle every ${intervalMinutes} minutes.`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    logger.info('⏹ Trading Engine stopped', { 
      totalCycles: this.cycleCount,
      totalErrors: this.errorCount,
    });
  }

  // ============ MAIN TRADING CYCLE ============
  async executeCycle(): Promise<void> {
    if (!this.isRunning) return;

    // Check if agent should still be running
    const agentState = await agentStateService.getState().catch(() => null);
    if (!agentState || agentState.status !== 'running') {
      logger.info('Agent not in running state, skipping cycle');
      return;
    }

    this.cycleCount++;
    const cycleStart = Date.now();
    
    logger.info(`📊 === Trading Cycle #${this.cycleCount} ===`, { symbol: this.symbol });

    try {
      // Step 1: Get Market Data & Technical Analysis
      logger.info('Step 1: Fetching market data...');
      const marketData = await marketAnalysisEngine.getFullMarketData(this.symbol);
      logger.info(`Market: $${marketData.currentPrice.toFixed(2)} | Regime: ${marketData.marketRegime} | Vol: ${marketData.indicators.volatilityPercentile.toFixed(0)}th pctl`);

      // Step 2: Generate Technical Signal
      logger.info('Step 2: Generating technical signal...');
      const technicalSignal = marketAnalysisEngine.generateSignal(marketData);
      logger.info(`Technical Signal: ${technicalSignal.action} | Confluence: ${technicalSignal.confluenceScore} | Confidence: ${technicalSignal.confidence.toFixed(0)}%`);

      // Step 3: Get Current State
      const [balance, positions] = await Promise.all([
        hyperliquidClient.getAccountInfo(),
        hyperliquidClient.getOpenPositions(),
      ]);
      logger.info(`Account: $${balance.totalBalance.toFixed(2)} | Positions: ${positions.length}`);

      // Step 4: Check Existing Positions for Exit
      await this.checkPositionExits(positions, marketData.currentPrice);

      // Step 5: AI Analysis (combines technical + fundamental)
      logger.info('Step 5: Running AI analysis...');
      const aiDecision = await aiService.analyzeMarket(
        marketData,
        technicalSignal,
        positions,
        balance.totalBalance
      );
      logger.info(`AI Decision: ${aiDecision.action} | Confidence: ${aiDecision.confidence}% | Strategy: ${aiDecision.strategy}`);

      // Step 6: Risk Management Check
      if (aiDecision.action !== 'HOLD') {
        logger.info('Step 6: Risk check...');
        
        // Calculate position size based on balance
        const sizePercent = config.trading.maxPositionSizePercent;
        aiDecision.suggestedSize = balance.availableBalance * (sizePercent / 100);

        const riskResult = await riskManagementEngine.evaluateTrade(aiDecision, balance, positions);

        if (!riskResult.approved) {
          logger.info(`❌ Trade REJECTED by risk engine: ${riskResult.reason}`);
          await this.logCycleResult(aiDecision, false, riskResult.reason || 'Risk rejected');
        } else {
          // Apply risk-adjusted values
          if (riskResult.adjustedSize) aiDecision.suggestedSize = riskResult.adjustedSize;
          if (riskResult.adjustedLeverage) aiDecision.suggestedLeverage = riskResult.adjustedLeverage;

          if (riskResult.warnings && riskResult.warnings.length > 0) {
            logger.warn('Risk warnings:', { warnings: riskResult.warnings });
          }

          // Step 7: Execute Trade
          await this.executeTrade(aiDecision, balance, marketData.currentPrice);
        }
      } else {
        logger.info('📌 Decision: HOLD - No action taken');
      }

      // Update agent state
      await agentStateService.updateLastAnalysis();
      
      // Reset error counter on success
      this.consecutiveErrors = 0;

      const cycleDuration = Date.now() - cycleStart;
      logger.info(`✅ Cycle #${this.cycleCount} completed in ${cycleDuration}ms`);

    } catch (error: any) {
      this.errorCount++;
      this.consecutiveErrors++;

      logger.error(`❌ Cycle #${this.cycleCount} failed`, { 
        error: error.message,
        consecutiveErrors: this.consecutiveErrors,
      });

      // Auto-stop after too many consecutive errors
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        logger.error('🚨 Too many consecutive errors! Auto-stopping engine.');
        await agentStateService.updateStatus('stopped');
        await this.stop();
        await loggingService.logSystemEvent(
          'ENGINE_AUTO_STOP',
          'ERROR',
          { reason: `${this.consecutiveErrors} consecutive errors`, lastError: error.message }
        );
      }
    }
  }

  // ============ TRADE EXECUTION ============
  private async executeTrade(
    decision: TradeDecision,
    balance: AccountBalance,
    currentPrice: number
  ): Promise<void> {
    logger.info('🔄 Executing trade...', {
      action: decision.action,
      size: `$${decision.suggestedSize.toFixed(2)}`,
      leverage: `${decision.suggestedLeverage}x`,
      stopLoss: decision.stopLoss,
      takeProfit: decision.takeProfit,
    });

    if (decision.action === 'CLOSE') {
      // Close existing position
      const result = await hyperliquidClient.closeAllPositions();
      if (result.success) {
        logger.info('✅ Positions closed', { closed: result.closed, pnl: result.totalPnL });
        riskManagementEngine.recordTradeResult(result.totalPnL);
        await agentStateService.updateLastTrade();
      } else {
        logger.error('Failed to close positions', { failed: result.failed });
      }
      return;
    }

    // OPEN_LONG or OPEN_SHORT
    const side = decision.action === 'OPEN_LONG' ? 'buy' : 'sell';
    const sizeInAsset = decision.suggestedSize / currentPrice;

    const result = await hyperliquidClient.placeMarketOrder(
      this.symbol,
      side,
      sizeInAsset,
      decision.suggestedLeverage,
      config.trading.maxSlippagePercent
    );

    if (result.success) {
      logger.info('✅ Trade executed', {
        orderId: result.orderId,
        fillPrice: result.fillPrice,
        filledSize: result.filledSize,
        slippage: `${result.slippage?.toFixed(4)}%`,
        executionTime: `${result.executionTimeMs}ms`,
      });

      // Log trade to database
      await loggingService.logTrade({
        symbol: this.symbol,
        side: decision.action === 'OPEN_LONG' ? 'long' : 'short',
        entry_price: result.fillPrice!,
        size: result.filledSize!,
        entry_timestamp: new Date(),
        strategy: decision.strategy,
        ai_reasoning: decision.reasoning,
        market_context: {
          entryConditions: `Confidence: ${decision.confidence}% | R:R: ${decision.riskRewardRatio.toFixed(2)} | Regime: ${decision.marketRegime}`,
          rsi: 0,
          macd: 0,
          market_regime: decision.marketRegime,
        },
      });

      // Place stop loss and take profit orders
      if (decision.stopLoss) {
        const stopSide = decision.action === 'OPEN_LONG' ? 'sell' : 'buy';
        await hyperliquidClient.placeStopOrder(
          this.symbol, stopSide, sizeInAsset, decision.stopLoss, 'stop_loss'
        );
      }

      if (decision.takeProfit) {
        const tpSide = decision.action === 'OPEN_LONG' ? 'sell' : 'buy';
        await hyperliquidClient.placeStopOrder(
          this.symbol, tpSide, sizeInAsset, decision.takeProfit, 'take_profit'
        );
      }

      await agentStateService.updateLastTrade();
    } else {
      logger.error('❌ Trade execution failed', { error: result.error });
      await loggingService.logSystemEvent('TRADE_EXECUTION_FAILED', 'ERROR', {
        action: decision.action,
        error: result.error,
      });
    }
  }

  // ============ POSITION EXIT MONITORING ============
  private async checkPositionExits(positions: Position[], currentPrice: number): Promise<void> {
    for (const position of positions) {
      const exitCheck = riskManagementEngine.shouldExitPosition(position, currentPrice);
      
      if (exitCheck && exitCheck.shouldExit) {
        logger.warn(`🚪 Exiting position: ${exitCheck.reason}`, {
          symbol: position.symbol,
          side: position.side,
          entryPrice: position.entryPrice,
          currentPrice,
          pnl: position.unrealizedPnL.percentage.toFixed(2) + '%',
        });

        const result = await hyperliquidClient.closePosition(
          position.symbol,
          position.size,
          position.side
        );

        if (result.success) {
          const pnl = position.unrealizedPnL.absolute;
          riskManagementEngine.recordTradeResult(pnl);

          // Update trade in DB
          await this.updateTradeExit(position, result.fillPrice || currentPrice, exitCheck.reason);

          logger.info(`✅ Position closed: ${position.symbol}`, {
            pnl: pnl.toFixed(2),
            exitReason: exitCheck.reason,
          });
        }
      }
    }
  }

  // ============ DATABASE HELPERS ============
  private async updateTradeExit(position: Position, exitPrice: number, reason: string): Promise<void> {
    try {
      const pnl = position.side === 'long'
        ? (exitPrice - position.entryPrice) * position.size
        : (position.entryPrice - exitPrice) * position.size;

      await pool.query(
        `UPDATE trades SET 
          exit_price = $1, 
          exit_timestamp = NOW(), 
          realized_pnl = $2,
          evaluation = $3
        WHERE symbol = $4 AND exit_timestamp IS NULL
        ORDER BY entry_timestamp DESC LIMIT 1`,
        [exitPrice, pnl, pnl > 0 ? 'good' : 'bad', position.symbol]
      );
    } catch (error) {
      logger.error('Failed to update trade exit', { error: String(error) });
    }
  }

  private async logCycleResult(decision: TradeDecision, executed: boolean, reason: string): Promise<void> {
    try {
      await loggingService.logAIAnalysis({
        timestamp: new Date(),
        symbol: this.symbol,
        market_data: { action: decision.action },
        ai_response: decision.reasoning,
        decision: decision.action,
        confidence: decision.confidence,
        action_taken: executed,
        rejection_reason: executed ? null : reason,
      });
    } catch (error) {
      logger.error('Failed to log cycle result', { error: String(error) });
    }
  }

  // ============ STATUS ============
  getStatus() {
    return {
      isRunning: this.isRunning,
      symbol: this.symbol,
      cycleCount: this.cycleCount,
      errorCount: this.errorCount,
      consecutiveErrors: this.consecutiveErrors,
      intervalMinutes: config.trading.analysisIntervalMinutes,
    };
  }
}

export const tradingEngine = new TradingEngine();
