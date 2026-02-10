// Agent State Service
import pool from '../config/database';
import { AgentState } from '../models/types';
import { logger } from '../utils/logger';

export class AgentStateService {
  async getState(): Promise<AgentState> {
    try {
      const result = await pool.query('SELECT * FROM agent_state WHERE id = 1');
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get agent state', { error });
      throw error;
    }
  }

  async updateStatus(status: 'running' | 'stopped' | 'emergency_stop'): Promise<void> {
    try {
      await pool.query(
        'UPDATE agent_state SET status = $1, updated_at = NOW() WHERE id = 1',
        [status]
      );
      logger.info('Agent status updated', { status });
    } catch (error) {
      logger.error('Failed to update agent status', { error });
      throw error;
    }
  }

  async updateLastAnalysis(): Promise<void> {
    try {
      await pool.query(
        'UPDATE agent_state SET last_analysis_at = NOW() WHERE id = 1'
      );
    } catch (error) {
      logger.error('Failed to update last analysis timestamp', { error });
    }
  }

  async updateLastTrade(): Promise<void> {
    try {
      await pool.query(
        'UPDATE agent_state SET last_trade_at = NOW() WHERE id = 1'
      );
    } catch (error) {
      logger.error('Failed to update last trade timestamp', { error });
    }
  }

  async isRunning(): Promise<boolean> {
    const state = await this.getState();
    return state.status === 'running';
  }

  async isEmergency(): Promise<boolean> {
    const state = await this.getState();
    return state.status === 'emergency_stop';
  }
}

export const agentStateService = new AgentStateService();
