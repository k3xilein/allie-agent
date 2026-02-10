# Allie Agent - No-CLI Setup Guide 🚀

## Quick Start (Zero CLI Commands!)

Allie Agent kann jetzt **komplett ohne Terminal-Befehle** eingerichtet werden. Alles erfolgt über das Web-Interface!

### Prerequisites

- Linux Server (Ubuntu/Debian) ODER Docker Desktop (macOS/Windows)
- Browser (Chrome, Firefox, Edge, Safari)

---

## 🖥️ Option A: Linux Server (Ubuntu/Debian)

### Fall 1: Docker noch nicht installiert

**Automatische Installation mit einem Befehl:**

```bash
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent
sudo bash install-docker.sh  # Installiert Docker + startet App
```

### Fall 2: Docker bereits installiert

**Einfach starten:**

```bash
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent
bash start.sh  # Startet alle Container
```

Oder manuell:

```bash
docker compose up -d
# oder falls alte Docker Version:
docker-compose up -d
```

---

## 💻 Option B: macOS/Windows (Docker Desktop)

### Voraussetzung: Docker Desktop installieren

- **macOS**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Windows**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Step 1: Clone & Start 📦

```bash
# Nur diese 3 Befehle nötig!
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent
docker-compose up -d
```

Das war's! 🎉

---

## 🌐 Step 2: Öffne das Web-Interface

Warte ~30 Sekunden bis alle Container hochgefahren sind, dann:

1. Öffne deinen Browser
2. Gehe zu: 
   - **Lokal**: http://localhost:3000
   - **Server**: http://YOUR_SERVER_IP:3000
3. Du wirst automatisch zur Setup-Seite weitergeleitet

## 👤 Step 3: Erstelle Admin-Account

Auf der Setup-Seite:

1. **Username** eingeben (min. 3 Zeichen)
2. **Password** eingeben (min. 12 Zeichen, mit Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen)
3. **Confirm Password**
4. Click **"Create Admin Account"**

✅ **Fertig!** Das System:
- Erstellt automatisch alle Datenbank-Tabellen
- Führt alle Migrationen aus
- Erstellt deinen Admin-Account
- Leitet dich zum Login weiter

### Step 4: Login & Onboarding 🎯

1. **Login** mit deinen Credentials
2. Werde automatisch zum **Onboarding Wizard** weitergeleitet
3. Durchlaufe die 5 Schritte:
   - ✅ Welcome
   - 🔑 API Keys (Hyperliquid + OpenRouter)
   - ⚠️ Risk Management
   - 📊 Trading Strategy
   - ✅ Completion

### Step 5: Start Trading! 💰

Nach dem Onboarding landest du im **Dashboard**:
- Siehst Account Balance, PnL, Positions
- Kannst den Agent **starten/stoppen**
- Beobachtest Trades in Echtzeit
- Verwaltest Settings

## Was läuft automatisch? 🤖

### Backend (`docker-compose up`)
✅ PostgreSQL Datenbank startet  
✅ Migrations laufen automatisch  
✅ Backend-Server startet auf Port 4000  
✅ Health-Checks erfolgen automatisch  

### Frontend
✅ Vite Dev-Server startet auf Port 3000  
✅ React App ist sofort verfügbar  
✅ Hot-Reload für Entwicklung  

### System-Checks
✅ `/setup` prüft ob DB bereit ist  
✅ Zeigt Status-Meldungen an  
✅ Bietet Retry bei Verbindungsproblemen  

## Kein CLI mehr für: ❌➡️✅

| Vorher (CLI) | Jetzt (Web-UI) |
|--------------|----------------|
| `psql -U postgres` | ✅ Auto-Migration |
| `\i migrations/*.sql` | ✅ Auto-Migration |
| `INSERT INTO users...` | ✅ Setup-Seite |
| `npm run dev` | ✅ Docker Compose |
| `.env` konfigurieren | ✅ Settings-Seite (später) |

## Troubleshooting 🔧

### "System Not Ready" angezeigt?

**Lösung:**
1. Prüfe ob Docker läuft: `docker ps`
2. Starte Container neu: `docker-compose restart`
3. Warte 30 Sekunden
4. Refresh die Setup-Seite

### "Cannot connect to backend"?

**Lösung:**
```bash
# Prüfe Backend-Logs
docker logs allie-agent-backend

# Sollte zeigen:
# ✅ Configuration validated
# ✅ Database connected successfully
# ✅ Database migrations completed
# ✅ Server running on port 4000
```

### Datenbank-Probleme?

**Lösung:**
```bash
# Datenbank neu initialisieren
docker-compose down -v
docker-compose up -d

# Warte 30 Sekunden, dann Setup-Seite öffnen
```

## Architecture Overview 🏗️

```
┌─────────────┐
│   Browser   │
│ localhost:  │
│    3000     │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  Frontend   │────▶│   Backend    │
│   (Vite)    │     │  (Node.js)   │
│   React     │     │   Express    │
└─────────────┘     └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │   Database   │
                    └──────────────┘
```

### Automatischer Ablauf beim Start:

```
1. docker-compose up -d
   ↓
2. PostgreSQL startet (Port 5432)
   ↓
3. Backend startet (Port 4000)
   ↓
4. Migrations laufen automatisch
   ├─ 001_create_users.sql
   ├─ 002_create_sessions.sql
   ├─ 003_create_trades.sql
   ├─ 004_create_ai_analyses.sql
   ├─ 005_create_system_logs.sql
   ├─ 005_create_user_settings.sql
   ├─ 006_create_audit_log.sql
   └─ 007_create_agent_state.sql
   ↓
5. Server ready ✅
   ↓
6. Frontend startet (Port 3000)
   ↓
7. http://localhost:3000 → /setup
   ↓
8. System Status Check
   ├─ GET /api/health → DB ready?
   └─ GET /api/system/status → Users exist?
   ↓
9. Setup-Formular anzeigen
   ↓
10. Admin-Account erstellen
    POST /api/auth/setup
    ↓
11. Redirect to /login
    ↓
12. Login → /onboarding → /dashboard
```

## Environment Variables (Optional) ⚙️

Die wichtigsten Variablen sind bereits in `.env.example` vordefiniert.

Für Production kannst du diese später über die **Settings-Seite** ändern (Feature kommt):

```env
# Backend (.env)
DATABASE_URL=postgresql://allie:password@postgres:5432/allie_agent
SESSION_SECRET=<auto-generated>
ENCRYPTION_KEY=<auto-generated>

# Hyperliquid (wird im Onboarding konfiguriert)
HYPERLIQUID_TESTNET=true

# OpenRouter (wird im Onboarding konfiguriert)
OPENROUTER_API_KEY=<dein-key>
```

## Production Deployment 🚀

Für Production auf einem Server (z.B. allie.memero.store):

1. **Folge DEPLOYMENT-GUIDE.md**
2. Verwende `docker-compose.prod.yml`
3. Setup läuft identisch über Web-UI
4. SSL-Zertifikate via Let's Encrypt

## Features 🎯

### ✅ Bereits implementiert:
- **No-CLI Setup** - Komplette Initialisierung über Web-UI
- **Auto-Migrations** - Datenbank-Schema wird automatisch erstellt
- **System Status Check** - Frontend prüft Backend-Verfügbarkeit
- **Onboarding Wizard** - 5-Schritte-Prozess für neue User
- **Settings Page** - Alle Konfigurationen änderbar
- **Security** - AES-256-GCM für API-Keys, Helmet.js, CORS
- **Docker Deployment** - Ein Befehl startet alles

### 🔜 Coming Soon:
- **Environment Config UI** - ENV-Variablen über Frontend ändern
- **Email Notifications** - Trade Alerts & Daily Reports
- **Multi-User Support** - Mehrere Accounts
- **Backup/Restore** - Settings und Trades exportieren

## Support & Docs 📚

- **Full Documentation**: Siehe `/docs` Ordner
- **Security Audit**: `SECURITY-AUDIT.md`
- **Deployment**: `DEPLOYMENT-GUIDE.md`
- **Features**: `ONBOARDING-SETTINGS.md`

## Summary ⚡

**Vorher:**
```bash
# 15+ Terminal-Befehle nötig
git clone ...
cd backend && npm install
cd ../frontend && npm install
docker-compose up -d postgres
psql -U postgres < migrations/*.sql
createuser allie
createdb allie_agent
npm run dev # backend
npm run dev # frontend
curl -X POST http://localhost:4000/api/auth/setup ...
```

**Jetzt:**
```bash
# Nur 3 Befehle!
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent
docker-compose up -d

# Dann im Browser: http://localhost:3000
# ✅ Click, Click, Done!
```

**Das ist der Unterschied!** 🎉

---

Made with ❤️ by the Allie Agent Team
