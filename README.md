# Allie Agent - Autonomous Crypto Trading Bot

Ein sicherer, KI-gestützter Trading-Agent für Kryptowährungen mit Web-UI, gebaut mit Node.js, React und PostgreSQL.

## 📋 Projekt-Übersicht

Allie Agent ist ein produktionsorientierter Trading-Bot, der:
- Autonomes Trading auf Hyperliquid (Testnet)
- KI-gesteuerte Entscheidungen via Kimi K2 (OpenRouter)
- Lernen aus Fehlern und Anpassung der Strategien
- Vollständige Transparenz und manuelle Kontrolle
- Emergency Kill Switch für Notfälle

**Status:** MVP in Entwicklung

## 🏗️ Architektur

```
Frontend (React + TypeScript)
    ↓
Backend (Node.js + Express)
    ↓
PostgreSQL + Hyperliquid API + OpenRouter AI
```

## 📂 Projektstruktur

```
allie-agent/
├── backend/          # Node.js Backend
│   ├── src/
│   │   ├── config/     # Konfiguration
│   │   ├── services/   # Business-Logik
│   │   ├── routes/     # API-Endpoints
│   │   ├── middleware/ # Auth, Logging, etc.
│   │   └── models/     # TypeScript Types
│   └── migrations/   # SQL Migrationen
├── frontend/         # React Frontend
│   └── src/
│       ├── pages/      # Login, Dashboard
│       ├── components/ # UI-Komponenten
│       ├── api/        # API-Client
│       └── store/      # State Management
├── docs/
│   ├── features/     # Feature-Spezifikationen
│   └── architecture/ # Technische Dokumentation
└── docker-compose.yml
```

## 🚀 Schnellstart

### Voraussetzungen
- Node.js 20+
- PostgreSQL 16
- Docker (optional)

### 1. Datenbank-Setup

```bash
# PostgreSQL starten
docker run -d \
  -e POSTGRES_DB=allie_agent \
  -e POSTGRES_USER=allie_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:16
```

### 2. Backend-Setup

```bash
cd backend
npm install
cp .env.example .env
# .env editieren mit deinen Keys

# Migrationen ausführen
npm run migrate

# Development-Server
npm run dev
```

### 3. Frontend-Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Mit Docker

```bash
docker-compose up --build
```

## 🔑 Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/allie_agent
SESSION_SECRET=<generiere mit crypto.randomBytes(64).toString('hex')>

HYPERLIQUID_API_KEY=<your_api_key>
HYPERLIQUID_PRIVATE_KEY=<your_private_key>
HYPERLIQUID_TESTNET=true

OPENROUTER_API_KEY=<your_openrouter_key>
AI_MODEL=moonshot/kimi-k2

PORT=4000
NODE_ENV=development
```

## 📖 Dokumentation

### Feature-Spezifikationen
- [ALLIE-1: User Authentication](docs/features/ALLIE-1-user-authentication.md)
- [ALLIE-2: Trading Dashboard](docs/features/ALLIE-2-trading-dashboard.md)
- [ALLIE-3: Agent Control Panel](docs/features/ALLIE-3-agent-control-panel.md)
- [ALLIE-4: Hyperliquid Integration](docs/features/ALLIE-4-hyperliquid-integration.md)
- [ALLIE-5: KI Trading Logic](docs/features/ALLIE-5-ki-trading-logic.md)
- [ALLIE-6: Trade History & Logging](docs/features/ALLIE-6-trade-history-logging.md)

### Architektur
- [System-Architektur](docs/architecture/system-architecture.md)

## 🛡️ Sicherheit

- **Passwörter:** bcrypt-gehashed
- **Sessions:** HTTP-Only Cookies
- **Secrets:** Environment Variables (niemals im Code)
- **API-Wallet:** Ohne Withdrawal-Rechte
- **Emergency Stop:** Schließt alle Positionen sofort

## 🧪 Testing

### Backend-Tests
```bash
cd backend
npm test
```

### Frontend-Tests
```bash
cd frontend
npm test
```

## 📊 API-Endpoints

### Authentication
- `POST /api/auth/setup` - Initial Admin-Account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Session validieren

### Dashboard
- `GET /api/dashboard/overview` - Status & Metriken
- `GET /api/positions/active` - Offene Positionen
- `GET /api/trades/history` - Trade-Historie

### Agent Control
- `POST /api/agent/start` - Trading starten
- `POST /api/agent/stop` - Trading stoppen
- `POST /api/agent/emergency-stop` - Notfall-Stop
- `POST /api/agent/reset-emergency` - Emergency-Reset

## 🔄 Workflow (Agenten-basiert)

Dieses Projekt wurde mit 6 spezialisierten Agenten entwickelt:

1. **Requirements Engineer** → Feature-Specs
2. **Solution Architect** → System-Design
3. **Backend Developer** → APIs & Services
4. **Frontend Developer** → UI-Komponenten
5. **QA Engineer** → Testing
6. **DevOps Engineer** → Deployment

Koordination über `context.md`.

## ⚠️ Wichtige Hinweise

- **Testnet First:** Immer zuerst auf Testnet testen!
- **Kein Gambling:** Professionelles Risk-Management
- **Nie Production-Keys committen**
- **Emergency Stop niemals deaktivieren**

## 📝 Lizenz

MIT

## 🤝 Contributing

Aktuell privates Projekt, keine externen Contributions.

---

**Status:** In Entwicklung (MVP Phase)  
**Letzte Aktualisierung:** 2026-02-10
