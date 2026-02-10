// Auth Routes
import { Router, Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { loggingService } from '../services/LoggingService';
import { setupSchema, loginSchema } from '../utils/validation';
import { loginLimiter } from '../middleware/rateLimiter';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Setup - Initial admin account creation
router.post('/setup', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if admin already exists
    const hasAdmin = await authService.hasAdminAccount();
    if (hasAdmin) {
      res.status(409).json({ success: false, error: 'Setup already completed' });
      return;
    }

    // Validate input
    const validation = setupSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        success: false, 
        error: validation.error.errors[0].message 
      });
      return;
    }

    const { username, password } = validation.data;

    // Create admin account
    await authService.createAdminAccount(username, password);

    await loggingService.logSystemEvent('ADMIN_CREATED', 'INFO', { username });

    res.json({ success: true, message: 'Admin account created successfully' });
  } catch (error: any) {
    logger.error('Setup failed', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid input' 
      });
      return;
    }

    const { username, password } = validation.data;
    const ipAddress = req.ip || 'unknown';

    const { user, token } = await authService.login(username, password, ipAddress);

    // Set HTTP-only cookie
    res.cookie('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    await loggingService.logAuditAction('LOGIN', user.id, 'SUCCESS', ipAddress);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error: any) {
    logger.error('Login failed', { error });
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Logout
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.cookies.session_token;
    await authService.logout(token);

    res.clearCookie('session_token');

    await loggingService.logAuditAction('LOGOUT', req.user.id, 'SUCCESS');

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout failed', { error });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate session
router.get('/session', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies.session_token;
    
    if (!token) {
      res.json({ authenticated: false });
      return;
    }

    const user = await authService.validateSession(token);

    if (!user) {
      res.clearCookie('session_token');
      res.json({ authenticated: false });
      return;
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    logger.error('Session validation failed', { error });
    res.json({ authenticated: false });
  }
});

export default router;
