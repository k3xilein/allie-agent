# Allie Agent — Vollständige Einrichtungsanleitung

> Diese Anleitung erklärt Schritt für Schritt, wie du Allie Agent einrichtest — vom Server-Setup bis zum ersten automatisierten Trade.

---

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Server / Lokal installieren](#2-installation)
3. [API-Keys besorgen](#3-api-keys-besorgen)
   - [3.1 Hyperliquid API-Key](#31-hyperliquid-api-key-exchange)
   - [3.2 OpenRouter API-Key](#32-openrouter-api-key-ki)
4. [.env-Datei konfigurieren](#4-env-datei-konfigurieren)
5. [Allie starten](#5-allie-starten)
6. [Web-Interface einrichten](#6-web-interface-einrichten)
   - [6.1 Admin-Account erstellen](#61-admin-account-erstellen)
   - [6.2 Onboarding durchlaufen](#62-onboarding-wizard)
   - [6.3 Trading starten](#63-trading-starten)
7. [Production Deployment (HTTPS)](#7-production-deployment-https)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Voraussetzungen

| Was | Minimum | Empfohlen |
|-----|---------|-----------|
| **Server/PC** | 1 CPU, 1 GB RAM | 2 CPU, 2 GB RAM |
| **OS** | Ubuntu 22.04 / macOS / Windows | Ubuntu 24.04 LTS |
| **Docker** | Docker 24+ | Docker 27+ |
| **Docker Compose** | v2.0+ | v2.29+ |
| **Browser** | Chrome / Firefox / Safari | Aktuellste Version |

> **Kein Docker?** Das Install-Script installiert es automatisch (nur Linux).

---

## 2. Installation

### Option A: Linux Server (empfohlen für 24/7 Betrieb)

```bash
# 1. Repository klonen
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent

# 2. .env-Datei erstellen (siehe Abschnitt 4)
cp .env.example .env
nano .env   # API-Keys eintragen

# 3. Starten (installiert Docker falls nötig)
sudo bash install-docker.sh
# ODER falls Docker schon installiert ist:
bash start.sh
```

### Option B: macOS / Windows (Docker Desktop)

```bash
# 1. Docker Desktop installieren: https://www.docker.com/products/docker-desktop
# 2. Repository klonen
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent

# 3. .env-Datei erstellen (siehe Abschnitt 4)
cp .env.example .env
# .env editieren und API-Keys eintragen

# 4. Starten
docker compose up -d
```

---

## 3. API-Keys besorgen

Allie Agent benötigt **zwei API-Keys** um zu funktionieren:

| API | Wofür | Kosten |
|-----|-------|--------|
| **Hyperliquid** | Trades auf der Exchange ausführen | Kostenlos (Trading-Gebühren normal) |
| **OpenRouter** | KI-Analyse für Trading-Entscheidungen (Kimi K2) | ~$0.01–0.05 pro Analyse |

---

### 3.1 Hyperliquid API-Key (Exchange)

Hyperliquid ist eine dezentrale Perpetual-Exchange. Du brauchst einen **API-Key** und einen **Private Key** (Wallet).

#### Schritt 1: Account erstellen

1. Gehe zu **[https://app.hyperliquid.xyz](https://app.hyperliquid.xyz)**
2. Verbinde dein Wallet (MetaMask, Rabby, oder anderes EVM-Wallet)
3. Deposite USDC auf Hyperliquid (Arbitrum-Chain)

#### Schritt 2: API-Key generieren

1. Klicke auf dein **Profil-Icon** (oben rechts)
2. Gehe zu **"API"**
3. Klicke **"Generate API Key"**
4. **Wichtige Einstellungen:**

   | Einstellung | Wert | Warum |
   |-------------|------|-------|
   | **Trading** | ✅ Aktiviert | Damit der Bot handeln kann |
   | **Withdrawal** | ❌ Deaktiviert | **NIEMALS aktivieren!** Sicherheit! |
   | **IP Whitelist** | Optional | Server-IP eintragen für extra Sicherheit |

5. Kopiere und speichere:
   - **API Key** → `HYPERLIQUID_API_KEY`
   - **API Secret / Private Key** → `HYPERLIQUID_PRIVATE_KEY`

#### Schritt 3: Wallet-Adresse notieren

- Deine **Ethereum-Wallet-Adresse** (die du zum Login verwendest)
- Format: `0x...` (42 Zeichen)
- Wird als `HYPERLIQUID_WALLET_ADDRESS` benötigt

> ⚠️ **Sicherheitshinweise:**
> - **Testnet zuerst!** Starte IMMER auf dem Testnet bevor du echtes Geld riskierst
> - **Keine Withdrawal-Rechte!** Der Bot soll nur handeln, nicht abheben können
> - **Private Key sicher aufbewahren!** Niemals teilen oder committen

#### Testnet (zum Testen ohne echtes Geld)

1. Gehe zu **[https://app.hyperliquid-testnet.xyz](https://app.hyperliquid-testnet.xyz)**
2. Gleicher Prozess wie oben
3. Du bekommst automatisch Test-USDC
4. Setze `HYPERLIQUID_TESTNET=true` in der `.env`

---

### 3.2 OpenRouter API-Key (KI)

OpenRouter ist ein API-Gateway für verschiedene KI-Modelle. Allie verwendet standardmäßig **Kimi K2** von Moonshot.

#### Schritt 1: Account erstellen

1. Gehe zu **[https://openrouter.ai](https://openrouter.ai)**
2. Klicke **"Sign Up"**
3. Registriere dich mit Google, GitHub oder Email

#### Schritt 2: Credits aufladen

1. Gehe zu **[https://openrouter.ai/credits](https://openrouter.ai/credits)**
2. Klicke **"Add Credits"**
3. Lade mindestens **$5** auf (reicht für ~100-500 Analysen)
4. Zahlung via Kreditkarte oder Crypto

> 💡 **Kosten-Übersicht für Kimi K2:**
> - Input: ~$0.60 / 1M Tokens
> - Output: ~$2.00 / 1M Tokens
> - **Pro Analyse: ~$0.01–0.05** (je nach Marktdaten-Menge)
> - Bei 5-Minuten-Intervall: ~$3–15 / Tag

#### Schritt 3: API-Key erstellen

1. Gehe zu **[https://openrouter.ai/keys](https://openrouter.ai/keys)**
2. Klicke **"Create Key"**
3. Name: z.B. `allie-agent`
4. **Credit Limit** setzen (optional aber empfohlen):
   - z.B. $10/Tag als Sicherheitslimit
5. Kopiere den Key → `OPENROUTER_API_KEY`

> Der Key beginnt mit `sk-or-v1-...`

#### Welches KI-Modell?

Standardmäßig verwendet Allie **Kimi K2** (`moonshot/kimi-k2`). Du kannst es ändern:

| Modell | ID | Kosten | Qualität |
|--------|-----|--------|----------|
| **Kimi K2** (Standard) | `moonshot/kimi-k2` | Günstig | Sehr gut für Trading |
| Claude 4 Sonnet | `anthropic/claude-sonnet-4` | Mittel | Exzellent |
| GPT-4o | `openai/gpt-4o` | Mittel | Sehr gut |
| DeepSeek V3 | `deepseek/deepseek-chat` | Sehr günstig | Gut |

Ändern in `.env`:
```env
AI_MODEL=moonshot/kimi-k2
```

---

## 4. .env-Datei konfigurieren

Erstelle die `.env`-Datei im Hauptverzeichnis:

```bash
cp .env.example .env
```

Dann editiere sie mit deinen Werten:

```env
# ============================================
#  ALLIE AGENT - KONFIGURATION
# ============================================

# --- Datenbank (wird automatisch erstellt) ---
DB_PASSWORD=mein-sicheres-db-passwort-hier

# --- Session-Sicherheit ---
# Generiere mit: openssl rand -hex 32
SESSION_SECRET=dein-session-secret-hier

# --- Hyperliquid Exchange ---
HYPERLIQUID_API_KEY=dein-hyperliquid-api-key
HYPERLIQUID_PRIVATE_KEY=dein-hyperliquid-private-key
HYPERLIQUID_TESTNET=true
# ↑ WICHTIG: Auf "true" lassen bis du bereit bist für echtes Trading!

# --- OpenRouter KI ---
OPENROUTER_API_KEY=sk-or-v1-dein-openrouter-key
AI_MODEL=moonshot/kimi-k2

# --- Server ---
NODE_ENV=production
```

### Session-Secret generieren

```bash
# macOS / Linux:
openssl rand -hex 32

# Oder mit Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Sichere Passwörter generieren

```bash
# Für DB_PASSWORD:
openssl rand -base64 24
```

> ⚠️ **NIEMALS** die `.env`-Datei committen oder teilen! Sie enthält deine geheimen Schlüssel.

---

## 5. Allie starten

```bash
# Development (lokal)
docker compose up -d

# Production (Server)
docker compose -f docker-compose.prod.yml up -d
```

### Was passiert beim Start?

```
1. PostgreSQL startet               ✅
2. Datenbank-Migrationen laufen     ✅  (automatisch)
3. Backend startet (Port 4000)      ✅
4. Frontend startet (Port 80/5173)  ✅
5. Web-Interface bereit!            ✅
```

### Status prüfen

```bash
docker compose ps          # Alle Container sehen
docker compose logs -f     # Live-Logs anzeigen
docker compose logs backend -f  # Nur Backend-Logs
```

---

## 6. Web-Interface einrichten

### 6.1 Admin-Account erstellen

1. Öffne im Browser:
   - **Lokal:** `http://localhost:5173`
   - **Server:** `http://deine-server-ip` oder `https://deine-domain.de`

2. Du landest automatisch auf der **Setup-Seite**

3. Erstelle deinen Admin-Account:
   - **Username:** Mindestens 3 Zeichen (a-z, 0-9, _)
   - **Passwort:** Mindestens 12 Zeichen, muss enthalten:
     - Großbuchstaben (A-Z)
     - Kleinbuchstaben (a-z)
     - Zahl (0-9)
     - Sonderzeichen (!@#$%...)
   - **Passwort bestätigen**

4. Klicke **"Create Admin Account"**

### 6.2 Onboarding Wizard

Nach dem Login wirst du durch 5 Schritte geführt:

#### Schritt 1: Willkommen
- Begrüßung und Übersicht der Features
- Klicke **"Next"**

#### Schritt 2: API Keys
Hier gibst du deine API-Keys ein (die du in Abschnitt 3 erstellt hast):

| Feld | Wert | Pflicht? |
|------|------|----------|
| **Hyperliquid API Key** | Dein Exchange-API-Key | Optional (Demo ohne) |
| **Hyperliquid Private Key** | Dein Exchange-Private-Key | Optional (Demo ohne) |
| **Use Testnet** | ✅ An | Empfohlen! |
| **OpenRouter API Key** | `sk-or-v1-...` | Optional (kein KI ohne) |

> 💡 Du kannst diesen Schritt überspringen und die Keys später unter **Settings → API Keys** eingeben. Ohne Keys läuft der Bot im Demo-Modus.

#### Schritt 3: Risk Management

| Parameter | Empfehlung Anfänger | Empfehlung Fortgeschritten | Beschreibung |
|-----------|--------------------|-----------------------------|--------------|
| **Max Position Size** | 5% | 10-15% | Max. Anteil des Portfolios pro Trade |
| **Max Daily Loss** | 3% | 5-7% | Bot stoppt nach diesem Tagesverlust |
| **Stop Loss** | 2% | 1.5-3% | Automatischer Verkauf bei Verlust |
| **Take Profit** | 4% | 3-6% | Automatischer Verkauf bei Gewinn |

#### Schritt 4: Trading-Strategie

**Strategie-Typ:**

| Strategie | Risiko | Trades | Für wen? |
|-----------|--------|--------|----------|
| **Conservative** | Niedrig | Wenige | Anfänger, sicherheitsbewusst |
| **Balanced** | Mittel | Moderat | Erfahrene Trader |
| **Aggressive** | Hoch | Viele | Risikobereite Trader |

**Timeframe:**

| Intervall | Beschreibung | Empfehlung |
|-----------|-------------|------------|
| **5m** | Alle 5 Minuten analysieren | Scalping, hohe Kosten |
| **15m** | Alle 15 Minuten | Guter Kompromiss ✅ |
| **1h** | Stündlich | Swing-Trading |
| **4h** | Alle 4 Stunden | Langfristigeres Trading |

**Min AI Confidence:** 
- Nur Trades die die KI mit mindestens diesem Score bewertet
- Empfehlung: **70%** (Standard)
- Höher = weniger aber sicherere Trades

#### Schritt 5: Bereit
- Zusammenfassung deiner Einstellungen
- Klicke **"Go to Dashboard"**

### 6.3 Trading starten

Im **Dashboard** kannst du:

1. **Start Trading** klicken → Bot beginnt zu analysieren und zu handeln
2. **Pause** → Bot hält an, bestehende Positionen bleiben offen
3. **Emergency Stop** → Sofort alles schließen und stoppen (2-Klick-Bestätigung)

Alle Einstellungen kannst du jederzeit unter **Settings** anpassen.

---

## 7. Production Deployment (HTTPS)

Für einen öffentlich erreichbaren Server mit SSL:

```bash
# 1. Domain auf Server-IP zeigen lassen (DNS A-Record)

# 2. HTTPS einrichten
sudo bash setup-https.sh

# 3. Mit Production-Config starten
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. Troubleshooting

### "Cannot connect to backend"
```bash
# Container-Status prüfen
docker compose ps

# Backend-Logs prüfen
docker compose logs backend

# Neustart
docker compose restart backend
```

### "Database connection failed"
```bash
# PostgreSQL-Status prüfen
docker compose logs postgres

# DB-Passwort in .env korrekt?
cat .env | grep DB_PASSWORD
```

### "Trading will not work" Warnung
→ Hyperliquid API-Key fehlt. In **Settings → API Keys** eintragen.

### "AI analysis will not work" Warnung
→ OpenRouter API-Key fehlt. In **Settings → API Keys** eintragen.

### Container komplett neu starten
```bash
docker compose down
docker compose up -d --build
```

### Logs live ansehen
```bash
# Alle Container
docker compose logs -f

# Nur Backend
docker compose logs -f backend
```

---

## Checkliste: Bereit zum Trading?

- [ ] Server / Docker läuft
- [ ] `.env`-Datei konfiguriert
- [ ] Admin-Account erstellt
- [ ] Hyperliquid API-Key eingetragen (Testnet!)
- [ ] OpenRouter API-Key eingetragen
- [ ] Risk Management konfiguriert
- [ ] Strategie gewählt
- [ ] **Testnet** aktiviert für erste Tests
- [ ] Bot gestartet, Logs beobachtet
- [ ] Erste Trades auf Testnet erfolgreich?
- [ ] → Dann bereit für Mainnet (`HYPERLIQUID_TESTNET=false`)

---

> **⚠️ Disclaimer:** Trading mit echtem Geld birgt Risiken. Teste IMMER zuerst auf dem Testnet. Allie Agent übernimmt keine Haftung für Verluste.
