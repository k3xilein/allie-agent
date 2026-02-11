// Hyperliquid Client - Real SDK Integration
import { Hyperliquid } from 'hyperliquid';
import { Position, AccountBalance, OrderResult, CloseAllResult, OHLCV, OrderBookSummary } from '../models/types';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export class HyperliquidClient {
  private sdk: Hyperliquid | null = null;
  private privateKey: string;
  private testnet: boolean;
  private walletAddress: string;
  private connected: boolean = false;
  private lastConnectionAttempt: number = 0;
  private connectionCooldown: number = 30000; // 30s between retries

  constructor() {
    this.privateKey = config.hyperliquid.privateKey;
    this.testnet = config.hyperliquid.testnet;
    this.walletAddress = config.hyperliquid.walletAddress || '';
  }

  // Initialize SDK connection
  async connect(): Promise<boolean> {
    if (this.connected && this.sdk) return true;

    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.connectionCooldown) {
      return false;
    }
    this.lastConnectionAttempt = now;

    try {
      if (!this.privateKey) {
        logger.warn('Hyperliquid private key not configured');
        return false;
      }

      this.sdk = new Hyperliquid({
        privateKey: this.privateKey,
        testnet: this.testnet,
        enableWs: false, // Use REST for reliability
        walletAddress: this.walletAddress || undefined,
      });

      await this.sdk.connect();
      this.connected = true;
      logger.info('✅ Hyperliquid SDK connected', { testnet: this.testnet });
      return true;
    } catch (error) {
      logger.error('❌ Hyperliquid connection failed', { error: String(error) });
      this.connected = false;
      this.sdk = null;
      return false;
    }
  }

  // Ensure connection before operations
  private async ensureConnected(): Promise<Hyperliquid> {
    if (!this.sdk || !this.connected) {
      const ok = await this.connect();
      if (!ok || !this.sdk) {
        throw new Error('Hyperliquid not connected. Check API credentials.');
      }
    }
    return this.sdk;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const sdk = await this.ensureConnected();
      // Test by fetching mids
      await sdk.info.getAllMids();
      logger.info('Hyperliquid connection validated', { testnet: this.testnet });
      return true;
    } catch (error) {
      logger.error('Hyperliquid connection validation failed', { error: String(error) });
      this.connected = false;
      return false;
    }
  }

  // ============ ACCOUNT INFO ============
  async getAccountInfo(): Promise<AccountBalance> {
    try {
      const sdk = await this.ensureConnected();
      const address = this.walletAddress || await this.getWalletAddress();
      const state = await sdk.info.perpetuals.getClearinghouseState(address);

      const marginSummary = (state as any).marginSummary || {};
      const totalBalance = parseFloat(marginSummary.accountValue || '0');
      const marginUsed = parseFloat(marginSummary.totalMarginUsed || '0');
      const unrealizedPnL = parseFloat(marginSummary.totalNtlPos || '0') > 0 
        ? totalBalance - parseFloat(marginSummary.totalRawUsd || '0') 
        : 0;

      return {
        totalBalance,
        availableBalance: totalBalance - marginUsed,
        marginUsed,
        unrealizedPnL,
        withdrawable: Math.max(0, totalBalance - marginUsed),
      };
    } catch (error) {
      logger.error('Failed to get account info', { error: String(error) });
      // Return safe defaults if not connected
      return {
        totalBalance: 0,
        availableBalance: 0,
        marginUsed: 0,
        unrealizedPnL: 0,
        withdrawable: 0,
      };
    }
  }

  // ============ POSITIONS ============
  async getOpenPositions(): Promise<Position[]> {
    try {
      const sdk = await this.ensureConnected();
      const address = this.walletAddress || await this.getWalletAddress();
      const state = await sdk.info.perpetuals.getClearinghouseState(address);

      const positions: Position[] = [];
      const assetPositions = (state as any).assetPositions || [];

      for (const pos of assetPositions) {
        const position = pos.position || pos;
        const size = parseFloat(position.szi || '0');
        if (Math.abs(size) < 0.0000001) continue; // Skip dust

        const entryPrice = parseFloat(position.entryPx || '0');
        const currentPrice = parseFloat(position.positionValue || '0') / Math.abs(size) || entryPrice;
        const unrealizedPnl = parseFloat(position.unrealizedPnl || '0');
        const marginUsed = parseFloat(position.marginUsed || '0');
        const liquidationPx = position.liquidationPx ? parseFloat(position.liquidationPx) : null;

        positions.push({
          id: `${position.coin || 'unknown'}_${Date.now()}`,
          symbol: `${position.coin || 'BTC'}-PERP`,
          side: size > 0 ? 'long' : 'short',
          entryPrice,
          currentPrice,
          size: Math.abs(size),
          leverage: parseFloat(position.leverage?.value || '1'),
          liquidationPrice: liquidationPx,
          unrealizedPnL: {
            absolute: unrealizedPnl,
            percentage: entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 * (size > 0 ? 1 : -1) : 0,
          },
          marginUsed,
          openedAt: new Date(),
          stopLoss: null,
          takeProfit: null,
        });
      }

      return positions;
    } catch (error) {
      logger.error('Failed to get open positions', { error: String(error) });
      return [];
    }
  }

  // ============ ORDER PLACEMENT ============
  async placeMarketOrder(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    leverage?: number,
    slippagePercent: number = 0.5
  ): Promise<OrderResult> {
    const startTime = Date.now();
    try {
      const sdk = await this.ensureConnected();

      // Set leverage if specified
      if (leverage && leverage > 1) {
        await this.setLeverage(symbol, leverage);
      }

      // Get current price for slippage limit
      const mids = await sdk.info.getAllMids();
      const coin = symbol.replace('-PERP', '').replace('-SPOT', '');
      const midPrice = parseFloat((mids as any)[coin] || '0');
      
      if (midPrice === 0) {
        return { success: false, error: `Could not get price for ${symbol}` };
      }

      // Apply slippage tolerance: market order with limit price
      const slippageMult = side === 'buy' ? (1 + slippagePercent / 100) : (1 - slippagePercent / 100);
      const limitPrice = midPrice * slippageMult;

      logger.info('📊 Placing market order', {
        symbol, side, size, midPrice, limitPrice, leverage,
      });

      const result = await sdk.exchange.placeOrder({
        coin: symbol,
        is_buy: side === 'buy',
        sz: size,
        limit_px: limitPrice,
        order_type: { limit: { tif: 'Ioc' } }, // IOC = immediate or cancel (market-like)
        reduce_only: false,
      });

      const executionTime = Date.now() - startTime;
      const response = (result as any)?.response || result;
      const statuses = response?.data?.statuses || [];
      
      // Check for fills
      const filled = statuses.find((s: any) => s.filled);
      const error = statuses.find((s: any) => s.error);

      if (error) {
        logger.error('Order rejected', { error: error.error });
        return { success: false, error: error.error, executionTimeMs: executionTime };
      }

      if (filled) {
        const fillPrice = parseFloat(filled.filled.avgPx || String(midPrice));
        const filledSize = parseFloat(filled.filled.totalSz || String(size));
        const slippage = Math.abs((fillPrice - midPrice) / midPrice) * 100;

        logger.info('✅ Order filled', { fillPrice, filledSize, slippage: `${slippage.toFixed(4)}%`, executionTime: `${executionTime}ms` });

        return {
          success: true,
          orderId: filled.filled.oid?.toString() || `order_${Date.now()}`,
          fillPrice,
          filledSize,
          slippage,
          executionTimeMs: executionTime,
        };
      }

      // Resting order (shouldn't happen with IOC)
      const resting = statuses.find((s: any) => s.resting);
      if (resting) {
        logger.warn('Order is resting (not filled immediately)', { oid: resting.resting.oid });
        // Cancel resting order
        await sdk.exchange.cancelOrder({ coin: symbol, o: resting.resting.oid });
        return { success: false, error: 'Order not filled immediately, cancelled', executionTimeMs: executionTime };
      }

      return { success: false, error: 'Unknown order status', executionTimeMs: executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Failed to place market order', { error: String(error), symbol, side, size });
      return { success: false, error: String(error), executionTimeMs: executionTime };
    }
  }

  // Place a limit order
  async placeLimitOrder(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    price: number,
    reduceOnly: boolean = false
  ): Promise<OrderResult> {
    const startTime = Date.now();
    try {
      const sdk = await this.ensureConnected();

      const result = await sdk.exchange.placeOrder({
        coin: symbol,
        is_buy: side === 'buy',
        sz: size,
        limit_px: price,
        order_type: { limit: { tif: 'Gtc' } },
        reduce_only: reduceOnly,
      });

      const executionTime = Date.now() - startTime;
      const response = (result as any)?.response || result;
      const statuses = response?.data?.statuses || [];
      const resting = statuses.find((s: any) => s.resting);
      const filled = statuses.find((s: any) => s.filled);
      const error = statuses.find((s: any) => s.error);

      if (error) {
        return { success: false, error: error.error, executionTimeMs: executionTime };
      }

      if (filled) {
        return {
          success: true,
          orderId: filled.filled.oid?.toString(),
          fillPrice: parseFloat(filled.filled.avgPx),
          filledSize: parseFloat(filled.filled.totalSz),
          executionTimeMs: executionTime,
        };
      }

      if (resting) {
        return {
          success: true,
          orderId: resting.resting.oid?.toString(),
          executionTimeMs: executionTime,
        };
      }

      return { success: false, error: 'Unknown order status', executionTimeMs: executionTime };
    } catch (error) {
      return { success: false, error: String(error), executionTimeMs: Date.now() - startTime };
    }
  }

  // Place stop loss / take profit orders
  async placeStopOrder(
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    triggerPrice: number,
    orderType: 'stop_loss' | 'take_profit'
  ): Promise<OrderResult> {
    const startTime = Date.now();
    try {
      const sdk = await this.ensureConnected();

      const isTP = orderType === 'take_profit';
      const triggerCondition = side === 'buy' 
        ? (isTP ? 'tp' : 'sl') 
        : (isTP ? 'tp' : 'sl');

      const result = await sdk.exchange.placeOrder({
        coin: symbol,
        is_buy: side === 'buy',
        sz: size,
        limit_px: triggerPrice,
        order_type: { trigger: { triggerPx: String(triggerPrice), isMarket: true, tpsl: triggerCondition } },
        reduce_only: true,
      });

      const executionTime = Date.now() - startTime;
      const response = (result as any)?.response || result;
      const statuses = response?.data?.statuses || [];
      const resting = statuses.find((s: any) => s.resting);
      const error = statuses.find((s: any) => s.error);

      if (error) {
        return { success: false, error: error.error, executionTimeMs: executionTime };
      }

      logger.info(`✅ ${orderType} order placed`, { symbol, triggerPrice, side, size });
      return {
        success: true,
        orderId: resting?.resting?.oid?.toString() || `stop_${Date.now()}`,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      return { success: false, error: String(error), executionTimeMs: Date.now() - startTime };
    }
  }

  // ============ POSITION MANAGEMENT ============
  async closePosition(symbol: string, size: number, side: 'long' | 'short'): Promise<OrderResult> {
    // To close: sell if long, buy if short
    const closeSide = side === 'long' ? 'sell' : 'buy';
    return this.placeMarketOrder(symbol, closeSide, size);
  }

  async closeAllPositions(): Promise<CloseAllResult> {
    try {
      const sdk = await this.ensureConnected();
      const positions = await this.getOpenPositions();

      if (positions.length === 0) {
        return { success: true, attempted: 0, closed: 0, failed: 0, totalPnL: 0, failedPositions: [] };
      }

      let closed = 0;
      let failed = 0;
      let totalPnL = 0;
      const failedPositions: string[] = [];

      // Cancel all pending orders first
      try {
        await sdk.custom.cancelAllOrders();
        logger.info('All pending orders cancelled');
      } catch (e) {
        logger.warn('Could not cancel all orders', { error: String(e) });
      }

      // Close each position
      for (const position of positions) {
        try {
          const result = await this.closePosition(position.symbol, position.size, position.side);
          if (result.success) {
            closed++;
            totalPnL += position.unrealizedPnL.absolute;
            logger.info(`Closed position: ${position.symbol}`, { 
              pnl: position.unrealizedPnL.absolute,
              fillPrice: result.fillPrice,
            });
          } else {
            failed++;
            failedPositions.push(position.symbol);
            logger.error(`Failed to close ${position.symbol}`, { error: result.error });
          }
        } catch (error) {
          failed++;
          failedPositions.push(position.symbol);
          logger.error(`Exception closing ${position.symbol}`, { error: String(error) });
        }
      }

      return {
        success: failed === 0,
        attempted: positions.length,
        closed,
        failed,
        totalPnL,
        failedPositions,
      };
    } catch (error) {
      logger.error('Failed to close all positions', { error: String(error) });
      return { success: false, attempted: 0, closed: 0, failed: 0, totalPnL: 0, failedPositions: [] };
    }
  }

  // ============ MARKET DATA ============
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const sdk = await this.ensureConnected();
      const mids = await sdk.info.getAllMids();
      const coin = symbol.replace('-PERP', '').replace('-SPOT', '');
      return parseFloat((mids as any)[coin] || '0');
    } catch (error) {
      logger.error('Failed to get current price', { error: String(error), symbol });
      throw error;
    }
  }

  async getOrderBook(symbol: string): Promise<OrderBookSummary> {
    try {
      const sdk = await this.ensureConnected();
      const book = await sdk.info.getL2Book(symbol);
      const levels = (book as any).levels || [[], []];
      const bids = levels[0] || [];
      const asks = levels[1] || [];

      const bestBid = bids.length > 0 ? parseFloat(bids[0].px) : 0;
      const bestAsk = asks.length > 0 ? parseFloat(asks[0].px) : 0;
      const spread = bestAsk - bestBid;
      const midPrice = (bestBid + bestAsk) / 2;

      // Calculate depth within 1%
      let bidDepth = 0;
      let askDepth = 0;
      const depthRange = midPrice * 0.01;

      for (const bid of bids) {
        if (parseFloat(bid.px) >= midPrice - depthRange) {
          bidDepth += parseFloat(bid.sz);
        }
      }
      for (const ask of asks) {
        if (parseFloat(ask.px) <= midPrice + depthRange) {
          askDepth += parseFloat(ask.sz);
        }
      }

      const totalDepth = bidDepth + askDepth;
      const imbalance = totalDepth > 0 ? (bidDepth - askDepth) / totalDepth : 0;

      return {
        bestBid,
        bestAsk,
        spread,
        spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
        bidDepth,
        askDepth,
        imbalance,
      };
    } catch (error) {
      logger.error('Failed to get order book', { error: String(error) });
      return {
        bestBid: 0, bestAsk: 0, spread: 0, spreadPercent: 0,
        bidDepth: 0, askDepth: 0, imbalance: 0,
      };
    }
  }

  async getCandles(symbol: string, interval: string, limit: number = 200): Promise<OHLCV[]> {
    try {
      const sdk = await this.ensureConnected();
      const coin = symbol.replace('-PERP', '').replace('-SPOT', '');
      
      // Calculate start time based on interval and limit
      const intervalMs = this.intervalToMs(interval);
      const startTime = Date.now() - (intervalMs * limit);

      const candles = await sdk.info.getCandleSnapshot(coin, interval, startTime, Date.now());

      return ((candles as any) || []).map((c: any) => ({
        timestamp: c.t || c.T,
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c),
        volume: parseFloat(c.v),
      }));
    } catch (error) {
      logger.error('Failed to get candles', { error: String(error), symbol, interval });
      return [];
    }
  }

  // ============ LEVERAGE ============
  async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    try {
      const sdk = await this.ensureConnected();
      await sdk.exchange.updateLeverage(symbol, 'cross', leverage);
      logger.info(`Leverage set to ${leverage}x for ${symbol}`);
      return true;
    } catch (error) {
      logger.error('Failed to set leverage', { error: String(error), symbol, leverage });
      return false;
    }
  }

  // ============ CANCEL ORDERS ============
  async cancelAllOrders(symbol?: string): Promise<void> {
    try {
      const sdk = await this.ensureConnected();
      await sdk.custom.cancelAllOrders(symbol);
      logger.info('All orders cancelled', { symbol: symbol || 'ALL' });
    } catch (error) {
      logger.error('Failed to cancel orders', { error: String(error) });
    }
  }

  // ============ UTILITIES ============
  private async getWalletAddress(): Promise<string> {
    // If using a private key directly, the SDK derives the address
    // For agent wallets, the walletAddress must be provided
    if (this.walletAddress) return this.walletAddress;
    throw new Error('Wallet address not configured. Set HYPERLIQUID_WALLET_ADDRESS for agent wallets.');
  }

  private intervalToMs(interval: string): number {
    const map: Record<string, number> = {
      '1m': 60000,
      '3m': 180000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
    };
    return map[interval] || 900000; // Default 15m
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.sdk) {
      try {
        this.sdk.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.sdk = null;
      this.connected = false;
    }
  }
}

export const hyperliquidClient = new HyperliquidClient();
