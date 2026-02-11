// AI Service - Enhanced OpenRouter Integration with Performance Learning
import axios from 'axios';
import pool from '../config/database';
import { TradeDecision, MarketData, MarketRegime, TradingSignal, PerformanceMetrics } from '../models/types';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class AIService {
  private apiKey: string;
  private model: string;
  private baseURL = 'https://openrouter.ai/api/v1';
  private requestCount = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 3000; // 3s between requests

  constructor() {
    this.apiKey = config.ai.apiKey;
    this.model = config.ai.model;
  }

  async analyzeMarket(
    marketData: MarketData,
    technicalSignal: TradingSignal,
    currentPositions: any[],
    accountBalance: number
  ): Promise<TradeDecision> {
    const startTime = Date.now();

    try {
      if (!this.apiKey) {
        logger.warn('OpenRouter API key not configured, using technical signal only');
        return this.technicalFallback(technicalSignal, marketData);
      }

      // Rate limiting
      await this.throttle();

      // Get historical context
      const [recentTrades, performanceStats] = await Promise.all([
        this.getRecentTradeHistory(),
        this.getPerformanceStats(),
      ]);

      const prompt = this.buildEnhancedPrompt(
        marketData, technicalSignal, currentPositions, accountBalance,
        recentTrades, performanceStats
      );

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.getEnhancedSystemPrompt() },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3, // Low temperature for consistency
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://allie.memero.store',
            'X-Title': 'Allie Trading Agent',
          },
          timeout: 30000,
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      const decision = this.parseEnhancedResponse(aiResponse, marketData, technicalSignal);

      const executionTime = Date.now() - startTime;

      // Log AI analysis
      await this.logAnalysis(marketData, currentPositions, aiResponse, decision, executionTime);

      logger.info('🤖 AI analysis completed', {
        action: decision.action,
        confidence: decision.confidence,
        strategy: decision.strategy,
        executionTime: `${executionTime}ms`,
      });

      return decision;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error('AI analysis failed', { 
        error: error.message,
        status: error.response?.status,
        executionTime: `${executionTime}ms`,
      });

      // Fall back to technical signal
      return this.technicalFallback(technicalSignal, marketData);
    }
  }

  private getEnhancedSystemPrompt(): string {
    return `You are Allie, an elite cryptocurrency trading AI assistant specializing in perpetual futures on Hyperliquid.

## Core Principles
1. CAPITAL PRESERVATION is the #1 priority. Never risk more than necessary.
2. Only take HIGH-CONVICTION trades. When in doubt, HOLD.
3. Always set stop losses. No trade without a defined exit.
4. Learn from past mistakes. Never repeat the same error.
5. Adapt strategy to market regime (trending vs ranging vs volatile).

## Strategy Framework
- **Trend Following**: Trade WITH the trend. EMA alignment + momentum confirmation.
- **Mean Reversion**: Trade AGAINST extremes. RSI oversold/overbought + Bollinger Band touches.
- **Breakout**: Trade range breaks with volume confirmation.
- **Scalping**: Quick entries/exits on strong momentum signals (low confidence required, fast timeframe).

## Risk Rules (NON-NEGOTIABLE)
- Minimum Risk:Reward ratio: 1.5:1
- Stop loss MUST be set for every trade
- Never increase position in a losing trade
- Reduce size during drawdowns
- Maximum leverage: 5x (3x recommended in volatile markets)

## Response Format (STRICT JSON)
Respond ONLY with valid JSON, no other text:
{
  "action": "OPEN_LONG" | "OPEN_SHORT" | "CLOSE" | "HOLD",
  "reasoning": "detailed analysis explaining why",
  "confidence": 0-100,
  "suggestedSizePercent": 1-10,
  "suggestedLeverage": 1-5,
  "stopLossPercent": 0.5-5,
  "takeProfitPercent": 1-10,
  "trailingStopPercent": 0-5,
  "strategy": "Trend Following" | "Mean Reversion" | "Breakout" | "Scalping",
  "timeframe": "minutes" | "hours" | "days",
  "marketRegime": "trending_up" | "trending_down" | "ranging" | "volatile" | "low_volatility"
}`;
  }

  private buildEnhancedPrompt(
    marketData: MarketData,
    technicalSignal: TradingSignal,
    currentPositions: any[],
    accountBalance: number,
    recentTrades: any[],
    performanceStats: any
  ): string {
    const { indicators, currentPrice, orderBook, marketRegime } = marketData;

    return `## Current Market State - ${marketData.symbol}

**Price:** $${currentPrice.toFixed(2)}
**24h Change:** ${marketData.priceChangePercent24h >= 0 ? '+' : ''}${marketData.priceChangePercent24h.toFixed(2)}%
**24h Volume:** $${(marketData.volume24h / 1e6).toFixed(2)}M
**24h Range:** $${marketData.low24h.toFixed(2)} - $${marketData.high24h.toFixed(2)}
**Market Regime:** ${marketRegime}

## Technical Indicators
- **EMA9/21/50:** ${indicators.ema9.toFixed(2)} / ${indicators.ema21.toFixed(2)} / ${indicators.ema50.toFixed(2)}
- **RSI(14):** ${indicators.rsi14.toFixed(1)} | RSI(7): ${indicators.rsi7.toFixed(1)}
- **MACD:** Line ${indicators.macd.value.toFixed(2)} | Signal ${indicators.macd.signal.toFixed(2)} | Hist ${indicators.macd.histogram.toFixed(2)}
- **Bollinger:** Upper ${indicators.bollingerBands.upper.toFixed(2)} | Mid ${indicators.bollingerBands.middle.toFixed(2)} | Lower ${indicators.bollingerBands.lower.toFixed(2)} | %B ${indicators.bollingerBands.percentB.toFixed(2)}
- **ATR(14):** ${indicators.atr14.toFixed(2)} (${(indicators.atr14 / currentPrice * 100).toFixed(3)}%)
- **Stochastic:** K ${indicators.stochastic.k.toFixed(1)} | D ${indicators.stochastic.d.toFixed(1)}
- **VWAP:** $${indicators.vwap.toFixed(2)} (Price ${currentPrice > indicators.vwap ? 'ABOVE' : 'BELOW'})
- **Volume:** ${indicators.volumeRatio.toFixed(2)}x average
- **Trend Strength:** ${indicators.trendStrength}/100
- **Volatility Percentile:** ${indicators.volatilityPercentile.toFixed(0)}th

## Technical Signal (Pre-computed)
- **Signal:** ${technicalSignal.action}
- **Confluence Score:** ${technicalSignal.confluenceScore} / 100
- **Confidence:** ${technicalSignal.confidence.toFixed(0)}%
- **Suggested Stop:** $${technicalSignal.suggestedStop.toFixed(2)}
- **Suggested Target:** $${technicalSignal.suggestedTarget.toFixed(2)}
- **R:R Ratio:** ${technicalSignal.riskRewardRatio.toFixed(2)}

## Order Book
- **Spread:** ${orderBook.spreadPercent.toFixed(4)}%
- **Bid Depth:** ${orderBook.bidDepth.toFixed(4)} | Ask Depth: ${orderBook.askDepth.toFixed(4)}
- **Imbalance:** ${orderBook.imbalance.toFixed(3)} (${orderBook.imbalance > 0 ? 'More Bids' : 'More Asks'})

## Account
- **Balance:** $${accountBalance.toFixed(2)}
- **Open Positions:** ${currentPositions.length}
${currentPositions.map(p => `  - ${p.symbol}: ${p.side} @ $${p.entryPrice} | PnL: ${p.unrealizedPnL?.percentage?.toFixed(2) || '0'}%`).join('\n')}

## Recent Performance (Last 10 Trades)
${recentTrades.length > 0 ? recentTrades.map(t => 
  `- ${t.side} ${t.symbol}: Entry $${parseFloat(t.entry_price).toFixed(2)} → Exit $${t.exit_price ? parseFloat(t.exit_price).toFixed(2) : 'OPEN'} | PnL: $${t.realized_pnl ? parseFloat(t.realized_pnl).toFixed(2) : 'N/A'} | Strategy: ${t.strategy || 'unknown'} | ${t.evaluation || 'unrated'}`
).join('\n') : 'No recent trades'}

## Performance Stats (30 Days)
- Win Rate: ${performanceStats.winRate?.toFixed(1) || '50'}%
- Avg Win: $${performanceStats.avgWin?.toFixed(2) || '0'} | Avg Loss: $${performanceStats.avgLoss?.toFixed(2) || '0'}
- Profit Factor: ${performanceStats.profitFactor?.toFixed(2) || '0'}

Analyze everything and provide your trading decision as JSON.`;
  }

  private parseEnhancedResponse(
    aiResponse: string,
    marketData: MarketData,
    technicalSignal: TradingSignal
  ): TradeDecision {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiResponse;
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // Try to find raw JSON object
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }

      const parsed = JSON.parse(jsonStr);

      // Validate and construct decision
      const action = ['OPEN_LONG', 'OPEN_SHORT', 'CLOSE', 'HOLD'].includes(parsed.action) 
        ? parsed.action : 'HOLD';
      
      const confidence = Math.max(0, Math.min(100, parseInt(parsed.confidence) || 0));
      const sizePercent = Math.max(1, Math.min(10, parseFloat(parsed.suggestedSizePercent) || 5));
      const leverage = Math.max(1, Math.min(config.trading.maxLeverage, parseInt(parsed.suggestedLeverage) || 1));
      const stopLossPct = Math.max(0.5, Math.min(5, parseFloat(parsed.stopLossPercent) || config.trading.stopLossPercent));
      const takeProfitPct = Math.max(1, Math.min(10, parseFloat(parsed.takeProfitPercent) || config.trading.takeProfitPercent));
      const trailingStopPct = Math.max(0, Math.min(5, parseFloat(parsed.trailingStopPercent) || 0));

      // Calculate actual stop and TP prices
      let stopLoss: number | null = null;
      let takeProfit: number | null = null;

      if (action === 'OPEN_LONG') {
        stopLoss = marketData.currentPrice * (1 - stopLossPct / 100);
        takeProfit = marketData.currentPrice * (1 + takeProfitPct / 100);
      } else if (action === 'OPEN_SHORT') {
        stopLoss = marketData.currentPrice * (1 + stopLossPct / 100);
        takeProfit = marketData.currentPrice * (1 - takeProfitPct / 100);
      }

      const riskReward = stopLossPct > 0 ? takeProfitPct / stopLossPct : 0;

      return {
        action: action as any,
        reasoning: parsed.reasoning || 'AI analysis',
        confidence,
        suggestedSize: 0, // Will be calculated by risk engine based on sizePercent
        suggestedLeverage: leverage,
        strategy: parsed.strategy || 'Trend Following',
        stopLoss,
        takeProfit,
        trailingStop: trailingStopPct > 0 ? trailingStopPct : null,
        timeframe: parsed.timeframe || 'hours',
        riskRewardRatio: riskReward,
        marketRegime: parsed.marketRegime || marketData.marketRegime,
      };
    } catch (error) {
      logger.error('Failed to parse AI response', { error: String(error) });
      return this.technicalFallback(technicalSignal, marketData);
    }
  }

  private technicalFallback(signal: TradingSignal, marketData: MarketData): TradeDecision {
    const currentPrice = marketData.currentPrice;
    const stopDistance = Math.abs(currentPrice - signal.suggestedStop);
    const stopPct = (stopDistance / currentPrice) * 100;

    return {
      action: signal.action,
      reasoning: `Technical signal fallback (AI unavailable). Confluence: ${signal.confluenceScore}/100. Signals: ${signal.indicators.filter(i => i.signal !== 'neutral').map(i => `${i.name}=${i.signal}`).join(', ')}`,
      confidence: Math.min(signal.confidence, 75), // Cap at 75% without AI confirmation
      suggestedSize: 0,
      suggestedLeverage: 1,
      strategy: signal.confluenceScore > 50 ? 'Trend Following' : 'Mean Reversion',
      stopLoss: signal.suggestedStop,
      takeProfit: signal.suggestedTarget,
      trailingStop: null,
      timeframe: 'hours',
      riskRewardRatio: signal.riskRewardRatio,
      marketRegime: marketData.marketRegime,
    };
  }

  private getFallbackDecision(): TradeDecision {
    return {
      action: 'HOLD',
      reasoning: 'System error or insufficient data. Defaulting to HOLD for safety.',
      confidence: 0,
      suggestedSize: 0,
      suggestedLeverage: 1,
      strategy: 'Safety Protocol',
      stopLoss: null,
      takeProfit: null,
      trailingStop: null,
      timeframe: 'hours',
      riskRewardRatio: 0,
      marketRegime: 'ranging',
    };
  }

  // ============ HISTORICAL DATA ============
  private async getRecentTradeHistory(): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT symbol, side, entry_price, exit_price, realized_pnl, strategy, evaluation, entry_timestamp, exit_timestamp
         FROM trades ORDER BY entry_timestamp DESC LIMIT 10`
      );
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  private async getPerformanceStats(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE realized_pnl > 0) as wins,
          COUNT(*) FILTER (WHERE realized_pnl <= 0) as losses,
          COALESCE(AVG(realized_pnl) FILTER (WHERE realized_pnl > 0), 0) as avg_win,
          COALESCE(AVG(ABS(realized_pnl)) FILTER (WHERE realized_pnl < 0), 0) as avg_loss,
          COALESCE(SUM(realized_pnl) FILTER (WHERE realized_pnl > 0), 0) as total_wins,
          COALESCE(SUM(ABS(realized_pnl)) FILTER (WHERE realized_pnl < 0), 1) as total_losses
        FROM trades 
        WHERE exit_timestamp IS NOT NULL 
        AND exit_timestamp > NOW() - INTERVAL '30 days'
      `);
      
      const row = result.rows[0];
      const wins = parseInt(row.wins || '0');
      const losses = parseInt(row.losses || '0');
      const total = wins + losses;

      return {
        winRate: total > 0 ? (wins / total) * 100 : 50,
        avgWin: parseFloat(row.avg_win || '0'),
        avgLoss: parseFloat(row.avg_loss || '0'),
        profitFactor: parseFloat(row.total_losses) > 0 
          ? parseFloat(row.total_wins) / parseFloat(row.total_losses) 
          : 0,
      };
    } catch (error) {
      return { winRate: 50, avgWin: 0, avgLoss: 0, profitFactor: 0 };
    }
  }

  // ============ LOGGING ============
  private async logAnalysis(
    marketData: MarketData,
    currentPositions: any[],
    aiResponse: string,
    decision: TradeDecision,
    executionTimeMs: number
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO ai_analyses 
         (timestamp, symbol, market_data, current_position, ai_response, decision, confidence, action_taken, rejection_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          new Date(),
          marketData.symbol,
          JSON.stringify({ price: marketData.currentPrice, regime: marketData.marketRegime }),
          currentPositions.length > 0 ? JSON.stringify(currentPositions[0]) : null,
          aiResponse.substring(0, 2000), // Truncate for DB
          decision.action,
          decision.confidence,
          false, // Will be updated after risk check
          null,
        ]
      );
    } catch (error) {
      logger.error('Failed to log AI analysis', { error: String(error) });
    }
  }

  // ============ RATE LIMITING ============
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}

export const aiService = new AIService();
