// Logging Service
import pool from '../config/database';
import { Trade, AIAnalysis, SystemLog, AuditLog } from '../models/types';
import { logger } from '../utils/logger';

export class LoggingService {
  async logTrade(trade: Partial<Trade>): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO trades 
        (symbol, side, entry_price, exit_price, size, entry_timestamp, exit_timestamp, 
         realized_pnl, strategy, ai_reasoning, market_context, evaluation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          trade.symbol,
          trade.side,
          trade.entry_price,
          trade.exit_price || null,
          trade.size,
          trade.entry_timestamp,
          trade.exit_timestamp || null,
          trade.realized_pnl || null,
          trade.strategy || null,
          trade.ai_reasoning || null,
          trade.market_context ? JSON.stringify(trade.market_context) : null,
          trade.evaluation || null,
        ]
      );
      logger.debug('Trade logged', { symbol: trade.symbol, side: trade.side });
    } catch (error) {
      logger.error('Failed to log trade', { error, trade });
    }
  }

  async logAIAnalysis(analysis: Partial<AIAnalysis>): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO ai_analyses 
        (timestamp, symbol, market_data, current_position, ai_response, decision, confidence, action_taken, rejection_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          analysis.timestamp || new Date(),
          analysis.symbol,
          JSON.stringify(analysis.market_data),
          analysis.current_position ? JSON.stringify(analysis.current_position) : null,
          analysis.ai_response,
          analysis.decision,
          analysis.confidence,
          analysis.action_taken || false,
          analysis.rejection_reason || null,
        ]
      );
      logger.debug('AI analysis logged', { decision: analysis.decision });
    } catch (error) {
      logger.error('Failed to log AI analysis', { error });
    }
  }

  async logSystemEvent(
    eventType: string,
    severity: 'INFO' | 'WARNING' | 'ERROR',
    details?: any,
    userId?: number
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO system_logs (event_type, timestamp, user_id, details, severity)
        VALUES ($1, $2, $3, $4, $5)`,
        [eventType, new Date(), userId || null, details ? JSON.stringify(details) : null, severity]
      );
      logger.debug('System event logged', { eventType, severity });
    } catch (error) {
      logger.error('Failed to log system event', { error });
    }
  }

  async logAuditAction(
    actionType: string,
    userId: number,
    result: 'SUCCESS' | 'FAILURE',
    ipAddress?: string,
    details?: any
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_log (action_type, timestamp, user_id, ip_address, result, details)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [actionType, new Date(), userId, ipAddress || null, result, details ? JSON.stringify(details) : null]
      );
      logger.debug('Audit action logged', { actionType, result });
    } catch (error) {
      logger.error('Failed to log audit action', { error });
    }
  }

  async getRecentTrades(limit: number = 20, offset: number = 0): Promise<Trade[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM trades 
         WHERE exit_timestamp IS NOT NULL
         ORDER BY exit_timestamp DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get recent trades', { error });
      return [];
    }
  }

  async getActiveTrade(): Promise<Trade | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM trades 
         WHERE exit_timestamp IS NULL
         ORDER BY entry_timestamp DESC 
         LIMIT 1`
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get active trade', { error });
      return null;
    }
  }
}

export const loggingService = new LoggingService();
