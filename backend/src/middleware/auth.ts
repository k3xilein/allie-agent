// Authentication Middleware
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { logger } from '../utils/logger';

// Extend Express Request to include our auth properties
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: any;
    }
  }
}

export interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

// Type assertion helper for cookies (added by cookie-parser middleware)
function getCookies(req: Request): any {
  return (req as any).cookies;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cookies = getCookies(req);
    const token = cookies.session_token;

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
    req.userId = user.id;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error });
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

// Alias for compatibility
export const authenticateSession = requireAuth;
