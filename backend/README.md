# Backend API

## Node.js Trading Engine and REST API

The backend provides the trading engine, database layer, and API endpoints for Allie Agent.

---

## Architecture

### Services

**TradingEngine** – Main orchestrator that runs trading cycles at configured intervals
- Fetches market data
- Generates technical signals
- Requests AI analysis
- Evaluates trade risk
- Executes trades
- Manages positions
- Logs all activity

**AIService** – Market analysis via OpenRouter/Gemini
- Receives market context
- Analyzes technical indicators
- Returns trade decision and confidence
- Provides reasoning for decisions

**RiskManagementEngine** – Trade validation and position sizing
- Validates trade against risk rules
- Calculates optimal position size
- Applies Kelly Criterion when appropriate
- Manages circuit breakers

**HyperliquidClient** – Exchange connectivity
- Manages API authentication
- Fetches market data and balances
- Places and cancels orders
- Derives wallet address from private key

**LoggingService** – Database logging layer
- Records trades to database
- Records AI analyses
- Logs activity for audit trail
- Retrieves historical data

---

## Configuration

### Environment Variables

```env
# Exchange
HYPERLIQUID_WALLET_ADDRESS=0x...
HYPERLIQUID_PRIVATE_KEY=...
HYPERLIQUID_TESTNET=true/false

# AI Service
OPENROUTER_API_KEY=...
AI_MODEL=google/gemini-2.0-flash-001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Session
SESSION_SECRET=...
NODE_ENV=production
PORT=4000
```

### Trading Parameters

Configured via `/api/settings` or database settings table:

- `analysisIntervalMinutes` – Cycle frequency (2-60)
- `maxPositionSizePercent` – % of balance per trade (1-50)
- `maxLeverage` – Leverage limit (1-20)
- `minConfidence` – Min AI confidence (50-95)
- `stopLossPercent` – Default stop loss (0.5-10)
- `takeProfitPercent` – Default take profit (0.5-20)
- `maxDailyLossPercent` – Daily loss limit (1-20)
- `maxDrawdownPercent` – Max portfolio drawdown (5-50)
- `maxPositions` – Max concurrent positions (1-10)

---

## API Routes

### Authentication (`/api/auth`)

```
POST /setup              Create admin account
POST /login              User login
POST /logout             User logout
GET  /session            Validate session
```

### Agent Control (`/api/agent`)

```
POST /start              Start trading engine
POST /stop               Stop trading engine
POST /emergency-stop     Halt trading immediately
POST /reset-emergency    Reset emergency stop
GET  /status             Get engine status
```

### Dashboard (`/api/dashboard`)

```
GET /overview            Account and metrics summary
GET /active              Get active positions
GET /history             Trade history with pagination
```

### Activity Logs (`/api/activity-logs`)

```
GET /                    Activity logs with filtering
```

Query parameters:
- `page` – Page number (default: 1)
- `limit` – Items per page (default: 50, max: 200)
- `category` – Filter by category (ENGINE, MARKET, AI, TRADE, etc.)
- `severity` – Filter by severity (INFO, SUCCESS, WARNING, ERROR)

### Settings (`/api/settings`)

```
GET /                    Get current settings
POST /update             Update settings
```

### Health (`/api/health`)

```
GET /check               Run diagnostics
GET /status              Get system health status
```

---

## Database

### Schema

**users**
- User accounts with password authentication
- Session tokens

**trades**
- Entry/exit prices
- PnL and fees
- Strategy and reasoning
- Market context at entry

**ai_analyses**
- AI decisions and confidence
- Market data received
- Technical analysis

**activity_logs**
- Every trading cycle step
- Market fetches, signals, decisions, executions, errors
- Category and severity for filtering

**agent_state**
- Engine status
- Last analysis/trade timestamps
- Statistics

**user_settings**
- Encrypted API keys
- Trading parameters
- Risk management rules

### Migrations

Migrations run automatically on startup:

1. `001_create_users.sql` – User authentication
2. `002_create_sessions.sql` – Session management
3. `003_create_trades.sql` – Trade history
4. `004_create_ai_analyses.sql` – AI decision logging
5. `005_create_system_logs.sql` – System logs
6. `006_create_audit_log.sql` – Audit trail
7. `007_create_agent_state.sql` – Agent state
8. `008_create_user_settings.sql` – User settings
9. `009_create_activity_logs.sql` – Activity logging

---

## Development

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

Compiles TypeScript to `dist/` directory.

### Run Development Server

```bash
npm run dev
```

Server runs on port 4000 with auto-reload.

### Production Server

```bash
npm start
```

---

## Security

### API Security
- Session-based authentication
- Rate limiting (60 req/min default)
- Input validation and sanitization
- HTTPS/TLS in production

### Data Security
- API keys encrypted with AES-256-GCM
- Passwords hashed with bcrypt
- No sensitive data in logs
- SQL injection prevention

### Secrets Management
- Environment variables only
- SESSION_SECRET generated on first start
- No hardcoded keys or passwords

---

## Monitoring

### Logs

View backend logs:

```bash
docker logs allie-backend-prod -f
```

Log levels: debug, info, warn, error

### Health Checks

System performs health checks on startup:
- Database connectivity
- Exchange API authentication
- AI service reachability

Check status: `GET /health`

### Metrics

Available through agent status:
- Cycle count and duration
- Trade count and success rate
- Error count and consecutive errors
- Last analysis/trade timestamps

---

## Troubleshooting

### Database Issues

```bash
# Reset database
docker-compose down
docker volume rm allie-agent_postgres_data
docker-compose up -d
```

### Exchange Connection Failed

1. Verify wallet address is derived correctly
2. Check API key permissions
3. Ensure testnet flag matches wallet type

### AI Service Errors

1. Verify OpenRouter API key is valid
2. Check model name is supported
3. Ensure request payload is valid JSON

### High Response Latency

1. Check database query performance
2. Monitor exchange API latency
3. Verify rate limiting isn't triggered

---

## Contributing

- Follow ESLint configuration
- Use TypeScript for type safety
- Add database migrations for schema changes
- Update API documentation
- Test before committing

---

**Backend** – Allie Agent Trading Engine
