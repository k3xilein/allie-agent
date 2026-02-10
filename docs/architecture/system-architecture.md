# Allie Agent - System Architecture

**Version:** 1.0  
**Erstellt:** 2026-02-10  
**Agent:** Solution Architect  
**Status:** Finalisiert

---

## 1. Architektur-Übersicht

### 1.1 High-Level-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│                    (Web Browser)                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  - Login/Dashboard UI                                       │
│  - WebSocket Client                                         │
│  - State Management (Zustand)                               │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Layer   │  │ Trading      │  │  AI Engine   │      │
│  │  (REST +WS)  │  │ Orchestrator │  │  (Kimi K2)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                   │                  │            │
│         └───────────┬───────┴──────────────────┘            │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Services Layer                             │   │
│  │  - AuthService                                       │   │
│  │  - TradingService                                    │   │
│  │  - HyperliquidClient                                 │   │
│  │  - AIService (OpenRouter)                            │   │
│  │  - LoggingService                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌─────────┐   ┌──────────┐   ┌──────────┐
    │PostgreSQL│   │Hyperliquid│  │OpenRouter│
    │    DB    │   │  Testnet  │  │ (Kimi K2)│
    └─────────┘   └──────────┘   └──────────┘
```

### 1.2 Deployment-Architektur (Docker)

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host (Linux VPS)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Docker Compose Network                   │   │
│  │                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │   │
│  │  │   frontend   │  │   backend    │  │ postgres │  │   │
│  │  │  (Nginx +    │  │  (Node.js)   │  │   (DB)   │  │   │
│  │  │   React)     │  │              │  │          │  │   │
│  │  │   :3000      │  │   :4000      │  │  :5432   │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │   │
│  │         │                 │               │        │   │
│  │         └────────┬────────┴───────────────┘        │   │
│  │                  │                                 │   │
│  │                  ▼                                 │   │
│  │          ┌──────────────┐                         │   │
│  │          │  Volume      │                         │   │
│  │          │  (pgdata)    │                         │   │
│  │          └──────────────┘                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Port Mappings:                                              │
│  - 80:3000  (Frontend - HTTP)                                │
│  - 443:3000 (Frontend - HTTPS mit Let's Encrypt)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tech-Stack

### 2.1 Frontend
- **Framework:** React 18
- **Sprache:** TypeScript
- **Build-Tool:** Vite
- **State Management:** Zustand (leichtgewichtig, einfach)
- **HTTP-Client:** Axios
- **WebSocket-Client:** native WebSocket API
- **Styling:** TailwindCSS (minimalistisch, utility-first)
- **Routing:** React Router v6
- **Charts:** Recharts (für PnL-Visualisierung)

### 2.2 Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **Sprache:** TypeScript
- **WebSocket:** ws (WebSocket-Library)
- **Validation:** Zod (schema-basiert)
- **Authentication:** bcrypt + express-session
- **Database Client:** node-postgres (pg)
- **Logging:** Winston
- **Task Scheduling:** node-cron (für Trading-Loop)

### 2.3 Datenbank
- **DBMS:** PostgreSQL 16
- **Migrations:** node-pg-migrate
- **Connection Pooling:** pg.Pool

### 2.4 Externe APIs
- **Trading:** Hyperliquid Testnet API
- **KI:** OpenRouter API (Kimi K2)
- **Technical Analysis:** ta-lib (Node.js Binding)

### 2.5 Infrastructure
- **Containerisierung:** Docker + Docker Compose
- **Reverse Proxy:** Nginx (im Frontend-Container)
- **SSL:** Let's Encrypt (Certbot)
- **Secrets Management:** Environment Variables (.env)

---

## 3. Datenbank-Schema

### 3.1 users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### 3.3 trades
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(5) NOT NULL CHECK (side IN ('long', 'short')),
  entry_price DECIMAL(18, 8) NOT NULL,
  exit_price DECIMAL(18, 8),
  size DECIMAL(18, 8) NOT NULL,
  entry_timestamp TIMESTAMP NOT NULL,
  exit_timestamp TIMESTAMP,
  realized_pnl DECIMAL(18, 8),
  strategy VARCHAR(50),
  ai_reasoning TEXT,
  market_context JSONB,
  evaluation VARCHAR(10) CHECK (evaluation IN ('good', 'bad', NULL)),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trades_entry_ts ON trades(entry_timestamp DESC);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_evaluation ON trades(evaluation);
```

### 3.4 ai_analyses
```sql
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market_data JSONB NOT NULL,
  current_position JSONB,
  ai_response TEXT NOT NULL,
  decision VARCHAR(20) NOT NULL,
  confidence INTEGER,
  action_taken BOOLEAN DEFAULT FALSE,
  rejection_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyses_timestamp ON ai_analyses(timestamp DESC);
CREATE INDEX idx_analyses_action_taken ON ai_analyses(action_taken);
```

### 3.5 system_logs
```sql
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  user_id INTEGER REFERENCES users(id),
  details JSONB,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_logs_severity ON system_logs(severity);
CREATE INDEX idx_logs_event_type ON system_logs(event_type);
```

### 3.6 audit_log
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  ip_address VARCHAR(45),
  result VARCHAR(20) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE')),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id);
```

### 3.7 agent_state
```sql
CREATE TABLE agent_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton
  status VARCHAR(20) NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'emergency_stop')),
  last_analysis_at TIMESTAMP,
  last_trade_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial state
INSERT INTO agent_state (id, status) VALUES (1, 'stopped');
```

---

## 4. API-Spezifikation

### 4.1 REST-Endpoints

#### Authentication
```
POST   /api/auth/setup          # Initial admin account creation
POST   /api/auth/login          # User login
POST   /api/auth/logout         # User logout
GET    /api/auth/session        # Validate session
```

#### Dashboard
```
GET    /api/dashboard/overview  # Agent status + metrics
GET    /api/positions/active    # Current open positions
GET    /api/trades/history      # Historical trades (paginated)
GET    /api/trades/:id          # Single trade details
```

#### Agent Control
```
POST   /api/agent/start         # Start trading agent
POST   /api/agent/stop          # Stop trading agent
POST   /api/agent/emergency-stop # Close all positions + stop
POST   /api/agent/reset-emergency # Reset emergency mode
GET    /api/agent/status        # Current agent status
```

#### AI & Analytics
```
POST   /api/ai/analyze          # Trigger manual analysis (dev only)
GET    /api/ai/learning-stats   # Strategy stats + mistakes
```

#### Logging
```
GET    /api/logs/export         # Export logs (JSON/CSV)
```

### 4.2 WebSocket-Events

#### Client → Server
```
{ "type": "subscribe", "channel": "agent_status" }
{ "type": "subscribe", "channel": "positions" }
{ "type": "subscribe", "channel": "trades" }
{ "type": "unsubscribe", "channel": "..." }
```

#### Server → Client
```
{ "type": "agent_status", "data": { "status": "running", ... } }
{ "type": "position_update", "data": { "positions": [...] } }
{ "type": "new_trade", "data": { "trade": {...} } }
{ "type": "error", "message": "..." }
```

---

## 5. Service-Architektur

### 5.1 AuthService
**Verantwortung:** User-Management, Session-Handling, Password-Hashing

**Methoden:**
```typescript
class AuthService {
  async createAdminAccount(username: string, password: string): Promise<User>
  async login(username: string, password: string): Promise<SessionToken>
  async logout(token: string): Promise<void>
  async validateSession(token: string): Promise<User | null>
  async cleanExpiredSessions(): Promise<void> // Cron-Job
}
```

### 5.2 TradingService
**Verantwortung:** Trading-Orchestration, Position-Management, Risk-Checks

**Methoden:**
```typescript
class TradingService {
  async executeMarketOrder(params: OrderParams): Promise<OrderResult>
  async closeAllPositions(): Promise<CloseAllResult>
  async getActivePositions(): Promise<Position[]>
  async getAccountBalance(): Promise<Balance>
  async canExecuteTrade(params: TradeDecision): Promise<RiskCheckResult>
}
```

### 5.3 HyperliquidClient
**Verantwortung:** Direkte API-Integration mit Hyperliquid

**Methoden:**
```typescript
class HyperliquidClient {
  async getAccountInfo(): Promise<AccountInfo>
  async getOpenPositions(): Promise<HLPosition[]>
  async placeMarketOrder(order: MarketOrder): Promise<OrderResponse>
  async cancelAllOrders(): Promise<void>
  async getMarketData(symbol: string): Promise<MarketData>
}
```

### 5.4 AIService
**Verantwortung:** KI-Kommunikation, Prompt-Engineering, Response-Parsing

**Methoden:**
```typescript
class AIService {
  async analyzeMarket(params: AnalysisInput): Promise<TradeDecision>
  async buildPrompt(marketData: MarketData, context: TradingContext): string
  async parseResponse(aiResponse: string): TradeDecision
  async getHistoricalMistakes(): Promise<Mistake[]>
}
```

### 5.5 LoggingService
**Verantwortung:** Strukturiertes Logging in DB + File

**Methoden:**
```typescript
class LoggingService {
  async logTrade(trade: Trade): Promise<void>
  async logAIAnalysis(analysis: AIAnalysis): Promise<void>
  async logSystemEvent(event: SystemEvent): Promise<void>
  async logAuditAction(action: AuditAction): Promise<void>
}
```

### 5.6 TradingOrchestrator
**Verantwortung:** Hauptloop, verbindet alle Services

**Flow:**
```typescript
class TradingOrchestrator {
  private async tradingLoop() {
    while (this.isRunning) {
      // 1. Check agent status
      if (status !== 'running') continue;
      
      // 2. Fetch market data
      const marketData = await this.hyperliquid.getMarketData('BTC/USDT');
      
      // 3. AI analysis
      const decision = await this.ai.analyzeMarket(marketData);
      
      // 4. Log analysis
      await this.logging.logAIAnalysis(decision);
      
      // 5. Risk checks
      if (!await this.trading.canExecuteTrade(decision)) continue;
      
      // 6. Execute
      if (decision.action !== 'HOLD') {
        await this.trading.executeMarketOrder(decision);
      }
      
      // 7. Wait for next interval (5 min)
      await sleep(5 * 60 * 1000);
    }
  }
}
```

---

## 6. Sicherheitsarchitektur

### 6.1 Secrets Management
```
.env (niemals in Git):
─────────────────────
DATABASE_URL=postgresql://user:pass@postgres:5432/allie_agent
SESSION_SECRET=<crypto.randomBytes(64).toString('hex')>

HYPERLIQUID_API_KEY=<api_key>
HYPERLIQUID_PRIVATE_KEY=<private_key>
HYPERLIQUID_TESTNET=true

OPENROUTER_API_KEY=<openrouter_key>
AI_MODEL=moonshot/kimi-k2

NODE_ENV=production
```

### 6.2 Authentication-Flow
```
1. User sendet Credentials → POST /api/auth/login
2. Server validiert gegen DB (bcrypt)
3. Bei Success: Session-Token generieren (crypto.randomBytes)
4. Token in DB speichern + in HTTP-Only Cookie setzen
5. Frontend speichert User-State (aus API-Response)
6. Jede Anfrage: Cookie wird automatisch mitgesendet
7. Middleware prüft Token in DB
8. Bei Invalid: 401 + Cookie löschen
```

### 6.3 Input-Validation
- **Frontend:** Zod-Schemas für Formular-Validierung
- **Backend:** Zod-Schemas für API-Request-Validierung
- **Datenbank:** SQL Constraints (CHECK, NOT NULL, UNIQUE)

### 6.4 Rate-Limiting
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // 5 attempts
  message: 'Too many login attempts'
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

---

## 7. Dateistruktur

```
allie-agent/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Entry point
│   │   ├── config/
│   │   │   ├── database.ts          # DB connection
│   │   │   └── environment.ts       # Env vars
│   │   ├── middleware/
│   │   │   ├── auth.ts              # Session validation
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── agent.routes.ts
│   │   │   └── logs.routes.ts
│   │   ├── services/
│   │   │   ├── AuthService.ts
│   │   │   ├── TradingService.ts
│   │   │   ├── HyperliquidClient.ts
│   │   │   ├── AIService.ts
│   │   │   ├── LoggingService.ts
│   │   │   └── TradingOrchestrator.ts
│   │   ├── models/
│   │   │   └── types.ts             # TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── logger.ts            # Winston logger
│   │   │   └── validation.ts        # Zod schemas
│   │   └── websocket/
│   │       └── server.ts            # WebSocket server
│   ├── migrations/
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_sessions.sql
│   │   ├── 003_create_trades.sql
│   │   ├── 004_create_ai_analyses.sql
│   │   ├── 005_create_system_logs.sql
│   │   ├── 006_create_audit_log.sql
│   │   └── 007_create_agent_state.sql
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Setup.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── MetricsCard.tsx
│   │   │   ├── PositionsTable.tsx
│   │   │   ├── TradeHistory.tsx
│   │   │   ├── ControlPanel.tsx
│   │   │   └── TradeDetailsModal.tsx
│   │   ├── store/
│   │   │   └── useStore.ts          # Zustand store
│   │   ├── api/
│   │   │   ├── client.ts            # Axios instance
│   │   │   └── websocket.ts         # WS client
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript types
│   │   └── utils/
│   │       └── formatters.ts
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 8. Deployment-Strategie

### 8.1 Development
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Database
docker run -d -p 5432:5432 postgres:16
```

### 8.2 Production (Docker Compose)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: allie_agent
      POSTGRES_USER: allie_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://allie_user:${DB_PASSWORD}@postgres:5432/allie_agent
      SESSION_SECRET: ${SESSION_SECRET}
      HYPERLIQUID_API_KEY: ${HYPERLIQUID_API_KEY}
      HYPERLIQUID_PRIVATE_KEY: ${HYPERLIQUID_PRIVATE_KEY}
      HYPERLIQUID_TESTNET: true
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      AI_MODEL: moonshot/kimi-k2
      NODE_ENV: production
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
      - "443:443"
    environment:
      VITE_API_URL: http://backend:4000
      VITE_WS_URL: ws://backend:4000
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
```

### 8.3 CI/CD (Optional, später)
- GitHub Actions für automatische Tests
- Docker Hub für Image-Storage
- Watchtower für automatische Updates

---

## 9. Performance-Anforderungen

| Komponente | Metrik | Zielwert |
|------------|--------|----------|
| Frontend Initial Load | Zeit | < 2s |
| API Response (GET) | Zeit | < 500ms |
| API Response (POST) | Zeit | < 1s |
| Emergency Stop | Zeit | < 1s |
| WebSocket Latency | Zeit | < 100ms |
| Database Query | Zeit | < 50ms |
| Trading Loop Cycle | Intervall | 5 min |
| AI Analysis | Zeit | < 10s |

---

## 10. Error-Handling-Strategie

### 10.1 API-Fehler (Hyperliquid)
- Network-Error: Retry (3x, exponential backoff)
- 4xx: Log + Reject (KEIN Retry)
- 429 (Rate-Limit): Backoff + Retry
- 5xx: Retry (max. 3x)

### 10.2 KI-Fehler (OpenRouter)
- Timeout: Retry (1x), dann HOLD
- Unparseable Response: Log + HOLD
- API-Error: Log + HOLD (kein Crash)

### 10.3 Datenbank-Fehler
- Connection-Loss: Retry-Pool
- Constraint-Violation: Log + Reject
- Transaction-Error: Rollback + Log

---

## 11. Monitoring & Observability

### 11.1 Logs
- **File:** `/var/log/allie-agent/app.log` (Winston)
- **Database:** system_logs Tabelle
- **Level:** DEBUG (dev), INFO (prod)

### 11.2 Metrics (Phase 2)
- Prometheus + Grafana
- Metriken:
  - Trades/Hour
  - Win-Rate
  - PnL
  - API-Latency
  - Error-Rate

---

## 12. Offene Architektur-Entscheidungen

- [ ] Session-Store: Aktuell DB, alternativ Redis (Performance)
- [ ] WebSocket-Skalierung: Aktuell single-instance, bei Bedarf Socket.io + Redis Adapter
- [ ] Backup-Strategie: PostgreSQL WAL-Archiving + Snapshots

---

## Definition of Done - Architektur

- [x] Tech-Stack definiert
- [x] Datenbank-Schema finalisiert
- [x] API-Spezifikation erstellt
- [x] Service-Architektur dokumentiert
- [x] Sicherheitsarchitektur definiert
- [x] Dateistruktur festgelegt
- [x] Deployment-Strategie dokumentiert
- [x] Performance-Anforderungen definiert
- [x] Error-Handling-Strategie festgelegt

**Status:** Bereit für Backend- und Frontend-Entwicklung ✓
