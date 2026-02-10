# ALLIE-2: Trading Dashboard

**Status:** Spezifikation abgeschlossen  
**Erstellt:** 2026-02-10  
**Agent:** Requirements Engineer  

---

## Überblick

Dashboard zur Anzeige des Trading-Status, aktiver Positionen, historischer Trades und Performance-Kennzahlen (PnL).

## Abhängigkeiten

- **ALLIE-1** (User Authentication) - Zugriff nur für eingeloggte User

---

## User Stories

### US-2.1: Dashboard-Übersicht anzeigen
**Als** eingeloggter Nutzer  
**möchte ich** eine Übersicht über den aktuellen Trading-Status sehen  
**damit** ich den Zustand des Agents auf einen Blick erfassen kann

**Acceptance Criteria:**
- Dashboard zeigt folgende Metriken:
  - **Agent-Status:** Running / Stopped / Emergency Stop
  - **Account Balance:** Aktueller Kontostand in USDT
  - **Total PnL:** Gesamtgewinn/-verlust (absolut + prozentual)
  - **Today's PnL:** Heutiger Gewinn/Verlust
  - **Active Positions:** Anzahl offener Positionen
- Status-Indikator mit Farben:
  - Grün: Running
  - Gelb: Stopped
  - Rot: Emergency Stop
- Auto-Refresh alle 10 Sekunden

### US-2.2: Aktive Positionen anzeigen
**Als** eingeloggter Nutzer  
**möchte ich** alle aktuell offenen Positionen sehen  
**damit** ich den aktuellen Exposure verstehe

**Acceptance Criteria:**
- Tabelle mit aktiven Positionen:
  - Symbol (z.B. BTC/USDT)
  - Side (Long/Short)
  - Entry Price
  - Current Price
  - Size (Positionsgröße)
  - Unrealized PnL (absolut + prozentual)
  - Eröffnungszeitpunkt
- Sortierbar nach PnL, Symbol, Zeit
- Live-Update der Current Price + Unrealized PnL
- Bei keinen offenen Positionen: "No active positions"

### US-2.3: Trade-Historie anzeigen
**Als** eingeloggter Nutzer  
**möchte ich** vergangene Trades sehen  
**damit** ich die Trading-Aktivität nachvollziehen kann

**Acceptance Criteria:**
- Tabelle mit abgeschlossenen Trades:
  - Symbol
  - Side (Long/Short)
  - Entry Price / Exit Price
  - Size
  - Realized PnL (absolut + prozentual)
  - Eröffnungszeit / Schließungszeit
  - Dauer der Position
  - Strategie (z.B. "Trend Following")
  - KI-Begründung (klickbar → Details-Modal)
- Farbkodierung:
  - Grün: Gewinn
  - Rot: Verlust
- Pagination: 20 Trades pro Seite
- Filteroption: Zeitraum (Last 24h, 7d, 30d, All)

### US-2.4: Trade-Details anzeigen
**Als** eingeloggter Nutzer  
**möchte ich** Details zu einem spezifischen Trade sehen  
**damit** ich die KI-Entscheidung nachvollziehen kann

**Acceptance Criteria:**
- Modal mit Trade-Details:
  - Alle Basis-Informationen (wie in Historie)
  - **KI-Begründung:** Volltext der Analyse
  - **Strategie:** Verwendete Trading-Strategie
  - **Marktkontext:** Marktsituation zum Entry/Exit-Zeitpunkt
  - **Bewertung:** Gut/Schlecht (falls bereits vom System bewertet)
- Schließen-Button

---

## Edge Cases & Risiken

### Edge Cases
- Sehr lange Trade-Historien (>10.000 Einträge)
  - **Lösung:** Pagination + Backend-Limit
- WebSocket-Verbindung bricht ab
  - **Lösung:** Fallback auf Polling (alle 10s)
- Negativer Kontostand (durch Leverage)
  - **Lösung:** Rot + Warning-Icon anzeigen

### Risiken
- **Performance bei vielen Live-Updates**
  - Mitigation: WebSocket nur für kritische Daten, Rest per Polling
- **Inkonsistente Daten zwischen Frontend und Backend**
  - Mitigation: Timestamp-basierte Cache-Invalidierung

---

## Technische Anforderungen

### Daten-Refresh
- Agent-Status: WebSocket (Echtzeit)
- Active Positions: WebSocket (bei Änderungen)
- Account Balance: Polling (alle 30s)
- Trade Historie: On-Demand (bei Page-Load + Filter)

### Performance
- Initial Load: < 2s
- Live-Updates: < 100ms Latenz
- Pagination-Wechsel: < 500ms

---

## API-Contracts (Referenz für Backend Developer)

**GET /api/dashboard/overview**
```json
Response (200):
{
  "agentStatus": "running", // "running" | "stopped" | "emergency_stop"
  "accountBalance": 10000.00,
  "totalPnL": {
    "absolute": 1250.50,
    "percentage": 12.51
  },
  "todayPnL": {
    "absolute": -45.20,
    "percentage": -0.45
  },
  "activePositions": 3
}
```

**GET /api/positions/active**
```json
Response (200):
{
  "positions": [
    {
      "id": "pos_123",
      "symbol": "BTC/USDT",
      "side": "long",
      "entryPrice": 45000.00,
      "currentPrice": 46500.00,
      "size": 0.1,
      "unrealizedPnL": {
        "absolute": 150.00,
        "percentage": 3.33
      },
      "openedAt": "2026-02-10T10:30:00Z"
    }
  ]
}
```

**GET /api/trades/history**
```json
Query Params:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- timeRange: "24h" | "7d" | "30d" | "all" (default: "all")

Response (200):
{
  "trades": [
    {
      "id": "trade_456",
      "symbol": "ETH/USDT",
      "side": "short",
      "entryPrice": 2500.00,
      "exitPrice": 2450.00,
      "size": 1.0,
      "realizedPnL": {
        "absolute": 50.00,
        "percentage": 2.00
      },
      "openedAt": "2026-02-09T14:00:00Z",
      "closedAt": "2026-02-09T18:30:00Z",
      "duration": "4h 30m",
      "strategy": "Trend Following",
      "aiReasoning": "Strong downtrend detected with RSI > 70..."
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalTrades": 98
  }
}
```

**GET /api/trades/:id**
```json
Response (200):
{
  "trade": {
    "id": "trade_456",
    "symbol": "ETH/USDT",
    "side": "short",
    "entryPrice": 2500.00,
    "exitPrice": 2450.00,
    "size": 1.0,
    "realizedPnL": {
      "absolute": 50.00,
      "percentage": 2.00
    },
    "openedAt": "2026-02-09T14:00:00Z",
    "closedAt": "2026-02-09T18:30:00Z",
    "duration": "4h 30m",
    "strategy": "Trend Following",
    "aiReasoning": "Strong downtrend detected with RSI > 70, MACD bearish crossover. Market context shows increasing volume on red candles...",
    "marketContext": {
      "entryConditions": "RSI: 72, MACD: -15.2, Volume: High",
      "exitConditions": "RSI: 45, MACD: -5.1, Volume: Low"
    },
    "evaluation": "good" // "good" | "bad" | null
  }
}
```

---

## UI-Anforderungen (Referenz für Frontend Developer)

### Layout
- Header: Logo + Agent-Status + Logout
- Main Content:
  - Metrics-Cards (4er-Grid): Status, Balance, Total PnL, Today's PnL
  - Active Positions Section (expandierbar)
  - Trade History Section

### Design
- Minimalistisch, professionell
- Farben:
  - Grün: Gewinn, Running
  - Rot: Verlust, Emergency Stop
  - Gelb: Stopped
  - Grau: Neutral
- Monospace-Font für Zahlen (bessere Lesbarkeit)
- Keine Emojis

### Responsive
- Desktop: 3-Spalten-Layout
- Tablet: 2-Spalten
- Mobile: 1-Spalte, gestackt

---

## Definition of Done

- [ ] Backend-API implementiert (alle 4 Endpoints)
- [ ] Frontend Dashboard-UI implementiert
- [ ] WebSocket-Verbindung für Live-Updates
- [ ] Pagination für Trade-Historie
- [ ] Trade-Details-Modal
- [ ] Auto-Refresh implementiert
- [ ] Responsive Design getestet
- [ ] QA: Manuelle Tests abgeschlossen
- [ ] Performance-Test: < 2s Initial Load
