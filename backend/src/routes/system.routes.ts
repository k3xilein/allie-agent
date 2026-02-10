import { Router } from 'express';
import { pool } from '../config/database';

const router = Router();

// GET /api/system/status - Check if system is initialized
router.get('/status', async (req, res) => {
  try {
    // Check if any users exist in the database
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(result.rows[0].count);

    res.json({
      initialized: userCount > 0,
      userCount,
      databaseReady: true,
      migrationsApplied: true, // We'll assume migrations run automatically
    });
  } catch (error: any) {
    console.error('System status check failed:', error);
    
    // If error is due to table not existing, system needs initialization
    if (error.code === '42P01') { // PostgreSQL error code for undefined table
      res.json({
        initialized: false,
        userCount: 0,
        databaseReady: true,
        migrationsApplied: false,
        error: 'Database tables not created. Migrations need to run.',
      });
    } else {
      res.status(500).json({
        initialized: false,
        databaseReady: false,
        error: 'Database connection failed',
      });
    }
  }
});

export default router;
