# ALLIE-3: Agent Control Panel

**Status:** Spezifikation abgeschlossen  
**Erstellt:** 2026-02-10  
**Agent:** Requirements Engineer  

---

## Überblick

Kontrollmechanismen zur manuellen Steuerung des Trading-Agents: Start, Stop und Emergency Kill Switch.

## Abhängigkeiten

- **ALLIE-1** (User Authentication) - Nur für authentifizierte User
- **ALLIE-2** (Trading Dashboard) - UI-Integration im Dashboard

---

## User Stories

### US-3.1: Agent starten
**Als** eingeloggter Nutzer  
**möchte ich** den Trading-Agent starten  
**damit** er mit dem automatischen Trading beginnt

**Acceptance Criteria:**
- Button "Start Trading" im Dashboard
- Button ist nur aktiv, wenn:
  - Agent-Status = "stopped"
  - NICHT im Emergency Stop Modus
- Bei Klick:
  - Confirmation-Dialog: "Start automated trading?"
  - Nach Bestätigung: API-Call → Agent startet
  - Status wechselt zu "running"
  - Button ändert sich zu "Stop Trading"
- Bei Fehler: Error-Message anzeigen

### US-3.2: Agent stoppen
**Als** eingeloggter Nutzer  
**möchte ich** den Trading-Agent stoppen  
**damit** keine neuen Positionen eröffnet werden

**Acceptance Criteria:**
- Button "Stop Trading" im Dashboard
- Button ist nur aktiv, wenn Agent-Status = "running"
- Bei Klick:
  - Confirmation-Dialog: "Stop trading? Open positions will remain active."
  - Nach Bestätigung: API-Call → Agent stoppt
  - Status wechselt zu "stopped"
  - **Wichtig:** Offene Positionen bleiben bestehen
  - Button ändert sich zu "Start Trading"
- Bei Fehler: Error-Message anzeigen

### US-3.3: Emergency Kill Switch
**Als** eingeloggter Nutzer  
**möchte ich** im Notfall alle Positionen sofort schließen  
**damit** Verluste begrenzt werden

**Acceptance Criteria:**
- Deutlich sichtbarer roter Button "EMERGENCY STOP"
- Immer aktiv (auch wenn Agent bereits gestoppt)
- Bei Klick:
  - **Doppelte Bestätigung:**
    1. Dialog: "WARNING: This will close ALL positions and stop trading immediately. Continue?"
    2. Nach Bestätigung: Eingabe-Feld "Type CONFIRM to proceed"
  - Nach finaler Bestätigung:
    - API-Call → Alle Positionen werden geschlossen
    - Agent wird gestoppt
    - Emergency-Flag wird gesetzt
    - Status wechselt zu "emergency_stop"
- Nach Emergency Stop:
  - Agent kann NICHT automatisch gestartet werden
  - **Manuelle Reaktivierung erforderlich** (siehe US-3.4)
  - Banner: "EMERGENCY STOP ACTIVE - Manual reset required"

### US-3.4: Emergency-Modus zurücksetzen
**Als** eingeloggter Nutzer  
**möchte ich** nach einem Emergency Stop den Normalbetrieb wiederherstellen  
**damit** der Agent wieder gestartet werden kann

**Acceptance Criteria:**
- Button "Reset Emergency Stop" erscheint nur im emergency_stop-Modus
- Bei Klick:
  - Confirmation-Dialog: "Reset emergency stop? This will allow trading to resume."
  - Nach Bestätigung:
    - Emergency-Flag wird entfernt
    - Status wechselt zu "stopped"
    - "Start Trading"-Button wird wieder aktiv
- Logging: Emergency-Reset wird protokolliert (Zeitstempel + User)

---

## Edge Cases & Risiken

### Edge Cases
- Emergency Stop während laufender Order-Execution
  - **Lösung:** Hyperliquid API Cancel All Orders + Close All Positions
- Netzwerk-Timeout während Emergency Stop
  - **Lösung:** Retry-Mechanismus (3x), dann lokale Flag-Setzung + manuelle Überprüfung
- User klickt mehrfach auf Emergency Stop
  - **Lösung:** Button nach erstem Klick deaktivieren, Loading-State

### Risiken
- **Emergency Stop schließt Positionen zu ungünstigen Preisen**
  - Akzeptiert: Notfall-Maßnahme, Sicherheit > Profit
- **API-Fehler während Emergency Stop**
  - Mitigation: Fallback-Strategie + manuelle Überprüfung erforderlich

---

## Technische Anforderungen

### Sicherheit
- Alle Control-Actions erfordern gültige Session
- Rate-Limiting: Max. 10 Control-Actions / Minute
- Audit-Log: Jede Aktion wird protokolliert (User, Timestamp, Action)

### Performance
- Start/Stop: Response < 2s
- Emergency Stop: Response < 1s (höchste Priorität)

### Atomizität
- Emergency Stop: Transaktional (alle Positionen schließen ODER Fehler)
- Bei Fehler: Partial Success dokumentieren + manuelle Intervention triggern

---

## API-Contracts (Referenz für Backend Developer)

**POST /api/agent/start**
```json
Request: {}

Response (200):
{
  "success": true,
  "status": "running",
  "message": "Trading agent started successfully"
}

Response (400):
{
  "success": false,
  "error": "Cannot start: Emergency stop active"
}

Response (409):
{
  "success": false,
  "error": "Agent is already running"
}
```

**POST /api/agent/stop**
```json
Request: {}

Response (200):
{
  "success": true,
  "status": "stopped",
  "message": "Trading agent stopped. Open positions remain active.",
  "openPositions": 3
}

Response (409):
{
  "success": false,
  "error": "Agent is not running"
}
```

**POST /api/agent/emergency-stop**
```json
Request: {
  "confirmation": "CONFIRM"
}

Response (200):
{
  "success": true,
  "status": "emergency_stop",
  "message": "Emergency stop executed",
  "closedPositions": 5,
  "details": {
    "positionsClosed": 5,
    "totalPnL": -123.45
  }
}

Response (400):
{
  "success": false,
  "error": "Invalid confirmation code"
}

Response (500):
{
  "success": false,
  "error": "Failed to close all positions",
  "details": {
    "attempted": 5,
    "closed": 3,
    "failed": 2,
    "failedPositions": ["pos_123", "pos_456"]
  }
}
```

**POST /api/agent/reset-emergency**
```json
Request: {}

Response (200):
{
  "success": true,
  "status": "stopped",
  "message": "Emergency mode reset successfully"
}

Response (400):
{
  "success": false,
  "error": "Not in emergency mode"
}
```

**GET /api/agent/status**
```json
Response (200):
{
  "status": "running", // "running" | "stopped" | "emergency_stop"
  "uptime": 3600, // seconds since last start
  "lastAction": {
    "action": "start",
    "timestamp": "2026-02-10T10:00:00Z",
    "user": "admin"
  }
}
```

---

## UI-Anforderungen (Referenz für Frontend Developer)

### Layout
- Control Panel als eigener Abschnitt im Dashboard
- Buttons horizontal angeordnet (Desktop) / vertikal gestackt (Mobile)

### Button-Design
- **Start Trading:** Grün, Icon: Play ▶
- **Stop Trading:** Gelb, Icon: Pause ⏸
- **Emergency Stop:** Rot, groß, Icon: Stop Hand 🛑 (als SVG, KEIN Emoji)
- Disabled-State: Grau ausgegraut

### Confirmation-Dialogs
- Modal mit Overlay
- Emergency Stop: Rot-akzentuierte Warning
- Eingabe-Feld für "CONFIRM" bei Emergency Stop
- Buttons: Cancel (grau) + Confirm (entsprechende Farbe)

### Status-Banner
- Emergency Stop Banner: Rot, fixiert am oberen Bildschirmrand
- Text: "⚠ EMERGENCY STOP ACTIVE - Trading disabled until manual reset"
- "Reset"-Button direkt im Banner

---

## Definition of Done

- [ ] Backend-API implementiert (alle 5 Endpoints)
- [ ] Hyperliquid API-Integration für Emergency Stop
- [ ] Frontend Control Panel UI implementiert
- [ ] Confirmation-Dialogs implementiert
- [ ] Emergency-Banner implementiert
- [ ] Audit-Logging für alle Control-Actions
- [ ] Error-Handling für API-Fehler
- [ ] QA: Emergency Stop mit Mock-Positionen getestet
- [ ] Security-Review: Rate-Limiting + Session-Validierung
