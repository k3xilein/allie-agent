// Authentication Service
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from '../config/database';
import { User, Session } from '../models/types';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

export class AuthService {
  private readonly SALT_ROUNDS = 10;
  
  async createAdminAccount(username: string, password: string): Promise<User> {
    try {
      // Check if admin already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('Admin account already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Create user
      const result = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
        [username, passwordHash]
      );

      logger.info('Admin account created', { username });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create admin account', { error });
      throw error;
    }
  }

  async login(username: string, password: string, ipAddress: string): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    try {
      // Get user
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      // Timing-safe comparison: Always run bcrypt even if user not found
      const user: User = result.rows[0];
      const userExists = result.rows.length > 0;
      
      // Use a dummy hash if user doesn't exist to prevent timing attacks
      const hashToCompare = userExists 
        ? user.password_hash 
        : '$2b$10$dummyhashtopreventtimingattacks1234567890';

      const isValid = await bcrypt.compare(password, hashToCompare);
      
      if (!userExists || !isValid) {
        // Always throw same error to prevent user enumeration
        throw new Error('Invalid credentials');
      }

      // Clean old sessions for this user (max 5 concurrent sessions)
      await pool.query(
        `DELETE FROM sessions WHERE user_id = $1 AND token NOT IN (
          SELECT token FROM sessions WHERE user_id = $1 
          ORDER BY created_at DESC LIMIT 4
        )`,
        [user.id]
      );

      // Generate cryptographically secure session token
      const token = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.session.expirationHours);

      // Create session
      await pool.query(
        'INSERT INTO sessions (user_id, token, ip_address, expires_at) VALUES ($1, $2, $3, $4)',
        [user.id, token, ipAddress, expiresAt]
      );

      logger.info('User logged in', { username, ipAddress });

      // Remove password_hash from returned user object
      const { password_hash, ...safeUser } = user;

      return { user: safeUser, token };
    } catch (error) {
      logger.error('Login failed', { username, error });
      throw error;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
      logger.info('User logged out');
    } catch (error) {
      logger.error('Logout failed', { error });
      throw error;
    }
  }

  async validateSession(token: string): Promise<Omit<User, 'password_hash'> | null> {
    try {
      // Validate token format first (prevent injection)
      if (!token || typeof token !== 'string' || token.length !== 128) {
        return null;
      }

      const result = await pool.query(
        `SELECT u.id, u.username, u.created_at, u.updated_at FROM users u
         JOIN sessions s ON u.id = s.user_id
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Session validation failed', { error });
      return null;
    }
  }

  async cleanExpiredSessions(): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM sessions WHERE expires_at < NOW()'
      );
      
      if (result.rowCount && result.rowCount > 0) {
        logger.info('Cleaned expired sessions', { count: result.rowCount });
      }
    } catch (error) {
      logger.error('Failed to clean expired sessions', { error });
    }
  }

  async hasAdminAccount(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM users');
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Failed to check admin account', { error });
      return false;
    }
  }
}

export const authService = new AuthService();
