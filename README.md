# Allie Agent

## Autonomous Cryptocurrency Trading System

An enterprise-grade, AI-powered trading bot for automated cryptocurrency trading with advanced risk management, real-time monitoring, and full audit logging.

---

## Overview

Allie Agent is a production-ready autonomous trading system designed to execute trades on Hyperliquid with institutional-grade safety features, comprehensive activity logging, and professional monitoring capabilities.

### Key Features

- **Autonomous Trading Engine** – Fully automated market analysis and trade execution on Hyperliquid
- **AI-Driven Decision Making** – Advanced market analysis powered by Google Gemini 2.0 and machine learning indicators
- **Real-Time Activity Logging** – Complete audit trail of every trading cycle, market analysis, and decision
- **Risk Management Framework** – Multiple circuit breakers, position sizing limits, drawdown protection, and emergency stop mechanisms
- **Advanced Technical Analysis** – Multi-timeframe analysis, confluence scoring, market regime detection, and volatility metrics
- **Production Deployment** – Docker-based containerization with SSL/TLS support, reverse proxy configuration, and automated database migrations
- **Professional Dashboard** – Clean, institutional web interface with real-time metrics, trade history, position tracking, and activity logs
- **API-First Architecture** – RESTful API for all trading operations with rate limiting and request validation

### Technology Stack

**Backend:**
- Node.js with Express.js
- PostgreSQL database with full audit logging
- Hyperliquid SDK for exchange connectivity
- OpenRouter API integration for AI analysis

**Frontend:**
- React 18 with TypeScript
- Vite for build optimization
- TailwindCSS for styling
- Zustand for state management

**Infrastructure:**
- Docker and Docker Compose
- Nginx reverse proxy with SSL/TLS
- Automated database migrations
- Production-grade security middleware

---

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Hyperliquid wallet with API keys (testnet or mainnet)
- OpenRouter API key for AI analysis

### Deployment (Development)

```bash
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent
docker-compose up -d
```

Access the application at **http://localhost:5173**

### Deployment (Production)

```bash
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent
docker-compose -f docker-compose.prod.yml up -d --build
```

For HTTPS configuration, see [HTTPS Setup Guide](./HTTPS-SETUP-GUIDE.md)

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Hyperliquid Configuration
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address
HYPERLIQUID_PRIVATE_KEY=your_private_key
HYPERLIQUID_TESTNET=false

# AI Service (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_key
AI_MODEL=google/gemini-2.0-flash-001

# Database
DATABASE_URL=postgres://user:password@postgres:5432/allie_agent

# Session Management
SESSION_SECRET=your_session_secret_key
```

### Application Settings

Configure trading parameters through the web dashboard after initial setup:

- **Analysis Interval** – How frequently the engine analyzes markets (2-60 minutes)
- **Position Management** – Max position size, leverage, and open positions
- **Risk Parameters** – Daily loss limits, drawdown protection, stop loss/take profit targets
- **AI Confidence Threshold** – Minimum confidence required to execute trades
- **Market Regimes** – Trading rules based on market conditions

---

## Architecture

### Trading Cycle

The trading engine runs on a configurable interval (default: 2 minutes) and executes the following steps:

1. **Market Analysis** – Fetch latest OHLCV data and compute technical indicators
2. **Signal Generation** – Identify trading opportunities using confluence scoring
3. **AI Analysis** – Send market context to Gemini for decision making
4. **Risk Evaluation** – Verify trade meets risk management criteria
5. **Trade Execution** – Place market order with configured leverage
6. **Position Management** – Monitor open positions, manage exits, take partial profits
7. **Activity Logging** – Record all decisions and outcomes for audit trail

### Database Schema

- **users** – User accounts with authentication
- **trades** – Complete trade history with entry/exit prices, PnL, and strategy context
- **ai_analyses** – AI decision history with confidence levels and reasoning
- **activity_logs** – Granular activity log for every trading cycle step
- **agent_state** – Current engine state and statistics
- **user_settings** – Encrypted API keys and trading preferences

---

## Usage

### Initial Setup

1. Navigate to **http://your-server:5173/setup**
2. Create an admin account with a secure password
3. Enter Hyperliquid API credentials and OpenRouter API key
4. Configure trading parameters and risk limits
5. Run health checks to verify exchange connectivity

### Dashboard

The main dashboard displays:
- Current account balance and total P&L
- Active positions with unrealized P&L
- Agent status (running/stopped/emergency stop)
- Quick access to start/stop trading
- System health diagnostics

### Activity Log

The Activity Log page provides complete visibility into trading operations:
- Real-time activity stream with filtering by category and severity
- Every market analysis, AI decision, trade execution, and error
- Expandable details for each log entry
- Live auto-refresh or manual refresh capability
- Pagination for browsing historical logs

### Trade History

View completed trades with:
- Entry and exit prices with actual fill prices
- Trade duration and realized P&L
- Strategy used and AI reasoning
- Market context and technical indicators at entry

### Settings

Configure:
- API keys (encrypted storage)
- Trading parameters (position size, leverage, intervals)
- Risk management rules (daily loss, drawdown, consecutive losses)
- Notification preferences

---

## API Reference

### Authentication

All API endpoints require a valid session cookie. Obtain a session by logging in through the web interface.

### Core Endpoints

**Agent Control**
- `POST /api/agent/start` – Start trading engine
- `POST /api/agent/stop` – Stop trading engine
- `POST /api/agent/emergency-stop` – Halt all trading immediately
- `GET /api/agent/status` – Current engine status

**Dashboard**
- `GET /api/dashboard/overview` – Account summary and metrics
- `GET /api/positions/active` – Open positions
- `GET /api/trades/history` – Trade history with pagination

**Activity Logs**
- `GET /api/activity-logs` – Activity log with filtering and pagination

**Settings**
- `GET /api/settings` – Current settings
- `POST /api/settings/update` – Update settings

**Health**
- `GET /api/health/check` – Run diagnostics
- `GET /api/health/status` – System health status

---

## Monitoring

### Health Checks

The system includes comprehensive health checks:
- Database connectivity
- Exchange API authentication
- AI service availability
- Test trade execution capability

Access health checks through the dashboard or via:

```bash
curl http://localhost:4000/health
```

### Logs

View application logs with Docker:

```bash
docker logs allie-backend-prod -f
docker logs allie-frontend-prod -f
```

---

## Risk Management

Allie Agent implements multiple layers of risk protection:

### Circuit Breakers
- Daily loss limit (stops trading after daily loss threshold)
- Drawdown protection (reduces position size during losing streaks)
- Maximum consecutive losses (auto-stop after N consecutive losses)
- Emergency stop mechanism (manual kill switch)

### Position Management
- Position size capped as percentage of account balance
- Leverage limits per trade
- Maximum concurrent open positions
- Partial profit taking at configured gain targets
- Trailing stop loss functionality

### Market-Based Adjustments
- Reduced position sizing during high volatility
- Confidence threshold enforcement
- Risk/reward ratio validation
- Market regime detection

---

## Security

### Data Protection
- AES-256-GCM encryption for API keys in database
- Session-based authentication with secure cookies
- Password hashing with bcrypt
- SQL injection prevention via parameterized queries

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS policy enforcement
- HTTPS/TLS required for production

### Operational Security
- Encrypted credentials in transit
- No sensitive data in logs
- Audit trail of all operations
- Database backups recommended

---

## Troubleshooting

### Agent Not Executing Trades

1. Check Activity Log for rejection reasons
2. Verify risk settings (confidence threshold, position size limits)
3. Ensure sufficient account balance
4. Check market conditions and technical signals
5. Verify AI service connectivity

### High Slippage

- Check market liquidity and order size
- Reduce leverage temporarily
- Increase max slippage tolerance
- Consider adjusting trading pairs

### Database Issues

```bash
docker-compose down
docker volume rm allie-agent_postgres_data
docker-compose up -d
```

---

## Development

### Project Structure

```
allie-agent/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── services/        # Trading, risk, AI, logging services
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, rate limiting, validation
│   │   ├── models/          # TypeScript type definitions
│   │   ├── utils/           # Database, migrations, logging
│   │   └── config/          # Configuration and environment
│   ├── migrations/          # SQL database schema files
│   └── Dockerfile
│
├── frontend/                # React web interface
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable UI components
│   │   ├── store/           # Zustand state management
│   │   ├── api/             # REST API client
│   │   ├── types/           # TypeScript interfaces
│   │   └── lib/             # Utility functions
│   ├── Dockerfile.prod
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── docker-compose.yml       # Development configuration
├── docker-compose.prod.yml  # Production configuration
├── nginx.prod.conf          # Production reverse proxy
└── README.md                # This file
```

### Building from Source

Backend:
```bash
cd backend
npm install
npm run build
npm start
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Deployment

### Production Checklist

- [ ] Use production environment variables
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure database backups
- [ ] Set up monitoring and alerting
- [ ] Review security audit findings
- [ ] Test emergency stop functionality
- [ ] Verify rate limiting is active
- [ ] Configure firewall rules appropriately

For detailed deployment instructions, see [Deployment Guide](./DEPLOYMENT-GUIDE.md)

---

## Performance

### System Requirements

**Minimum:**
- 2 CPU cores
- 2GB RAM
- 20GB storage

**Recommended:**
- 4+ CPU cores
- 4GB RAM
- 50GB storage (for database growth)

### Benchmarks

- Database queries: < 100ms average
- API response time: < 500ms (p99)
- Trading cycle latency: < 5 seconds
- Market data fetch: < 1 second

---

## License

Proprietary. All rights reserved.

---

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Check existing documentation
- Review activity logs for detailed error information
- Contact the development team

---

**Allie Agent** – Institutional-Grade Autonomous Trading System
