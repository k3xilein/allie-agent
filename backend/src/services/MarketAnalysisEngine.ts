// Market Analysis Engine - Technical Indicators & Signal Generation
import { OHLCV, TechnicalIndicators, MarketRegime, TradingSignal, MarketData, OrderBookSummary } from '../models/types';
import { hyperliquidClient } from './HyperliquidClient';
import { logger } from '../utils/logger';

export class MarketAnalysisEngine {
  
  // ============ MAIN ANALYSIS ============
  async getFullMarketData(symbol: string): Promise<MarketData> {
    try {
      // Fetch candles, price, and order book in parallel
      const [candles, currentPrice, orderBook] = await Promise.all([
        hyperliquidClient.getCandles(symbol, '15m', 200),
        hyperliquidClient.getCurrentPrice(symbol),
        hyperliquidClient.getOrderBook(symbol),
      ]);

      if (candles.length < 50) {
        throw new Error(`Insufficient candle data: ${candles.length} candles (need 50+)`);
      }

      const indicators = this.calculateIndicators(candles);
      const marketRegime = this.detectMarketRegime(indicators, candles);

      // Calculate 24h stats
      const last24h = candles.filter(c => c.timestamp > Date.now() - 86400000);
      const high24h = last24h.length > 0 ? Math.max(...last24h.map(c => c.high)) : currentPrice;
      const low24h = last24h.length > 0 ? Math.min(...last24h.map(c => c.low)) : currentPrice;
      const open24h = last24h.length > 0 ? last24h[0].open : currentPrice;
      const volume24h = last24h.reduce((sum, c) => sum + c.volume, 0);

      return {
        symbol,
        currentPrice,
        volume24h,
        priceChange24h: currentPrice - open24h,
        priceChangePercent24h: ((currentPrice - open24h) / open24h) * 100,
        high24h,
        low24h,
        ohlcv: candles,
        indicators,
        orderBook,
        marketRegime,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get full market data', { error: String(error), symbol });
      throw error;
    }
  }

  // ============ TECHNICAL INDICATORS ============
  calculateIndicators(candles: OHLCV[]): TechnicalIndicators {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    // EMAs
    const ema9 = this.ema(closes, 9);
    const ema21 = this.ema(closes, 21);
    const ema50 = this.ema(closes, 50);
    const ema200 = closes.length >= 200 ? this.ema(closes, 200) : ema50;

    // SMAs
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);

    // RSI
    const rsi14 = this.rsi(closes, 14);
    const rsi7 = this.rsi(closes, 7);

    // MACD
    const macd = this.macd(closes);

    // Stochastic
    const stochastic = this.stochastic(highs, lows, closes, 14, 3);

    // ATR
    const atr14 = this.atr(highs, lows, closes, 14);

    // Bollinger Bands
    const bollingerBands = this.bollingerBands(closes, 20, 2);

    // VWAP (simplified - using last 200 candles)
    const vwap = this.vwap(candles);

    // Volume SMA
    const volumeSMA20 = this.sma(volumes, 20);
    const currentVolume = volumes[volumes.length - 1] || 0;
    const volumeRatio = volumeSMA20 > 0 ? currentVolume / volumeSMA20 : 1;

    // Trend Strength (ADX-like)
    const trendStrength = this.calculateTrendStrength(closes, ema9, ema21, ema50);

    // Volatility Percentile
    const volatilityPercentile = this.calculateVolatilityPercentile(highs, lows, closes);

    return {
      ema9, ema21, ema50, ema200,
      sma20, sma50,
      rsi14, rsi7,
      macd,
      stochastic,
      atr14,
      bollingerBands,
      vwap,
      volumeSMA20,
      volumeRatio,
      trendStrength,
      volatilityPercentile,
    };
  }

  // ============ SIGNAL GENERATION ============
  generateSignal(marketData: MarketData): TradingSignal {
    const { indicators, currentPrice, orderBook, marketRegime } = marketData;
    const signals: { name: string; signal: 'bullish' | 'bearish' | 'neutral'; weight: number; value: any }[] = [];

    // === EMA Trend (Weight: 20%) ===
    const emaTrend = indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema50
      ? 'bullish'
      : indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema50
        ? 'bearish'
        : 'neutral';
    signals.push({ name: 'EMA Trend', signal: emaTrend, weight: 20, value: { ema9: indicators.ema9, ema21: indicators.ema21, ema50: indicators.ema50 } });

    // === RSI (Weight: 15%) ===
    const rsiSignal = indicators.rsi14 < 30 ? 'bullish' 
      : indicators.rsi14 > 70 ? 'bearish' 
      : indicators.rsi14 < 45 ? 'bullish'
      : indicators.rsi14 > 55 ? 'bearish'
      : 'neutral';
    signals.push({ name: 'RSI', signal: rsiSignal, weight: 15, value: { rsi14: indicators.rsi14, rsi7: indicators.rsi7 } });

    // === MACD (Weight: 15%) ===
    const macdSignal = indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal
      ? 'bullish'
      : indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal
        ? 'bearish'
        : 'neutral';
    signals.push({ name: 'MACD', signal: macdSignal, weight: 15, value: indicators.macd });

    // === Bollinger Bands (Weight: 10%) ===
    const bbSignal = indicators.bollingerBands.percentB < 0.2 ? 'bullish'
      : indicators.bollingerBands.percentB > 0.8 ? 'bearish'
      : 'neutral';
    signals.push({ name: 'Bollinger Bands', signal: bbSignal, weight: 10, value: indicators.bollingerBands });

    // === Stochastic (Weight: 10%) ===
    const stochSignal = indicators.stochastic.k < 20 && indicators.stochastic.d < 20 ? 'bullish'
      : indicators.stochastic.k > 80 && indicators.stochastic.d > 80 ? 'bearish'
      : 'neutral';
    signals.push({ name: 'Stochastic', signal: stochSignal, weight: 10, value: indicators.stochastic });

    // === Volume (Weight: 10%) ===
    const volSignal = indicators.volumeRatio > 1.5 ? (emaTrend === 'bullish' ? 'bullish' : 'bearish') : 'neutral';
    signals.push({ name: 'Volume', signal: volSignal, weight: 10, value: { ratio: indicators.volumeRatio } });

    // === Order Book Imbalance (Weight: 10%) ===
    const obSignal = orderBook.imbalance > 0.3 ? 'bullish'
      : orderBook.imbalance < -0.3 ? 'bearish'
      : 'neutral';
    signals.push({ name: 'Order Book', signal: obSignal, weight: 10, value: { imbalance: orderBook.imbalance } });

    // === VWAP (Weight: 10%) ===
    const vwapSignal = currentPrice > indicators.vwap * 1.002 ? 'bullish'
      : currentPrice < indicators.vwap * 0.998 ? 'bearish'
      : 'neutral';
    signals.push({ name: 'VWAP', signal: vwapSignal, weight: 10, value: { vwap: indicators.vwap, price: currentPrice } });

    // Calculate Confluence Score (-100 to 100)
    let confluenceScore = 0;
    for (const s of signals) {
      if (s.signal === 'bullish') confluenceScore += s.weight;
      else if (s.signal === 'bearish') confluenceScore -= s.weight;
    }

    // Determine action
    let action: 'OPEN_LONG' | 'OPEN_SHORT' | 'HOLD' | 'CLOSE' = 'HOLD';
    let confidence = Math.abs(confluenceScore);

    if (confluenceScore >= 40) action = 'OPEN_LONG';
    else if (confluenceScore <= -40) action = 'OPEN_SHORT';
    
    // Adjust confidence based on market regime
    if (marketRegime === 'volatile') confidence *= 0.7; // Reduce confidence in volatile markets
    if (marketRegime === 'low_volatility') confidence *= 0.8; // Reduce in low vol (less opportunity)
    if (marketRegime === 'ranging') confidence *= 0.85; // Slightly reduce in ranging
    
    confidence = Math.min(100, Math.max(0, confidence));

    // Calculate stop loss and take profit
    const atrMultiplier = marketRegime === 'volatile' ? 2.5 : 2;
    const stopDistance = indicators.atr14 * atrMultiplier;
    
    let suggestedStop: number;
    let suggestedTarget: number;

    if (action === 'OPEN_LONG') {
      suggestedStop = currentPrice - stopDistance;
      suggestedTarget = currentPrice + (stopDistance * 2); // 2:1 R:R minimum
    } else if (action === 'OPEN_SHORT') {
      suggestedStop = currentPrice + stopDistance;
      suggestedTarget = currentPrice - (stopDistance * 2);
    } else {
      suggestedStop = currentPrice;
      suggestedTarget = currentPrice;
    }

    const riskRewardRatio = stopDistance > 0 
      ? Math.abs(suggestedTarget - currentPrice) / stopDistance 
      : 0;

    return {
      symbol: marketData.symbol,
      action,
      confidence,
      source: 'technical',
      indicators: signals,
      confluenceScore,
      suggestedEntry: currentPrice,
      suggestedStop,
      suggestedTarget,
      riskRewardRatio,
      timestamp: new Date(),
    };
  }

  // ============ MARKET REGIME DETECTION ============
  detectMarketRegime(indicators: TechnicalIndicators, candles: OHLCV[]): MarketRegime {
    const { atr14, bollingerBands, ema9, ema21, ema50, trendStrength, volatilityPercentile } = indicators;

    // High volatility
    if (volatilityPercentile > 80) return 'volatile';
    
    // Low volatility
    if (volatilityPercentile < 20 && bollingerBands.bandwidth < 0.02) return 'low_volatility';

    // Trending up: EMAs aligned bullish + strong trend
    if (ema9 > ema21 && ema21 > ema50 && trendStrength > 50) return 'trending_up';
    
    // Trending down: EMAs aligned bearish + strong trend
    if (ema9 < ema21 && ema21 < ema50 && trendStrength > 50) return 'trending_down';

    // Default: ranging
    return 'ranging';
  }

  // ============ INDICATOR CALCULATIONS ============
  
  private ema(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    
    const k = 2 / (period + 1);
    let ema = this.sma(data.slice(0, period), period);
    
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  private sma(data: number[], period: number): number {
    if (data.length < period) return data.reduce((a, b) => a + b, 0) / data.length;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private rsi(closes: number[], period: number): number {
    if (closes.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    // Initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Smooth with subsequent data
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change >= 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private macd(closes: number[]): { value: number; signal: number; histogram: number } {
    const ema12 = this.ema(closes, 12);
    const ema26 = this.ema(closes, 26);
    const macdLine = ema12 - ema26;

    // Calculate MACD line history for signal
    const macdHistory: number[] = [];
    const k12 = 2 / 13;
    const k26 = 2 / 27;
    let runEma12 = this.sma(closes.slice(0, 12), 12);
    let runEma26 = this.sma(closes.slice(0, 26), 26);

    for (let i = 26; i < closes.length; i++) {
      runEma12 = closes[i] * k12 + runEma12 * (1 - k12);
      runEma26 = closes[i] * k26 + runEma26 * (1 - k26);
      macdHistory.push(runEma12 - runEma26);
    }

    const signal = macdHistory.length >= 9 ? this.ema(macdHistory, 9) : macdLine;
    const histogram = macdLine - signal;

    return { value: macdLine, signal, histogram };
  }

  private stochastic(highs: number[], lows: number[], closes: number[], kPeriod: number, dPeriod: number): { k: number; d: number } {
    if (closes.length < kPeriod) return { k: 50, d: 50 };

    const kValues: number[] = [];
    
    for (let i = kPeriod - 1; i < closes.length; i++) {
      const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
      const periodLows = lows.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...periodHighs);
      const lowestLow = Math.min(...periodLows);
      const range = highestHigh - lowestLow;
      kValues.push(range > 0 ? ((closes[i] - lowestLow) / range) * 100 : 50);
    }

    const k = kValues[kValues.length - 1];
    const d = this.sma(kValues, dPeriod);

    return { k, d };
  }

  private atr(highs: number[], lows: number[], closes: number[], period: number): number {
    if (closes.length < 2) return 0;

    const trueRanges: number[] = [];
    
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }

    if (trueRanges.length < period) {
      return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
    }

    // Wilder's smoothed ATR
    let atr = this.sma(trueRanges.slice(0, period), period);
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return atr;
  }

  private bollingerBands(closes: number[], period: number, stdDevMultiplier: number): {
    upper: number; middle: number; lower: number; bandwidth: number; percentB: number;
  } {
    const middle = this.sma(closes, period);
    const slice = closes.slice(-period);
    
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    const upper = middle + stdDev * stdDevMultiplier;
    const lower = middle - stdDev * stdDevMultiplier;
    const bandwidth = middle > 0 ? (upper - lower) / middle : 0;
    const currentPrice = closes[closes.length - 1];
    const percentB = (upper - lower) > 0 ? (currentPrice - lower) / (upper - lower) : 0.5;

    return { upper, middle, lower, bandwidth, percentB };
  }

  private vwap(candles: OHLCV[]): number {
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (const candle of candles.slice(-100)) { // Last 100 candles
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeTPV += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
    }

    return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : candles[candles.length - 1]?.close || 0;
  }

  private calculateTrendStrength(closes: number[], ema9: number, ema21: number, ema50: number): number {
    // Trend strength based on EMA alignment and distance
    const price = closes[closes.length - 1];
    if (!price || price === 0) return 0;

    let strength = 0;

    // EMA alignment (0-40 points)
    const allBullish = ema9 > ema21 && ema21 > ema50;
    const allBearish = ema9 < ema21 && ema21 < ema50;
    if (allBullish || allBearish) strength += 40;
    else if ((ema9 > ema21) || (ema9 < ema21)) strength += 20;

    // Price vs EMA50 distance (0-30 points)
    const distFromEma50 = Math.abs(price - ema50) / ema50 * 100;
    strength += Math.min(30, distFromEma50 * 10);

    // Consecutive direction (0-30 points)
    let consecutive = 0;
    for (let i = closes.length - 1; i > Math.max(0, closes.length - 10); i--) {
      if (closes[i] > closes[i - 1] && (allBullish)) consecutive++;
      else if (closes[i] < closes[i - 1] && (allBearish)) consecutive++;
      else break;
    }
    strength += Math.min(30, consecutive * 5);

    return Math.min(100, strength);
  }

  private calculateVolatilityPercentile(highs: number[], lows: number[], closes: number[]): number {
    if (closes.length < 20) return 50;

    // Calculate all ATR values over the period
    const atrValues: number[] = [];
    for (let i = 14; i < closes.length; i++) {
      const periodHighs = highs.slice(i - 14, i);
      const periodLows = lows.slice(i - 14, i);
      const periodCloses = closes.slice(i - 14, i);
      const atr = this.atr(periodHighs, periodLows, periodCloses, 14);
      atrValues.push(atr);
    }

    if (atrValues.length === 0) return 50;

    const currentATR = atrValues[atrValues.length - 1];
    const sorted = [...atrValues].sort((a, b) => a - b);
    const rank = sorted.findIndex(v => v >= currentATR);
    
    return (rank / sorted.length) * 100;
  }
}

export const marketAnalysisEngine = new MarketAnalysisEngine();
