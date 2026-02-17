# System Architecture

## Overview

Allie Agent is an institutional-grade autonomous trading system built on a microservices-inspired architecture with a React dashboard frontend, Node.js trading engine backend, and PostgreSQL database.

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│                   (React Dashboard)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│               Reverse Proxy & SSL/TLS                       │
│                    (Nginx)                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐ ┌──────▼──────┐ ┌───────▼──────┐
│   Frontend   │ │   Backend   │ │   Database   │
│  (React 18)  │ │(Node.js 20) │ │(PostgreSQL)  │
│              │ │             │ │              │
│  5173 (dev)  │ │  4000 (api) │ │    5432      │
│  3000 (prod) │ │             │ │              │
└──────────────┘ └─────────────┘ └──────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼────┐ ┌───────▼─────┐ ┌─────▼──┐
    │  OpenRouter  │ │ Hyperliquid  │ │ cron  │
    │   (Gemini)   │ │ Exchange API │ │Engine │
    └────────┘ └──────────────┘ └───────┘
```

---

## Frontend Architecture

### Technology Stack

- **React 18** – Component framework with hooks
- **Vite 5** – Build tool with HMR
- **TypeScript 5** – Type-safe development
- **TailwindCSS 3** – Utility-first styling
- **Zustand 4** – State management
- **Framer Motion** – Animations
- **Lucide React** – Icons
- **Recharts** – Data visualization

### Component Hierarchy

```
App (Router)
├── AuthPage
│   └── LoginForm / SetupForm
├── AppShell (Layout)
│   ├── Sidebar Navigation
│   ├── Header (Session info)
│   └── MainContent
│       ├── Dashboard
│       │   ├── OverviewCards
│       │   ├── EngineControl
│       │   ├── ActivePositions
│       │   ├── TradeHistory
│       │   └── PerformanceCharts
│       ├── ActivityLogs
│       │   ├── Filters
│       │   ├── LogStream
│       │   └── Pagination
│       └── Settings
│           ├── TradingParams
│           ├── RiskManagement
│           └── SessionManagement
```

### State Management Flow

```
User Action
    ↓
Component Event Handler
    ↓
Zustand Store Action
    ↓
API Call (client.ts)
    ↓
Backend Response
    ↓
Store Update
    ↓
Component Re-render
```

### Data Flow

```
Dashboard:
1. Component mounts
2. useEffect → fetchOverview() 
3. API call to GET /api/dashboard/overview
4. Response parsed and stored in Zustand
5. Component renders with latest data
6. Auto-refresh interval updates every 5s

Activity Logs:
1. User sets filters (category, severity)
2. Pagination state updates
3. Component fetches: GET /api/activity-logs?page=X&category=Y&severity=Z
4. Response: { logs: [...], pagination: {...} }
5. Zustand store updates
6. Log entries render with live feed option
7. Auto-refresh every 10s if enabled
```

---

## Backend Architecture

### Technology Stack

- **Node.js 20** – JavaScript runtime
- **Express 4** – Web framework
- **TypeScript 5** – Type safety
- **PostgreSQL 14** – Relational database
- **node-cron 3** – Scheduled tasks
- **ethers 6** – Blockchain utilities
- **OpenRouter SDK** – AI integration
- **Hyperliquid SDK** – Exchange integration

### Service Layer Architecture

```
Express Router
    ↓
Route Handlers (/api/*)
    ↓
Service Layer (Business Logic)
    ├── TradingEngine
    ├── AIService
    ├── RiskManagementEngine
    ├── HyperliquidClient
    ├── LoggingService
    ├── SettingsService
    └── AuthService
    ↓
Data Access Layer
    ├── Database (PostgreSQL)
    ├── Cache (in-memory)
    └── External APIs (OpenRouter, Hyperliquid)
```

### Trading Cycle Flow

```
┌─────────────────────────────────────────────┐
│  TradingEngine.executeCycle() - every 2min  │
└────────────────────┬────────────────────────┘
                     │
         ┌───────────▼────────────┐
         │  CYCLE START (Log)     │
         └───────────┬────────────┘
                     │
         ┌───────────▼────────────┐
         │  Check Engine Status   │
         │  Check Emergency Stop  │
         └───────────┬────────────┘
                     │
         ┌───────────▼──────────────────────┐
         │  fetchMarketData()               │
         │  - Get BTC, ETH prices           │
         │  - Calculate technical signals  │
         │  - Log: MARKET_DATA              │
         └───────────┬──────────────────────┘
                     │
         ┌───────────▼──────────────────────┐
         │  generateTechnicalSignals()      │
         │  - RSI, MACD, Bollinger analysis │
         │  - Trend detection               │
         │  - Log: TECHNICAL_SIGNAL         │
         └───────────┬──────────────────────┘
                     │
         ┌───────────▼──────────────────────┐
         │  checkAccountStatus()            │
         │  - Get balance                   │
         │  - Get open positions            │
         │  - Log: BALANCE_CHECK            │
         └───────────┬──────────────────────┘
                     │
         ┌───────────▼──────────────────────┐
         │  aiService.analyzeMarket()       │
         │  - Send context to Gemini        │
         │  - Get decision: LONG/SHORT/HOLD │
         │  - Get confidence: 0-100%        │
         │  - Log: AI_DECISION              │
         └───────────┬──────────────────────┘
                     │
         ┌───────────▼──────────────────────┐
         │  riskEngine.evaluateRisk()       │
         │  - Check position limits         │
         │  - Check daily loss limits       │
         │  - Calculate position size       │
         │  - Log: RISK_CHECK               │
         └───────────┬──────────────────────┘
                     │
         ┌───────────▼──────────────────────┐
         │ Trade Approved?                  │
         └───────────┬──────────────────────┘
                  YES│  NO
                     │   └──────────────────┐
                     │                      │
        ┌────────────▼──┐      ┌──────────▼──┐
        │ executeTrade()│      │Log: REJECTED │
        │               │      └──────────────┘
        │ - Place order │
        │ - Log trades  │
        │ - Update DB   │
        └────────────┬──┘
                     │
        ┌────────────▼──────────┐
        │ checkPositionExits()  │
        │ - Check stop losses   │
        │ - Check take profits  │
        │ - Exit if triggered   │
        └────────────┬──────────┘
                     │
        ┌────────────▼──────────┐
        │ checkPartialProfits() │
        │ - Scale out strategy  │
        │ - Reduce position     │
        └────────────┬──────────┘
                     │
        ┌────────────▼──────────┐
        │  CYCLE END (Log)      │
        │  Next cycle in 2min   │
        └───────────────────────┘
```

### Database Schema

```
┌──────────────┐
│    users     │
├──────────────┤
│ id           │
│ email        │
│ password_h   │
│ created_at   │
└──────────────┘
        │
        │ 1:1
        ▼
┌──────────────────┐
│ user_settings    │
├──────────────────┤
│ user_id (FK)     │
│ strategy (JSONB) │
│ api_keys (enc)   │
│ updated_at       │
└──────────────────┘

┌──────────────┐
│   trades     │────┐
├──────────────┤    │
│ id           │    │ 1:many
│ user_id (FK) │    │
│ symbol       │    │
│ entry_price  │    │
│ exit_price   │    │
│ quantity     │    │
│ pnl          │    │
│ created_at   │    │
└──────────────┘    │
                    │
             ┌──────▼────────────┐
             │ ai_analyses       │
             ├───────────────────┤
             │ id                │
             │ trade_id (FK)     │
             │ confidence        │
             │ reasoning (text)  │
             │ market_context    │
             │ created_at        │
             └───────────────────┘

┌──────────────────┐
│  activity_logs   │
├──────────────────┤
│ id               │
│ timestamp        │
│ category         │
│ event            │
│ message          │
│ severity         │
│ details (JSONB)  │
│ cycle_id         │
└──────────────────┘
```

### API Route Structure

```
/api
├── /auth
│   ├── POST /setup
│   ├── POST /login
│   ├── POST /logout
│   └── GET  /session
├── /agent
│   ├── POST /start
│   ├── POST /stop
│   ├── POST /emergency-stop
│   └── GET  /status
├── /dashboard
│   ├── GET /overview
│   ├── GET /active
│   └── GET /history
├── /activity-logs
│   └── GET / (with filters)
├── /settings
│   ├── GET /
│   └── POST /update
└── /health
    ├── GET /check
    └── GET /status
```

---

## AI Integration Architecture

### Gemini 2.0 Flash Decision Making

```
Market Data Input
    ↓
┌───────────────────────────────────┐
│  AI Prompt Construction           │
├───────────────────────────────────┤
│ • Current BTC/ETH prices          │
│ • Technical indicators (RSI, etc) │
│ • Recent trades and PnL           │
│ • Account balance and risk limits │
│ • Market regime (trend/sideways)  │
│ • Portfolio exposure              │
│ • Time of day analysis            │
└────────────────┬──────────────────┘
                 │
        ┌────────▼────────┐
        │ Send to Gemini  │
        │ via OpenRouter  │
        └────────┬────────┘
                 │
        ┌────────▼──────────────┐
        │ Gemini Analysis       │
        ├──────────────────────┤
        │ • Analyze trend      │
        │ • Assess momentum    │
        │ • Evaluate risk      │
        │ • Generate decision  │
        │ • Provide reasoning  │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │ Response Parsing      │
        │                       │
        │ Decision: LONG        │
        │ Confidence: 72%       │
        │ Reason: "Bullish RSI" │
        │ Stop Loss: $100       │
        │ Take Profit: $300     │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │ Risk Validation       │
        │ → Calculate position  │
        │ → Check limits        │
        │ → Approve/Reject      │
        └────────┬──────────────┘
                 │
        Trade Decision (EXECUTE or REJECT)
```

### Prompt Structure

```
You are a professional algorithmic trader analyzing market conditions.

Current Market:
- BTC Price: $42,150.00
- ETH Price: $2,340.00
- Market Regime: Uptrend (RSI: 68)
- Volatility: Medium

Portfolio:
- Balance: $10,234.56
- Open Positions: 2
- Total Exposure: 35%

Recent Performance:
- Today's P&L: +$234.50 (+2.34%)
- Win Rate: 65%
- Avg Win: $125.00
- Avg Loss: -$45.00

Risk Parameters:
- Max Position Size: 20% per trade
- Max Leverage: 10x
- Stop Loss: 3%
- Take Profit: 6%

Based on technical analysis and market conditions, provide:
1. Trading decision (LONG/SHORT/HOLD)
2. Confidence level (0-100%)
3. Reasoning (2-3 sentences)
4. Suggested position size
5. Stop loss and take profit levels

Respond in JSON format.
```

---

## Exchange Integration

### Hyperliquid API Connection

```
Transaction Flow
    ↓
┌────────────────────────────────┐
│ Sign Transaction with Private  │
│ Key (ethers.js)                │
└────────────────┬───────────────┘
                 │
        ┌────────▼─────────┐
        │ Send to Exchange │
        │ API Endpoint     │
        └────────┬─────────┘
                 │
        ┌────────▼──────────────┐
        │ Exchange Validates    │
        │ • Signature           │
        │ • Nonce               │
        │ • Collateral          │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │ Order Placement       │
        │ • Market/Limit order  │
        │ • Size calculation    │
        │ • Leverage setting    │
        └────────┬──────────────┘
                 │
        ┌────────▼──────────────┐
        │ Order Confirmation    │
        │ • Order ID            │
        │ • Entry price         │
        │ • Status              │
        └────────┬──────────────┘
                 │
        Database Update & Logging
```

---

## Deployment Architecture

### Docker Compose Setup

```
allie-agent/
├── docker-compose.yml
├── backend/
│   └── Dockerfile (Node.js image)
├── frontend/
│   └── Dockerfile (Node.js build, Nginx serve)
└── nginx/
    └── nginx.conf (Reverse proxy)

Services:
1. allie-backend (Node.js, port 4000 internal)
2. allie-frontend (Nginx, port 3000 internal)
3. allie-postgres (PostgreSQL, port 5432 internal)

External Access via Nginx reverse proxy on port 80/443
```

### Production Deployment

```
┌──────────────────┐
│ GitHub Actions   │
│ (CI/CD)          │
└────────┬─────────┘
         │
    ┌────▼────────────┐
    │ Run Tests       │
    │ Build & Push    │
    │ Docker images   │
    └────┬────────────┘
         │
    ┌────▼──────────────────┐
    │ SSH to Server         │
    │ memero.store:22       │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ docker-compose        │
    │ pull && up -d --build │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ Run Migrations        │
    │ Verify Deployment     │
    │ Check Health          │
    └────────────────────────┘
```

---

## Monitoring & Observability

### Logging Strategy

**Database Logging** (activity_logs table):
- Every trading cycle step
- Entry point: TradingEngine
- Granularity: ~10 log entries per cycle

**Application Logs** (stdout):
- Service startup messages
- Database connection events
- Error stack traces
- Performance warnings

**Frontend Logging**:
- Console errors and warnings
- User interactions
- API response times

### Metrics & Alerting

```
Key Metrics:
├── Trading Performance
│   ├── Win rate
│   ├── Average trade duration
│   ├── Daily P&L
│   └── Max drawdown
├── System Health
│   ├── Cycle execution time
│   ├── API response time
│   ├── Database query time
│   └── Memory usage
└── Risk Metrics
    ├── Current exposure
    ├── Portfolio delta
    ├── Leverage usage
    └── Daily loss vs limit
```

---

## Security Architecture

### Authentication Flow

```
User Login
    ↓
┌─────────────────────────┐
│ POST /api/auth/login    │
│ { password }            │
└────────┬────────────────┘
         │
    ┌────▼──────────────┐
    │ Validate password │
    │ (bcrypt compare)  │
    └────┬───────────────┘
         │ Match?
    YES  │  NO
         │   └──→ Error
    ┌────▼──────────────────┐
    │ Generate session      │
    │ + random token        │
    │ + expiry (24 hours)   │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ Set httpOnly cookie   │
    │ Return session info   │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ Frontend stores token │
    │ (auto-refresh)        │
    └───────────────────────┘
```

### Data Encryption

```
API Keys Storage:
API Key
    ↓
AES-256-GCM Encryption
    ↓
Encrypted Blob + IV + Auth Tag
    ↓
Store in Database
    ↓
On retrieval: Decrypt with master key
    ↓
Use in API calls (never exposed to frontend)
```

---

## Performance Optimization

### Frontend Optimization

- Code splitting by route
- Lazy component loading
- Image optimization
- CSS minification
- JavaScript minification
- Caching headers

Target: **FCP < 1.5s, LCP < 2.5s**

### Backend Optimization

- Database query indexing
- Connection pooling
- Response caching (Redis-ready)
- Efficient pagination
- Request batching

Target: **API response < 500ms**

### Database Optimization

- Indexes on frequently queried columns
- Partitioning for large tables (if needed)
- Query optimization
- Vacuum and analyze maintenance

---

## Scalability Considerations

### Current Architecture Limits

- Single PostgreSQL instance (can handle ~100K trades/day)
- Single Node.js backend (can handle ~50 API req/s)
- Direct Hyperliquid connection (respects rate limits)

### Future Scaling Options

1. **Database**: PostgreSQL read replicas, connection pooling
2. **Backend**: Multiple instances with load balancer
3. **Caching**: Redis for session and market data cache
4. **Messaging**: Message queue for async operations
5. **Analytics**: Separate OLAP database for reporting

---

**Architecture Document** – Allie Agent v1.0
**Last Updated**: February 2026
