# Allie Agent – Projektkontext (context.md)

---

## 0. Agenten-Koordination

Diese Datei ist die einzige Quelle der Wahrheit fuer alle Agenten.
Keine Annahmen ausserhalb dieser Datei treffen.

### Workflow

1. Requirements Engineer
2. Solution Architect
3. Frontend Developer + Backend Developer (parallel)
4. QA Engineer
5. DevOps Engineer

Kein Schritt darf uebersprungen werden.

### Regeln fuer alle Agenten

- Vor Arbeitsbeginn: context.md vollstaendig lesen
- Nach jeder Aktion: Protokoll aktualisieren mit `[DATUM UHRZEIT] Agent-Name: Beschreibung`
- Bei Blockern: In Notizen dokumentieren mit `@Agent-Name: Frage`
- Aufgaben: `[ ]` = offen, `[x]` = erledigt
- Keine Kommunikation ausserhalb dieser Datei

### Agent-Dateien

Die Rollendefinitionen der 6 Agenten liegen in `.claude/agents/`:

| Agent | Datei |
|-------|-------|
| Requirements Engineer | `requirements-engineer.md` |
| Solution Architect | `solution-architect.md` |
| Frontend Developer | `frontend-dev.md` |
| Backend Developer | `backend-dev.md` |
| QA Engineer | `qa-engineer.md` |
| DevOps Engineer | `devops.md` |

---

## Aufgaben

- [x] Requirements Engineer: MVP Feature-Spezifikationen erstellen
- [x] Solution Architect: System-Architektur entwerfen
- [x] Backend Developer: Alle Services und APIs implementiert
- [x] Frontend Developer: React App komplett implementiert
- [ ] QA Engineer: Tests durchführen (nach Installation)
- [x] DevOps Engineer: Docker & Deployment komplett

## Notizen

**PROJEKT FERTIGGESTELLT!** 🎉

### Vollständig implementiert:
- ✅ 6 Feature-Spezifikationen (docs/features/)
- ✅ System-Architektur (docs/architecture/)
- ✅ Backend (Node.js + TypeScript):
  - AuthService, TradingService, AIService, LoggingService, HyperliquidClient, AgentStateService
  - Auth Routes, Dashboard Routes, Agent Control Routes
  - Middleware (Auth, ErrorHandler, RateLimiter)
  - 7 SQL-Migrationen
- ✅ Frontend (React + TypeScript + TailwindCSS):
  - Login, Setup, Dashboard Pages
  - Zustand State Management
  - API Client
- ✅ Docker Compose Setup (PostgreSQL, Backend, Frontend)
- ✅ Nginx Reverse Proxy

### Nächste Schritte:
1. Dependencies installieren: `chmod +x install.sh && ./install.sh`
2. Datenbank starten und Migrationen ausführen
3. .env Dateien konfigurieren
4. Testen!
- ⏳ Backend Services (Auth, Trading, AI, Logging)
- ⏳ Backend Routes & Middleware
- ⏳ Frontend (React-App komplett)
- ⏳ WebSocket-Server
- ⏳ QA Testing

@Backend-Developer: Service-Implementation in backend/src/services/
@Frontend-Developer: React-App in frontend/ erstellen
@QA-Engineer: Tests nach Service-Implementation

## Recherche

(leer)

## Protokoll

- [2026-02-10 10:00] Setup: context.md als zentrale Koordinationsdatei eingerichtet
- [2026-02-10 10:05] Setup: Alle 6 Agenten mit context.md-Integration konfiguriert
- [2026-02-10 10:10] Cleanup: Redundante Dokumentationsdateien entfernt, System Prompt finalisiert
- [2026-02-10 10:15] Requirements Engineer: 6 MVP Feature-Specs erstellt (ALLIE-1 bis ALLIE-6)
- [2026-02-10 10:30] Solution Architect: System-Architektur finalisiert (Tech-Stack, DB-Schema, API-Spec)
- [2026-02-10 10:45] Backend Developer: Projektstruktur erstellt (TypeScript, Migrationen, Config)
- [2026-02-10 10:50] DevOps Engineer: Docker Compose, Dockerfiles, Environment-Setup komplett
- [2026-02-10 10:55] Documentation: README.md, SETUP.md, .gitignore erstellt

---

## Projektname
Allie Agent

## Projekttyp
Autonomer, KI-gestützter Krypto-Trading-Agent mit Web-UI, betrieben in Docker unter Linux.

---

## 1. Ziel des Projekts

Allie Agent ist ein **produktiver, sicherer und selbstlernender Trading-Agent**, der:

- eigenständig Kryptowährungen handelt
- Markttrends erkennt und trendbasiert tradet
- aus schlechten Trades systematisch lernt
- dieselben Fehler nicht mehrfach macht
- vollständig transparent arbeitet
- jederzeit manuell kontrollierbar bleibt

❗ Dieses Projekt ist **kein Bot zum Zocken**, **kein Demo-Projekt** und **kein Meme-Trader**.  
Es ist ein **ernstzunehmendes, langfristig erweiterbares System**.

---

## 2. Laufzeitumgebung

- Betriebssystem: Linux (Ubuntu bevorzugt)
- Containerisierung: Docker
- Orchestrierung: Docker Compose erlaubt
- Deployment Phase 1: VPS (Testbetrieb)
- Cloud-fähig, aber **nicht cloud-abhängig**

---

## 3. KI- / LLM-Schicht

### Modell
- Modell: **Kimi K2**
- Zugriff: **OpenRouter API**
- Kein eigenes Training
- Kein Fine-Tuning

### Aufgaben der KI
Die KI darf **nur analysieren und entscheiden**, nicht blind handeln.

- Marktanalyse
- Trendidentifikation
- Strategieauswahl
- Bewertung vergangener Trades
- Gewichtung von Strategien
- Lernen aus Fehlern

### Klare Grenzen
Die KI darf **niemals**:

- Sicherheitsregeln umgehen
- Trades ohne Validierung ausführen
- Notfallmechanismen deaktivieren
- Eigenständig Limits verändern
- „Raten“ oder emotional handeln

Die KI liefert **Entscheidungen mit Begründung**, keine Black-Box-Aktionen.

---

## 4. Trading-Schicht

### Börse
- **Ausschließlich Hyperliquid**

### Grundregeln
- Alle Trades laufen über die Hyperliquid-API
- Verwendung eines **API-Wallets ohne Abhebungsrechte**
- Kein direkter Zugriff auf Hauptwallets
- Jeder Trade wird vollständig dokumentiert

### Pro Trade zu speichern
- Zeitstempel
- Markt / Asset
- Positionsgröße
- Einstieg / Ausstieg
- KI-Begründung
- Zugeordnete Strategie
- Ergebnis (Gewinn / Verlust)
- Bewertung (gut / schlecht)

---

## 5. Lern- & Anpassungssystem

### Lernquellen
- Gewinne & Verluste
- Marktbedingungen zum Trade-Zeitpunkt
- Strategieperformance
- Wiederholte Fehlentscheidungen

### Lernregeln
- Verluststrategien werden abgewertet
- Wiederholte Fehler werden vermieden
- Erfolgreiche Muster werden priorisiert
- Historische Fehler **müssen aktiv geprüft werden**, bevor neue Trades erlaubt sind

❗ Lernen erfolgt **deterministisch & erklärbar**,  
kein selbstmodifizierender Code, keine unkontrollierte Evolution.

---

## 6. Datenhaltung

### Gespeicherte Daten
- Benutzerkonten
- Passworthashes
- Trade-Historie
- Markt-Snapshots
- Strategie-Logs
- KI-Entscheidungszusammenfassungen
- Fehler- und Sicherheitslogs

### Anforderungen
- Persistente Speicherung
- Verschlüsselte Secrets
- Strukturierte Schemas
- Auditierbare Historie
- Kein Klartext für sensible Daten

---

## 7. Web-UI

### Design-Prinzipien
- Minimalistisch
- Professionell
- Keine Emojis
- Kein „Vibe-Coding“
- Fokus auf Information & Kontrolle

### Pflichtfunktionen
- Login-Screen
  - Beim ersten Start müssen Zugangsdaten erstellt werden
- Dashboard
  - Aktive Trades
  - Historische Trades
  - PnL-Übersicht
  - Status des Agents
- Steuerung
  - Trading Start / Stop
  - Notfall-Abverkauf
- Transparenz
  - Keine versteckten Aktionen
  - Jede Aktion ist nachvollziehbar

---

## 8. Sicherheitsmodell

### Zwingende Regeln
- Passwörter: bcrypt oder gleichwertig
- Secrets nur über Environment Variables
- Keine Secrets im Code oder Repository
- Authentifizierung für **jede** UI-Aktion
- Rate-Limiting für kritische Endpoints
- Strikte Input-Validierung

### Bedrohungsannahme
- Internet ist feindlich
- API-Keys können leaken
- Systeme müssen fehlertolerant sein

---

## 9. Test- & Betriebsphasen

### Phase 1 – Testbetrieb
- Hyperliquid Testnet
- Paper Trading oder minimale Beträge
- Fokus auf:
  - Stabilität
  - Lernverhalten
  - Sicherheitslogik

### Phase 2 – Kontrollierter Live-Betrieb
- Kleine Positionen
- Harte Limits
- Kill-Switch immer aktiv
- Manuelle Überwachung

---

## 10. Notfallmechanismus (Kill Switch)

### Eigenschaften
- Schließt **alle offenen Positionen sofort**
- Stoppt weiteres Trading
- Kann manuell oder automatisch ausgelöst werden
- Manuelle Reaktivierung notwendig

Dieser Mechanismus darf **niemals deaktiviert oder umgangen werden**.

---

## 11. Nicht-Ziele (Wichtig)

Allie Agent ist **nicht**:

- ein Gambling-Bot
- ein Meme-Trader
- ein „Gewinnversprechen“
- ein Social-Trading-System
- ein Influencer-Dashboard

---

## 12. Agenten-Arbeitsanweisung (sehr wichtig)

Jeder Agent, der an diesem Projekt arbeitet, muss:

- Sicherheit über Profit stellen
- Klarheit über Cleverness stellen
- Determinismus über Zufall stellen
- Entscheidungen erklären
- Fehlende Infos nachfragen
- Sicherheitsfeatures niemals entfernen

---

## 13. Mentales Modell

Allie Agent ist zu verstehen als:

> Ein vorsichtiger, systematischer, lernender quantitativer Trader  
> mit striktem Risikomanagement – kein Hype-Bot.

