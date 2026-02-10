// Security Middleware
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// IP-based request tracking for suspicious activity
const requestTracker = new Map<string, { count: number; firstRequest: number }>();

// Clean up old tracking data every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestTracker.entries()) {
    if (now - data.firstRequest > 300000) { // 5 minutes
      requestTracker.delete(ip);
    }
  }
}, 300000);

// Detect suspicious patterns
export function suspiciousActivityDetector(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();

  const tracker = requestTracker.get(ip) || { count: 0, firstRequest: now };
  tracker.count++;

  // Alert if more than 1000 requests in 5 minutes from same IP
  if (tracker.count > 1000) {
    logger.warn('Suspicious activity detected', { 
      ip, 
      requestCount: tracker.count,
      path: req.path,
    });
  }

  requestTracker.set(ip, tracker);
  next();
}

// Prevent HTTP Parameter Pollution
export function preventHPP(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      // Only keep the first value to prevent HPP
      req.query[key] = (req.query[key] as string[])[0];
    }
  }
  next();
}

// Content Security Policy for API responses
export function apiSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Disable caching for sensitive endpoints
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

// Sanitize user input to prevent XSS
export function sanitizeInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potential XSS patterns
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
}

// Validate session token format
export function validateSessionToken(token: string): boolean {
  // Must be 128 character hex string (64 bytes)
  return /^[a-f0-9]{128}$/i.test(token);
}

// Check if IP is from known proxy/VPN (basic check)
export function detectProxy(ip: string): boolean {
  // Common proxy headers that might indicate tampering
  // This is a basic implementation - in production use a proper service
  const suspiciousPatterns = [
    /^10\./,      // Private network
    /^172\.16\./, // Private network
    /^192\.168\./, // Private network
    /^127\./,     // Localhost
  ];

  return suspiciousPatterns.some(pattern => pattern.test(ip));
}
