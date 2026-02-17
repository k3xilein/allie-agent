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

  // ========== ACTIVITY LOG ==========
  async logActivity(
    category: string,
    event: string,
    message: string,
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' = 'INFO',
    details?: any,
    cycleId?: number
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO activity_logs (timestamp, category, event, message, severity, details, cycle_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [new Date(), category, event, message, severity, details ? JSON.stringify(details) : null, cycleId || null]
      );
    } catch (error) {
      // Don't crash if logging fails - just log to console
      logger.error('Failed to log activity', { error, category, event });
    }
  }

  async getActivityLogs(
    limit: number = 50,
    offset: number = 0,
    category?: string,
    severity?: string
  ): Promise<{ logs: any[]; total: number }> {
    try {
      let whereClause = '';
      const params: any[] = [];
      const conditions: string[] = [];

      if (category && category !== 'all') {
        conditions.push(`category = $${params.length + 1}`);
        params.push(category);
      }
      if (severity && severity !== 'all') {
        conditions.push(`severity = $${params.length + 1}`);
        params.push(severity);
      }

      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM activity_logs ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || '0');

      const logsResult = await pool.query(
        `SELECT * FROM activity_logs ${whereClause}
         ORDER BY timestamp DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      return { logs: logsResult.rows, total };
    } catch (error) {
      logger.error('Failed to get activity logs', { error });
      return { logs: [], total: 0 };
    }
  }
}

export const loggingService = new LoggingService();
