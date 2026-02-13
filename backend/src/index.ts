// Main Entry Point
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config, validateConfig, loadSettingsIntoConfig } from './config/environment';
import { testDatabaseConnection } from './config/database';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import agentRoutes from './routes/agent.routes';
import settingsRoutes from './routes/settings.routes';
import systemRoutes from './routes/system.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/errorHandler';
import { suspiciousActivityDetector, preventHPP, apiSecurityHeaders, sanitizeInput } from './middleware/security';
import { logger } from './utils/logger';
import { authService } from './services/AuthService';
import { runMigrations } from './utils/migrations';

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://memero.store:5173',
  'https://allie.memero.store',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log rejected origins for debugging
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));

// Body Parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Security Middleware
app.use(suspiciousActivityDetector);
app.use(preventHPP);
app.use(apiSecurityHeaders);
app.use(sanitizeInput);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/positions', dashboardRoutes); // Shares routes
app.use('/api/trades', dashboardRoutes); // Shares routes

// Health check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Validate config
    validateConfig();
    logger.info('Configuration validated');

    // Test database
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Run database migrations automatically
    logger.info('Running database migrations...');
    await runMigrations();
    logger.info('Database migrations completed');

    // Load API keys + settings from DB into runtime config
    logger.info('Loading user settings from database...');
    await loadSettingsIntoConfig();
    logger.info('User settings loaded into runtime config');

    // Start session cleanup cron job (every hour)
    setInterval(() => {
      authService.cleanExpiredSessions().catch(err => 
        logger.error('Session cleanup failed', { error: err })
      );
    }, 3600000); // 1 hour

    // Start listening
    app.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`);
      logger.info(`Environment: ${config.server.env}`);
      logger.info(`Testnet mode: ${config.hyperliquid.testnet}`);
      logger.info('Security features enabled: Helmet, CORS, Rate Limiting, Input Sanitization');
      logger.info('✅ System ready - Visit http://localhost:3000/setup to create your admin account');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
