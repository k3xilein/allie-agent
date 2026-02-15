// HealthCheckService — Full System Diagnostics
// Tests: Database, Exchange connectivity, API key validity, AI service, and optional micro test-trade
import pool from '../config/database';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { hyperliquidClient } from './HyperliquidClient';
import { aiService } from './AIService';
import axios from 'axios';

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

export interface SubsystemCheck {
  name: string;
  status: CheckStatus;
  latencyMs: number;
  message: string;
  details?: Record<string, any>;
}

export interface HealthReport {
  timestamp: string;
  overall: CheckStatus;
  checks: SubsystemCheck[];
  readyToTrade: boolean;
  testTrade?: SubsystemCheck;
}

class HealthCheckService {
  private lastReport: HealthReport | null = null;
  private running = false;

  /** Run full diagnostics suite */
  async runFullCheck(includeTestTrade: boolean = false): Promise<HealthReport> {
    if (this.running) {
      return this.lastReport || this.emptyReport('Another check is already running');
    }
    this.running = true;

    logger.info('🩺 Running full health check...');

    const checks: SubsystemCheck[] = [];

    // 1. Database
    checks.push(await this.checkDatabase());

    // 2. Exchange connectivity (public API — no key needed)
    checks.push(await this.checkExchangeConnectivity());

    // 3. Exchange API key validity (authenticated)
    checks.push(await this.checkExchangeAuth());

    // 4. AI service (OpenRouter)
    checks.push(await this.checkAIService());

    // 5. Optional: micro test-trade (only on explicit request)
    let testTrade: SubsystemCheck | undefined;
    if (includeTestTrade) {
      testTrade = await this.checkTestTrade();
      checks.push(testTrade);
    }

    // Determine overall status
    const hasFail = checks.some((c) => c.status === 'fail');
    const hasWarn = checks.some((c) => c.status === 'warn');
    const criticalChecks = checks.filter((c) => ['Database', 'Exchange Auth'].includes(c.name));
    const criticalFail = criticalChecks.some((c) => c.status === 'fail');

    const overall: CheckStatus = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';

    const report: HealthReport = {
      timestamp: new Date().toISOString(),
      overall,
      checks,
      readyToTrade: !criticalFail,
      testTrade,
    };

    this.lastReport = report;
    this.running = false;

    logger.info(`🩺 Health check complete: ${overall.toUpperCase()}`, {
      checks: checks.map((c) => `${c.name}: ${c.status}`),
      readyToTrade: report.readyToTrade,
    });

    return report;
  }

  /** Fast pre-start check (blocks engine start on failure) */
  async preStartCheck(): Promise<{ ok: boolean; failures: string[] }> {
    const report = await this.runFullCheck(false);
    const failures = report.checks
      .filter((c) => c.status === 'fail' && ['Database', 'Exchange Auth'].includes(c.name))
      .map((c) => `${c.name}: ${c.message}`);

    return { ok: failures.length === 0, failures };
  }

  /** Return cached last report (for quick dashboard polling) */
  getLastReport(): HealthReport | null {
    return this.lastReport;
  }

  // ============ INDIVIDUAL CHECKS ============

  private async checkDatabase(): Promise<SubsystemCheck> {
    const start = Date.now();
    try {
      const result = await pool.query('SELECT 1 AS ok, NOW() AS server_time');
      const latency = Date.now() - start;

      // Also check table existence
      const tables = await pool.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public'`
      );
      const tableCount = parseInt(tables.rows[0]?.cnt || '0');

      return {
        name: 'Database',
        status: tableCount > 0 ? 'pass' : 'warn',
        latencyMs: latency,
        message: tableCount > 0 ? `Connected (${tableCount} tables, ${latency}ms)` : 'Connected but no tables found',
        details: { tableCount, serverTime: result.rows[0]?.server_time },
      };
    } catch (error: any) {
      return {
        name: 'Database',
        status: 'fail',
        latencyMs: Date.now() - start,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  private async checkExchangeConnectivity(): Promise<SubsystemCheck> {
    const start = Date.now();
    try {
      // Public endpoint — test that we can reach Hyperliquid at all
      const endpoint = config.hyperliquid.testnet
        ? 'https://api.hyperliquid-testnet.xyz/info'
        : 'https://api.hyperliquid.xyz/info';

      const response = await axios.post(
        endpoint,
        { type: 'allMids' },
        { timeout: 10000 }
      );
      const latency = Date.now() - start;
      const midCount = Object.keys(response.data || {}).length;

      return {
        name: 'Exchange API',
        status: 'pass',
        latencyMs: latency,
        message: `Reachable (${midCount} markets, ${latency}ms)`,
        details: { testnet: config.hyperliquid.testnet, markets: midCount },
      };
    } catch (error: any) {
      return {
        name: 'Exchange API',
        status: 'fail',
        latencyMs: Date.now() - start,
        message: `Unreachable: ${error.message}`,
      };
    }
  }

  private async checkExchangeAuth(): Promise<SubsystemCheck> {
    const start = Date.now();
    try {
      if (!config.hyperliquid.privateKey) {
        return {
          name: 'Exchange Auth',
          status: 'warn',
          latencyMs: 0,
          message: 'Private key not configured — running in read-only/demo mode',
        };
      }

      // Try to get account info (requires valid key)
      const balance = await hyperliquidClient.getAccountInfo();
      const latency = Date.now() - start;

      if (balance.totalBalance === 0 && balance.availableBalance === 0) {
        return {
          name: 'Exchange Auth',
          status: 'warn',
          latencyMs: latency,
          message: `Authenticated but balance is $0.00 — fund your account to trade`,
          details: { balance: balance.totalBalance, testnet: config.hyperliquid.testnet },
        };
      }

      return {
        name: 'Exchange Auth',
        status: 'pass',
        latencyMs: latency,
        message: `Authenticated — Balance: $${balance.totalBalance.toFixed(2)} (${latency}ms)`,
        details: {
          balance: balance.totalBalance,
          available: balance.availableBalance,
          testnet: config.hyperliquid.testnet,
        },
      };
    } catch (error: any) {
      return {
        name: 'Exchange Auth',
        status: 'fail',
        latencyMs: Date.now() - start,
        message: `Authentication failed: ${error.message}`,
      };
    }
  }

  private async checkAIService(): Promise<SubsystemCheck> {
    const start = Date.now();
    try {
      if (!config.ai.apiKey) {
        return {
          name: 'AI Service',
          status: 'warn',
          latencyMs: 0,
          message: 'OpenRouter API key not configured — using technical-only fallback',
        };
      }

      // Lightweight test: send a tiny prompt
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: config.ai.model,
          messages: [{ role: 'user', content: 'Reply with only the word OK' }],
          max_tokens: 5,
          temperature: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${config.ai.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      const latency = Date.now() - start;
      const reply = response.data?.choices?.[0]?.message?.content?.trim() || '';

      return {
        name: 'AI Service',
        status: 'pass',
        latencyMs: latency,
        message: `Connected — Model: ${config.ai.model} (${latency}ms)`,
        details: { model: config.ai.model, testReply: reply },
      };
    } catch (error: any) {
      const status = error.response?.status;
      const msg =
        status === 401
          ? 'Invalid API key'
          : status === 402
          ? 'Insufficient credits'
          : status === 429
          ? 'Rate limited'
          : status === 400
          ? `Bad request — model "${config.ai.model}" may be invalid: ${error.response?.data?.error?.message || error.message}`
          : error.message;

      return {
        name: 'AI Service',
        status: status === 429 ? 'warn' : 'fail',
        latencyMs: Date.now() - start,
        message: `Failed: ${msg}`,
        details: { httpStatus: status },
      };
    }
  }

  private async checkTestTrade(): Promise<SubsystemCheck> {
    const start = Date.now();
    try {
      if (!config.hyperliquid.privateKey) {
        return {
          name: 'Test Trade',
          status: 'skip',
          latencyMs: 0,
          message: 'Skipped — no private key configured',
        };
      }

      // Get current price
      const symbol = config.trading.symbol;
      const price = await hyperliquidClient.getCurrentPrice(symbol);
      if (price === 0) {
        return {
          name: 'Test Trade',
          status: 'fail',
          latencyMs: Date.now() - start,
          message: `Could not fetch price for ${symbol}`,
        };
      }

      // Place a tiny limit order far from market price (won't fill) then cancel it
      // This proves: auth works, order submission works, cancel works
      const testPrice = price * 0.5; // 50% below market — will never fill
      const minSize = 0.001; // Smallest possible position

      logger.info('🧪 Test trade: placing test limit order...', { symbol, testPrice, size: minSize });

      const orderResult = await hyperliquidClient.placeLimitOrder(
        symbol,
        'buy',
        minSize,
        testPrice,
        false
      );

      if (!orderResult.success) {
        return {
          name: 'Test Trade',
          status: 'fail',
          latencyMs: Date.now() - start,
          message: `Order placement failed: ${orderResult.error}`,
        };
      }

      // Cancel it immediately
      await hyperliquidClient.cancelAllOrders(symbol);
      const latency = Date.now() - start;

      logger.info('🧪 Test trade: success — order placed and cancelled', { latency });

      return {
        name: 'Test Trade',
        status: 'pass',
        latencyMs: latency,
        message: `Order round-trip OK (place + cancel in ${latency}ms)`,
        details: { symbol, testPrice, orderId: orderResult.orderId },
      };
    } catch (error: any) {
      return {
        name: 'Test Trade',
        status: 'fail',
        latencyMs: Date.now() - start,
        message: `Test trade failed: ${error.message}`,
      };
    }
  }

  private emptyReport(message: string): HealthReport {
    return {
      timestamp: new Date().toISOString(),
      overall: 'warn',
      checks: [{ name: 'System', status: 'warn', latencyMs: 0, message }],
      readyToTrade: false,
    };
  }
}

export const healthCheckService = new HealthCheckService();
