// Authentication Middleware
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: any;
  body: any;
  query: any;
  params: any;
  cookies: any;
  ip?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies.session_token;

    if (!token) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await authService.validateSession(token);

    if (!user) {
      res.clearCookie('session_token');
      res.status(401).json({ success: false, error: 'Invalid or expired session' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error });
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
}
