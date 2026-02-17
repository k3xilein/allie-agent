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
    await loggingService.logActivity('ENGINE', 'ENGINE_STARTED', `Trading engine started. Analyzing ${this.symbol} every ${intervalMinutes} minutes.`, 'SUCCESS', { symbol: this.symbol, intervalMinutes });
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
    await loggingService.logActivity('ENGINE', 'ENGINE_STOPPED', `Trading engine stopped. Total cycles: ${this.cycleCount} | Total errors: ${this.errorCount}`, 'WARNING', { totalCycles: this.cycleCount, totalErrors: this.errorCount });
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
    const cycleId = this.cycleCount;
    
    logger.info(`📊 === Trading Cycle #${this.cycleCount} ===`, { symbol: this.symbol });
    await loggingService.logActivity('CYCLE', 'CYCLE_START', `Trading cycle #${cycleId} started for ${this.symbol}`, 'INFO', { symbol: this.symbol, cycleNumber: cycleId }, cycleId);

    try {
      // Step 1: Get Market Data & Technical Analysis
      logger.info('Step 1: Fetching market data...');
      const marketData = await marketAnalysisEngine.getFullMarketData(this.symbol);
      logger.info(`Market: $${marketData.currentPrice.toFixed(2)} | Regime: ${marketData.marketRegime} | Vol: ${marketData.indicators.volatilityPercentile.toFixed(0)}th pctl`);
      await loggingService.logActivity('MARKET', 'MARKET_DATA', `${this.symbol} price: $${marketData.currentPrice.toFixed(2)} | Regime: ${marketData.marketRegime} | Volatility: ${marketData.indicators.volatilityPercentile.toFixed(0)}th percentile`, 'INFO', { price: marketData.currentPrice, regime: marketData.marketRegime, volatility: marketData.indicators.volatilityPercentile, change24h: marketData.priceChangePercent24h }, cycleId);

      // Step 2: Generate Technical Signal
      logger.info('Step 2: Generating technical signal...');
      const technicalSignal = marketAnalysisEngine.generateSignal(marketData);
      logger.info(`Technical Signal: ${technicalSignal.action} | Confluence: ${technicalSignal.confluenceScore} | Confidence: ${technicalSignal.confidence.toFixed(0)}%`);
      await loggingService.logActivity('ANALYSIS', 'TECHNICAL_SIGNAL', `Signal: ${technicalSignal.action} | Confluence: ${technicalSignal.confluenceScore}/5 | Confidence: ${technicalSignal.confidence.toFixed(0)}%`, 'INFO', { action: technicalSignal.action, confluence: technicalSignal.confluenceScore, confidence: technicalSignal.confidence }, cycleId);

      // Step 3: Get Current State
      const [balance, positions] = await Promise.all([
        hyperliquidClient.getAccountInfo(),
        hyperliquidClient.getOpenPositions(),
      ]);
      logger.info(`Account: $${balance.totalBalance.toFixed(2)} | Positions: ${positions.length}`);
      await loggingService.logActivity('ACCOUNT', 'BALANCE_CHECK', `Balance: $${balance.totalBalance.toFixed(2)} | Available: $${balance.availableBalance.toFixed(2)} | Open positions: ${positions.length}`, 'INFO', { totalBalance: balance.totalBalance, availableBalance: balance.availableBalance, openPositions: positions.length }, cycleId);

      // Step 4: Check Existing Positions for Exit
      await this.checkPositionExits(positions, marketData.currentPrice, cycleId);

      // Step 4b: Check for partial profit taking on winning positions
      await this.checkPartialProfits(positions, marketData.currentPrice, cycleId);

      // Step 5: AI Analysis (combines technical + fundamental)
      logger.info('Step 5: Running AI analysis...');
      await loggingService.logActivity('AI', 'AI_ANALYSIS_START', 'Sending market data to AI for analysis...', 'INFO', null, cycleId);
      const aiDecision = await aiService.analyzeMarket(
        marketData,
        technicalSignal,
        positions,
        balance.totalBalance
      );
      logger.info(`AI Decision: ${aiDecision.action} | Confidence: ${aiDecision.confidence}% | Strategy: ${aiDecision.strategy}`);
      await loggingService.logActivity('AI', 'AI_DECISION', `AI says: ${aiDecision.action} | Confidence: ${aiDecision.confidence}% | Strategy: ${aiDecision.strategy} | Reasoning: ${aiDecision.reasoning.substring(0, 200)}`, aiDecision.action === 'HOLD' ? 'INFO' : 'SUCCESS', { action: aiDecision.action, confidence: aiDecision.confidence, strategy: aiDecision.strategy, reasoning: aiDecision.reasoning, leverage: aiDecision.suggestedLeverage, stopLoss: aiDecision.stopLoss, takeProfit: aiDecision.takeProfit, riskReward: aiDecision.riskRewardRatio }, cycleId);

      // Step 6: Risk Management Check
      if (aiDecision.action !== 'HOLD') {
        logger.info('Step 6: Risk check...');
        
        // Calculate position size based on balance and AI suggestion
        const sizePercent = config.trading.maxPositionSizePercent;
        aiDecision.suggestedSize = balance.availableBalance * (sizePercent / 100);

        const riskResult = await riskManagementEngine.evaluateTrade(aiDecision, balance, positions);

        if (!riskResult.approved) {
          logger.info(`❌ Trade REJECTED by risk engine: ${riskResult.reason}`);
          await loggingService.logActivity('RISK', 'TRADE_REJECTED', `Trade REJECTED: ${riskResult.reason}`, 'WARNING', { action: aiDecision.action, reason: riskResult.reason, requestedSize: aiDecision.suggestedSize }, cycleId);
          await this.logCycleResult(aiDecision, false, riskResult.reason || 'Risk rejected');
        } else {
          // Apply risk-adjusted values
          if (riskResult.adjustedSize) aiDecision.suggestedSize = riskResult.adjustedSize;
          if (riskResult.adjustedLeverage) aiDecision.suggestedLeverage = riskResult.adjustedLeverage;

          if (riskResult.warnings && riskResult.warnings.length > 0) {
            logger.warn('Risk warnings:', { warnings: riskResult.warnings });
            await loggingService.logActivity('RISK', 'RISK_WARNINGS', `Risk warnings: ${riskResult.warnings.join(', ')}`, 'WARNING', { warnings: riskResult.warnings }, cycleId);
          }

          await loggingService.logActivity('RISK', 'TRADE_APPROVED', `Trade APPROVED by risk engine | Size: $${aiDecision.suggestedSize.toFixed(2)} | Leverage: ${aiDecision.suggestedLeverage}x`, 'SUCCESS', { adjustedSize: aiDecision.suggestedSize, adjustedLeverage: aiDecision.suggestedLeverage }, cycleId);

          // Step 7: Execute Trade
          await this.executeTrade(aiDecision, balance, marketData.currentPrice, cycleId);
        }
      } else {
        logger.info('📌 Decision: HOLD - No action taken');
        await loggingService.logActivity('DECISION', 'HOLD', `Decision: HOLD — No trade action taken this cycle`, 'INFO', { confidence: aiDecision.confidence, reasoning: aiDecision.reasoning.substring(0, 200) }, cycleId);
      }

      // Update agent state
      await agentStateService.updateLastAnalysis();
      
      // Reset error counter on success
      this.consecutiveErrors = 0;

      const cycleDuration = Date.now() - cycleStart;
      logger.info(`✅ Cycle #${this.cycleCount} completed in ${cycleDuration}ms`);
      await loggingService.logActivity('CYCLE', 'CYCLE_END', `Cycle #${cycleId} completed in ${cycleDuration}ms`, 'SUCCESS', { durationMs: cycleDuration, cycleNumber: cycleId }, cycleId);

    } catch (error: any) {
      this.errorCount++;
      this.consecutiveErrors++;

      logger.error(`❌ Cycle #${this.cycleCount} failed`, { 
        error: error.message,
        consecutiveErrors: this.consecutiveErrors,
      });

      await loggingService.logActivity('CYCLE', 'CYCLE_ERROR', `Cycle #${cycleId} FAILED: ${error.message}`, 'ERROR', { error: error.message, consecutiveErrors: this.consecutiveErrors, stack: error.stack?.substring(0, 300) }, cycleId);

      // Auto-stop after too many consecutive errors
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        logger.error('🚨 Too many consecutive errors! Auto-stopping engine.');
        await loggingService.logActivity('ENGINE', 'AUTO_STOP', `Engine auto-stopped after ${this.consecutiveErrors} consecutive errors. Last error: ${error.message}`, 'ERROR', { consecutiveErrors: this.consecutiveErrors, lastError: error.message }, cycleId);
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
    currentPrice: number,
    cycleId?: number
  ): Promise<void> {
    logger.info('🔄 Executing trade...', {
      action: decision.action,
      size: `$${decision.suggestedSize.toFixed(2)}`,
      leverage: `${decision.suggestedLeverage}x`,
      stopLoss: decision.stopLoss,
      takeProfit: decision.takeProfit,
    });

    await loggingService.logActivity('TRADE', 'TRADE_EXECUTING', `Executing ${decision.action} | Size: $${decision.suggestedSize.toFixed(2)} | Leverage: ${decision.suggestedLeverage}x`, 'INFO', { action: decision.action, size: decision.suggestedSize, leverage: decision.suggestedLeverage, stopLoss: decision.stopLoss, takeProfit: decision.takeProfit }, cycleId);

    if (decision.action === 'CLOSE') {
      // Close existing position
      const result = await hyperliquidClient.closeAllPositions();
      if (result.success) {
        logger.info('✅ Positions closed', { closed: result.closed, pnl: result.totalPnL });
        riskManagementEngine.recordTradeResult(result.totalPnL);
        await agentStateService.updateLastTrade();
        await loggingService.logActivity('TRADE', 'POSITIONS_CLOSED', `All positions closed | PnL: $${result.totalPnL.toFixed(2)}`, 'SUCCESS', { closed: result.closed, pnl: result.totalPnL }, cycleId);
      } else {
        logger.error('Failed to close positions', { failed: result.failed });
        await loggingService.logActivity('TRADE', 'CLOSE_FAILED', `Failed to close positions`, 'ERROR', { failed: result.failed }, cycleId);
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

      await loggingService.logActivity('TRADE', 'TRADE_EXECUTED', `✅ ${decision.action} executed | Fill: $${result.fillPrice?.toFixed(2)} | Size: ${result.filledSize} | Slippage: ${result.slippage?.toFixed(4)}%`, 'SUCCESS', { orderId: result.orderId, fillPrice: result.fillPrice, filledSize: result.filledSize, slippage: result.slippage, executionTimeMs: result.executionTimeMs, strategy: decision.strategy }, cycleId);

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
        await loggingService.logActivity('TRADE', 'STOP_LOSS_SET', `Stop loss set at $${decision.stopLoss.toFixed(2)}`, 'INFO', { stopLoss: decision.stopLoss }, cycleId);
      }

      if (decision.takeProfit) {
        const tpSide = decision.action === 'OPEN_LONG' ? 'sell' : 'buy';
        await hyperliquidClient.placeStopOrder(
          this.symbol, tpSide, sizeInAsset, decision.takeProfit, 'take_profit'
        );
        await loggingService.logActivity('TRADE', 'TAKE_PROFIT_SET', `Take profit set at $${decision.takeProfit.toFixed(2)}`, 'INFO', { takeProfit: decision.takeProfit }, cycleId);
      }

      await agentStateService.updateLastTrade();
    } else {
      logger.error('❌ Trade execution failed', { error: result.error });
      await loggingService.logActivity('TRADE', 'TRADE_FAILED', `❌ Trade execution failed: ${result.error}`, 'ERROR', { action: decision.action, error: result.error }, cycleId);
      await loggingService.logSystemEvent('TRADE_EXECUTION_FAILED', 'ERROR', {
        action: decision.action,
        error: result.error,
      });
    }
  }

  // ============ POSITION EXIT MONITORING ============
  private async checkPositionExits(positions: Position[], currentPrice: number, cycleId?: number): Promise<void> {
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

          await loggingService.logActivity('POSITION', 'POSITION_EXITED', `Position ${position.symbol} (${position.side}) closed: ${exitCheck.reason} | PnL: $${pnl.toFixed(2)}`, pnl >= 0 ? 'SUCCESS' : 'WARNING', { symbol: position.symbol, side: position.side, entryPrice: position.entryPrice, exitPrice: result.fillPrice || currentPrice, pnl, reason: exitCheck.reason }, cycleId);
        }
      }
    }
  }

  // ============ PARTIAL PROFIT TAKING ============
  private async checkPartialProfits(positions: Position[], currentPrice: number, cycleId?: number): Promise<void> {
    for (const position of positions) {
      const pnlPct = position.unrealizedPnL.percentage;

      // Take 50% profit at 3%+ gain, and let the rest ride with trailing stop
      if (pnlPct >= 3) {
        const halfSize = position.size * 0.5;
        
        // Only take partial if we haven't already (check if size is large enough)
        if (halfSize >= 0.01) {
          logger.info(`💰 Partial profit taking: ${position.symbol} at ${pnlPct.toFixed(2)}% gain`, {
            closingSize: halfSize,
            remainingSize: position.size - halfSize,
          });

          const result = await hyperliquidClient.closePosition(
            position.symbol,
            halfSize,
            position.side
          );

          if (result.success) {
            const partialPnl = position.unrealizedPnL.absolute * 0.5;
            riskManagementEngine.recordTradeResult(partialPnl);
            logger.info(`✅ Partial profit taken: $${partialPnl.toFixed(2)}`);
            await loggingService.logActivity('TRADE', 'PARTIAL_PROFIT', `💰 Partial profit taken on ${position.symbol} at ${pnlPct.toFixed(2)}% gain | PnL: $${partialPnl.toFixed(2)}`, 'SUCCESS', { symbol: position.symbol, pnlPercent: pnlPct, partialPnl, closedSize: halfSize, remainingSize: position.size - halfSize }, cycleId);
          }
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
