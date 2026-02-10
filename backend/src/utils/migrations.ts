import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of executed migrations
    const executedResult = await pool.query(
      'SELECT filename FROM migrations ORDER BY executed_at'
    );
    const executedMigrations = new Set(
      executedResult.rows.map((row: any) => row.filename)
    );

    // Read migration files from migrations directory
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      logger.warn(`Migrations directory not found: ${migrationsDir}`);
      return;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order

    let migrationsRun = 0;

    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (executedMigrations.has(filename)) {
        logger.info(`⏭️  Skipping ${filename} (already executed)`);
        continue;
      }

      logger.info(`🔄 Running migration: ${filename}`);
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        // Execute migration in a transaction
        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        await pool.query('COMMIT');

        logger.info(`✅ Migration ${filename} completed successfully`);
        migrationsRun++;
      } catch (error: any) {
        await pool.query('ROLLBACK');
        logger.error(`❌ Migration ${filename} failed: ${error.message}`);
        throw new Error(`Migration ${filename} failed: ${error.message}`);
      }
    }

    if (migrationsRun === 0) {
      logger.info('✅ All migrations up to date');
    } else {
      logger.info(`✅ Successfully ran ${migrationsRun} migration(s)`);
    }
  } catch (error: any) {
    logger.error(`Migration system error: ${error.message}`);
    throw error;
  }
}
