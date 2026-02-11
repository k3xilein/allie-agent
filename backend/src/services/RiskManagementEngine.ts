// Risk Management Engine - Capital Protection & Position Sizing
import pool from '../config/database';
import { RiskCheckResult, RiskMetrics, RiskLimits, TradeDecision, Position, AccountBalance } from '../models/types';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class RiskManagementEngine {
  private peakEquity: number = 0;
  private dailyStartEquity: number = 0;
  private dailyStartDate: string = '';
  private consecutiveLosses: number = 0;
  private circuitBreakerActive: boolean = false;
  private circuitBreakerReason: string = '';
  private cooldownUntil: Date | null = null;

  // Get risk limits from config and user settings
  getRiskLimits(): RiskLimits {
    return {
      maxPositionSizePercent: config.trading.maxPositionSizePercent,
      maxPortfolioHeat: 25, // Max 25% of equity at risk
      maxDailyLossPercent: config.trading.maxDailyLossPercent,
      maxDrawdownPercent: config.trading.maxDrawdownPercent,
      maxConsecutiveLosses: config.trading.maxConsecutiveLosses,
      maxLeverage: config.trading.maxLeverage,
      maxPositions: config.trading.maxPositions,
      minConfidence: config.trading.minConfidence,
      minRiskRewardRatio: config.trading.minRiskRewardRatio,
      cooldownMinutes: config.trading.cooldownMinutes,
      maxOrderSizeUSD: 50000, // Hard cap
      maxSlippagePercent: config.trading.maxSlippagePercent,
    };
  }

  // ============ MAIN RISK CHECK ============
  async evaluateTrade(
    decision: TradeDecision,
    balance: AccountBalance,
    openPositions: Position[]
  ): Promise<RiskCheckResult> {
    const limits = this.getRiskLimits();
    const warnings: string[] = [];

    // 1. HOLD and CLOSE are always allowed
    if (decision.action === 'HOLD' || decision.action === 'CLOSE') {
      return { approved: true, warnings: [] };
    }

    // 2. Circuit Breaker Check
    if (this.circuitBreakerActive) {
      if (this.cooldownUntil && new Date() < this.cooldownUntil) {
        const minutesLeft = Math.ceil((this.cooldownUntil.getTime() - Date.now()) / 60000);
        return {
          approved: false,
          reason: `Circuit breaker active: ${this.circuitBreakerReason}. Cooldown: ${minutesLeft} min remaining.`,
        };
      }
      // Cooldown expired, reset
      this.resetCircuitBreaker();
    }

    // 3. Confidence Check
    if (decision.confidence < limits.minConfidence) {
      return {
        approved: false,
        reason: `Confidence too low: ${decision.confidence}% (min: ${limits.minConfidence}%)`,
      };
    }

    // 4. Risk/Reward Ratio Check
    if (decision.riskRewardRatio < limits.minRiskRewardRatio) {
      return {
        approved: false,
        reason: `R:R ratio too low: ${decision.riskRewardRatio.toFixed(2)} (min: ${limits.minRiskRewardRatio})`,
      };
    }

    // 5. Max Positions Check
    if (openPositions.length >= limits.maxPositions) {
      return {
        approved: false,
        reason: `Max positions reached: ${openPositions.length}/${limits.maxPositions}`,
      };
    }

    // 6. Daily Loss Limit Check
    const dailyMetrics = await this.getDailyMetrics(balance);
    if (dailyMetrics.dailyLossUsed >= limits.maxDailyLossPercent) {
      this.triggerCircuitBreaker(`Daily loss limit reached: ${dailyMetrics.dailyLossUsed.toFixed(2)}%`);
      return {
        approved: false,
        reason: `Daily loss limit reached: ${dailyMetrics.dailyLossUsed.toFixed(2)}% (max: ${limits.maxDailyLossPercent}%)`,
      };
    }

    // 7. Drawdown Check
    this.updatePeakEquity(balance.totalBalance);
    const drawdownPercent = this.peakEquity > 0 
      ? ((this.peakEquity - balance.totalBalance) / this.peakEquity) * 100 
      : 0;
    
    if (drawdownPercent >= limits.maxDrawdownPercent) {
      this.triggerCircuitBreaker(`Max drawdown reached: ${drawdownPercent.toFixed(2)}%`);
      return {
        approved: false,
        reason: `Drawdown limit reached: ${drawdownPercent.toFixed(2)}% (max: ${limits.maxDrawdownPercent}%)`,
      };
    }

    // 8. Consecutive Losses Check
    if (this.consecutiveLosses >= limits.maxConsecutiveLosses) {
      this.triggerCircuitBreaker(`${this.consecutiveLosses} consecutive losses`);
      return {
        approved: false,
        reason: `Too many consecutive losses: ${this.consecutiveLosses} (max: ${limits.maxConsecutiveLosses})`,
      };
    }

    // 9. Position Sizing - Dynamic Kelly Criterion
    let adjustedSize = decision.suggestedSize;
    const maxPositionSize = balance.availableBalance * (limits.maxPositionSizePercent / 100);

    if (adjustedSize > maxPositionSize) {
      adjustedSize = maxPositionSize;
      warnings.push(`Size capped: $${adjustedSize.toFixed(2)} (max ${limits.maxPositionSizePercent}% of balance)`);
    }

    // Hard cap
    if (adjustedSize > limits.maxOrderSizeUSD) {
      adjustedSize = limits.maxOrderSizeUSD;
      warnings.push(`Size hard-capped at $${limits.maxOrderSizeUSD}`);
    }

    // Reduce size during drawdown (scale down linearly)
    if (drawdownPercent > 5) {
      const reductionFactor = 1 - (drawdownPercent / limits.maxDrawdownPercent) * 0.5;
      adjustedSize *= Math.max(0.25, reductionFactor);
      warnings.push(`Size reduced ${((1 - reductionFactor) * 100).toFixed(0)}% due to ${drawdownPercent.toFixed(1)}% drawdown`);
    }

    // Reduce size after consecutive losses
    if (this.consecutiveLosses > 0) {
      const lossFactor = Math.pow(0.7, this.consecutiveLosses); // 30% reduction per loss
      adjustedSize *= lossFactor;
      warnings.push(`Size reduced after ${this.consecutiveLosses} consecutive losses`);
    }

    // 10. Leverage Check
    let adjustedLeverage = decision.suggestedLeverage || 1;
    if (adjustedLeverage > limits.maxLeverage) {
      adjustedLeverage = limits.maxLeverage;
      warnings.push(`Leverage capped at ${limits.maxLeverage}x`);
    }

    // Reduce leverage during high volatility
    if (decision.marketRegime === 'volatile') {
      adjustedLeverage = Math.max(1, Math.floor(adjustedLeverage * 0.5));
      warnings.push('Leverage halved due to high volatility');
    }

    // 11. Portfolio Heat Check
    const currentHeat = this.calculatePortfolioHeat(openPositions, balance);
    const newPositionHeat = (adjustedSize / balance.totalBalance) * 100;
    
    if (currentHeat + newPositionHeat > limits.maxPortfolioHeat) {
      const maxNewHeat = limits.maxPortfolioHeat - currentHeat;
      if (maxNewHeat <= 0) {
        return {
          approved: false,
          reason: `Portfolio heat too high: ${currentHeat.toFixed(1)}% (max: ${limits.maxPortfolioHeat}%)`,
        };
      }
      adjustedSize = balance.totalBalance * (maxNewHeat / 100);
      warnings.push(`Size reduced due to portfolio heat: ${currentHeat.toFixed(1)}%`);
    }

    // 12. Stop Loss Required
    if (!decision.stopLoss) {
      warnings.push('No stop loss specified - will use default ATR-based stop');
    }

    // 13. Minimum Size Check
    if (adjustedSize < 10) { // Minimum $10
      return {
        approved: false,
        reason: `Position size too small after adjustments: $${adjustedSize.toFixed(2)}`,
      };
    }

    logger.info('✅ Risk check passed', {
      originalSize: decision.suggestedSize,
      adjustedSize,
      leverage: adjustedLeverage,
      confidence: decision.confidence,
      rr: decision.riskRewardRatio,
      portfolioHeat: currentHeat,
      warnings,
    });

    return {
      approved: true,
      adjustedSize,
      adjustedLeverage,
      warnings,
    };
  }

  // ============ PORTFOLIO RISK ============
  private calculatePortfolioHeat(positions: Position[], balance: AccountBalance): number {
    if (positions.length === 0) return 0;
    
    let totalRisk = 0;
    for (const pos of positions) {
      // Risk = margin used as percentage of total equity
      totalRisk += (pos.marginUsed / balance.totalBalance) * 100;
    }
    
    return totalRisk;
  }

  // ============ DAILY METRICS ============
  private async getDailyMetrics(balance: AccountBalance): Promise<{ dailyPnL: number; dailyLossUsed: number }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Reset daily tracking at start of new day
    if (this.dailyStartDate !== today) {
      this.dailyStartDate = today;
      this.dailyStartEquity = balance.totalBalance;
    }

    const dailyPnL = balance.totalBalance - this.dailyStartEquity;
    const dailyLossUsed = this.dailyStartEquity > 0 
      ? Math.max(0, -dailyPnL / this.dailyStartEquity * 100) 
      : 0;

    return { dailyPnL, dailyLossUsed };
  }

  // ============ POSITION SIZING (Kelly Criterion) ============
  async calculateOptimalSize(
    balance: AccountBalance,
    winRate: number,
    avgWinLossRatio: number,
    confidence: number
  ): Promise<number> {
    // Kelly Criterion: f* = (bp - q) / b
    // b = average win/loss ratio, p = probability of winning, q = 1-p
    const p = winRate / 100;
    const q = 1 - p;
    const b = avgWinLossRatio;

    let kellyFraction = (b * p - q) / b;
    
    // Use half-Kelly for safety
    kellyFraction = Math.max(0, kellyFraction * 0.5);
    
    // Scale by confidence
    kellyFraction *= (confidence / 100);
    
    // Cap at max position size
    const maxPercent = this.getRiskLimits().maxPositionSizePercent / 100;
    kellyFraction = Math.min(kellyFraction, maxPercent);

    return balance.availableBalance * kellyFraction;
  }

  // ============ CIRCUIT BREAKERS ============
  triggerCircuitBreaker(reason: string): void {
    this.circuitBreakerActive = true;
    this.circuitBreakerReason = reason;
    this.cooldownUntil = new Date(Date.now() + this.getRiskLimits().cooldownMinutes * 60000);
    
    logger.warn('🚨 CIRCUIT BREAKER TRIGGERED', { 
      reason, 
      cooldownUntil: this.cooldownUntil.toISOString() 
    });
  }

  resetCircuitBreaker(): void {
    this.circuitBreakerActive = false;
    this.circuitBreakerReason = '';
    this.cooldownUntil = null;
    logger.info('✅ Circuit breaker reset');
  }

  // ============ TRADE OUTCOME TRACKING ============
  recordTradeResult(pnl: number): void {
    if (pnl < 0) {
      this.consecutiveLosses++;
      logger.warn(`Consecutive losses: ${this.consecutiveLosses}`);
    } else {
      this.consecutiveLosses = 0;
    }
  }

  private updatePeakEquity(currentEquity: number): void {
    if (currentEquity > this.peakEquity) {
      this.peakEquity = currentEquity;
    }
  }

  // ============ GET FULL RISK METRICS ============
  async getRiskMetrics(balance: AccountBalance, positions: Position[]): Promise<RiskMetrics> {
    const limits = this.getRiskLimits();
    const dailyMetrics = await this.getDailyMetrics(balance);
    this.updatePeakEquity(balance.totalBalance);

    const drawdownPercent = this.peakEquity > 0 
      ? ((this.peakEquity - balance.totalBalance) / this.peakEquity) * 100 
      : 0;

    // Get historical performance from DB
    const perfStats = await this.getPerformanceStats();

    return {
      totalEquity: balance.totalBalance,
      availableBalance: balance.availableBalance,
      marginUsed: balance.marginUsed,
      marginUsedPercent: balance.totalBalance > 0 ? (balance.marginUsed / balance.totalBalance) * 100 : 0,
      currentDrawdown: Math.max(0, this.peakEquity - balance.totalBalance),
      maxDrawdown: limits.maxDrawdownPercent,
      drawdownPercent,
      peakEquity: this.peakEquity,
      dailyPnL: dailyMetrics.dailyPnL,
      dailyPnLPercent: this.dailyStartEquity > 0 ? (dailyMetrics.dailyPnL / this.dailyStartEquity) * 100 : 0,
      dailyLossLimit: limits.maxDailyLossPercent,
      dailyLossUsed: dailyMetrics.dailyLossUsed,
      openPositions: positions.length,
      maxPositions: limits.maxPositions,
      portfolioHeat: this.calculatePortfolioHeat(positions, balance),
      winRate: perfStats.winRate,
      avgWin: perfStats.avgWin,
      avgLoss: perfStats.avgLoss,
      profitFactor: perfStats.profitFactor,
      sharpeRatio: perfStats.sharpeRatio,
      consecutiveLosses: this.consecutiveLosses,
      maxConsecutiveLosses: limits.maxConsecutiveLosses,
      circuitBreakerActive: this.circuitBreakerActive,
      circuitBreakerReason: this.circuitBreakerActive ? this.circuitBreakerReason : undefined,
      cooldownUntil: this.cooldownUntil || undefined,
    };
  }

  private async getPerformanceStats(): Promise<{
    winRate: number; avgWin: number; avgLoss: number; profitFactor: number; sharpeRatio: number;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE realized_pnl > 0) as wins,
          COUNT(*) FILTER (WHERE realized_pnl < 0) as losses,
          COALESCE(AVG(realized_pnl) FILTER (WHERE realized_pnl > 0), 0) as avg_win,
          COALESCE(AVG(ABS(realized_pnl)) FILTER (WHERE realized_pnl < 0), 0) as avg_loss,
          COALESCE(SUM(realized_pnl) FILTER (WHERE realized_pnl > 0), 0) as total_wins,
          COALESCE(SUM(ABS(realized_pnl)) FILTER (WHERE realized_pnl < 0), 0) as total_losses
        FROM trades 
        WHERE exit_timestamp IS NOT NULL 
        AND exit_timestamp > NOW() - INTERVAL '30 days'
      `);

      const row = result.rows[0];
      const wins = parseInt(row.wins || '0');
      const losses = parseInt(row.losses || '0');
      const total = wins + losses;
      const avgWin = parseFloat(row.avg_win || '0');
      const avgLoss = parseFloat(row.avg_loss || '0');
      const totalWins = parseFloat(row.total_wins || '0');
      const totalLosses = parseFloat(row.total_losses || '1');

      return {
        winRate: total > 0 ? (wins / total) * 100 : 50,
        avgWin,
        avgLoss,
        profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
        sharpeRatio: 0, // Simplified
      };
    } catch (error) {
      return { winRate: 50, avgWin: 0, avgLoss: 0, profitFactor: 0, sharpeRatio: 0 };
    }
  }

  // ============ POSITION EXIT CHECKS ============
  shouldExitPosition(position: Position, currentPrice: number): { shouldExit: boolean; reason: string } | null {
    // Stop Loss
    if (position.stopLoss) {
      if (position.side === 'long' && currentPrice <= position.stopLoss) {
        return { shouldExit: true, reason: `Stop Loss hit at $${position.stopLoss}` };
      }
      if (position.side === 'short' && currentPrice >= position.stopLoss) {
        return { shouldExit: true, reason: `Stop Loss hit at $${position.stopLoss}` };
      }
    }

    // Take Profit
    if (position.takeProfit) {
      if (position.side === 'long' && currentPrice >= position.takeProfit) {
        return { shouldExit: true, reason: `Take Profit hit at $${position.takeProfit}` };
      }
      if (position.side === 'short' && currentPrice <= position.takeProfit) {
        return { shouldExit: true, reason: `Take Profit hit at $${position.takeProfit}` };
      }
    }

    // Emergency: Position unrealized loss > 5%
    if (position.unrealizedPnL.percentage < -5) {
      return { shouldExit: true, reason: `Emergency exit: ${position.unrealizedPnL.percentage.toFixed(2)}% loss` };
    }

    return null;
  }
}

export const riskManagementEngine = new RiskManagementEngine();
