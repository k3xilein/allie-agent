# ALLIE-6: Trade History & Audit Logging

**Status:** Spezifikation abgeschlossen  
**Erstellt:** 2026-02-10  
**Agent:** Requirements Engineer  

---

## Überblick

Vollständiges Logging aller Trading-Aktivitäten, KI-Entscheidungen und System-Events für Nachvollziehbarkeit und Compliance.

## Abhängigkeiten

- **ALLIE-4** (Hyperliquid Integration) - Trades werden von hier geloggt
- **ALLIE-5** (KI Trading Logic) - KI-Entscheidungen werden geloggt
- **ALLIE-3** (Agent Control Panel) - Control-Actions werden geloggt

---

## User Stories

### US-6.1: Trade-Execution loggen
**Als** System  
**möchte ich** jeden Trade vollständig dokumentieren  
**damit** alle Trades nachvollziehbar sind

**Acceptance Criteria:**
- Pro Trade speichern:
  - **Trade-ID** (UUID)
  - **Symbol** (z.B. BTC/USDT)
  - **Side** (Long/Short)
  - **Entry Price**
  - **Exit Price** (bei Close)
  - **Size** (Positionsgröße)
  - **Entry Timestamp**
  - **Exit Timestamp** (bei Close)
  - **Realized PnL** (bei Close)
  - **Strategie** (z.B. "Trend Following")
  - **KI-Reasoning** (Volltext der Entscheidung)
  - **Market Context** (Indikatoren zum Entry/Exit)
  - **Evaluation** (good/bad/null)
- Datenbank-Schema: `trades` Tabelle
- Atomic Write: Trade wird in einer Transaktion gespeichert

### US-6.2: KI-Entscheidungen loggen
**Als** System  
**möchte ich** jede KI-Analyse loggen (auch wenn keine Action folgt)  
**damit** das Entscheidungsverhalten analysierbar ist

**Acceptance Criteria:**
- Pro Analyse speichern:
  - **Analysis-ID** (UUID)
  - **Timestamp**
  - **Symbol**
  - **Market Data** (JSON: Preis, Indikatoren)
  - **Current Position** (falls vorhanden)
  - **KI-Response** (Volltext)
  - **Decision** (OPEN_LONG/SHORT/CLOSE/HOLD)
  - **Confidence**
  - **Action Taken** (true/false - wurde Trade ausgeführt?)
  - **Rejection Reason** (falls Action abgelehnt)
- Datenbank-Schema: `ai_analyses` Tabelle
- Retention: 90 Tage

### US-6.3: System-Events loggen
**Als** System  
**möchte ich** alle kritischen Events protokollieren  
**damit** System-Verhalten nachvollziehbar ist

**Acceptance Criteria:**
- Event-Typen:
  - **AGENT_START** / **AGENT_STOP**
  - **EMERGENCY_STOP**
  - **EMERGENCY_RESET**
  - **API_ERROR** (Hyperliquid oder OpenRouter)
  - **POSITION_OPENED** / **POSITION_CLOSED**
  - **BALANCE_UPDATE**
- Pro Event speichern:
  - **Event-ID** (UUID)
  - **Event-Type**
  - **Timestamp**
  - **User** (falls User-Action)
  - **Details** (JSON: event-spezifische Daten)
  - **Severity** (INFO/WARNING/ERROR)
- Datenbank-Schema: `system_logs` Tabelle
- Retention: 1 Jahr

### US-6.4: Audit-Trail für Control-Actions
**Als** Compliance-Officer  
**möchte ich** alle manuellen Eingriffe nachvollziehen  
**damit** Verantwortlichkeit gewährleistet ist

**Acceptance Criteria:**
- Pro Control-Action loggen:
  - **Action-ID** (UUID)
  - **Action-Type** (START/STOP/EMERGENCY_STOP/RESET)
  - **Timestamp**
  - **User** (Username)
  - **IP-Address**
  - **Result** (SUCCESS/FAILURE)
  - **Details** (z.B. Anzahl geschlossener Positionen)
- Datenbank-Schema: `audit_log` Tabelle
- NIEMALS löschen (permanente Speicherung)

### US-6.5: Log-Export
**Als** eingeloggter Nutzer  
**möchte ich** Logs exportieren können  
**damit** externe Analysen möglich sind

**Acceptance Criteria:**
- Endpoint: GET /api/logs/export
- Query-Parameter:
  - `type`: trades | analyses | system | audit
  - `startDate`: ISO8601
  - `endDate`: ISO8601
  - `format`: json | csv
- Export-Format:
  - JSON: Vollständige Daten
  - CSV: Flache Struktur (JSON-Felder als String)
- Max. 10.000 Einträge pro Export
- Rate-Limit: Max. 5 Exports / Stunde

---

## Edge Cases & Risiken

### Edge Cases
- Trade wird teilweise gefüllt
  - **Lösung:** Partial Fill als separater Trade loggen
- KI-API-Timeout (keine Response)
  - **Lösung:** Analysis mit "TIMEOUT" + "HOLD" loggen
- Disk-Space voll
  - **Lösung:** Log-Rotation, alte Analyses löschen (nach Retention)

### Risiken
- **Datenbank wird sehr groß**
  - Mitigation: Retention-Policies, Indices optimieren
- **Performance-Impact durch Logging**
  - Mitigation: Asynchrones Logging, Background-Worker

---

## Technische Anforderungen

### Datenbank-Schema

**Tabelle: trades**
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(5) NOT NULL, -- 'long' | 'short'
  entry_price DECIMAL(18, 8) NOT NULL,
  exit_price DECIMAL(18, 8),
  size DECIMAL(18, 8) NOT NULL,
  entry_timestamp TIMESTAMP NOT NULL,
  exit_timestamp TIMESTAMP,
  realized_pnl DECIMAL(18, 8),
  strategy VARCHAR(50),
  ai_reasoning TEXT,
  market_context JSON,
  evaluation VARCHAR(10), -- 'good' | 'bad' | null
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trades_timestamp ON trades(entry_timestamp);
CREATE INDEX idx_trades_symbol ON trades(symbol);
```

**Tabelle: ai_analyses**
```sql
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market_data JSON NOT NULL,
  current_position JSON,
  ai_response TEXT NOT NULL,
  decision VARCHAR(20) NOT NULL,
  confidence INTEGER,
  action_taken BOOLEAN DEFAULT FALSE,
  rejection_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyses_timestamp ON ai_analyses(timestamp);
```

**Tabelle: system_logs**
```sql
CREATE TABLE system_logs (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  user_id INTEGER REFERENCES users(id),
  details JSON,
  severity VARCHAR(10) NOT NULL, -- 'INFO' | 'WARNING' | 'ERROR'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_timestamp ON system_logs(timestamp);
CREATE INDEX idx_logs_severity ON system_logs(severity);
```

**Tabelle: audit_log**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  ip_address VARCHAR(45),
  result VARCHAR(20) NOT NULL, -- 'SUCCESS' | 'FAILURE'
  details JSON,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_user ON audit_log(user_id);
```

### Performance
- Insert-Performance: < 50ms pro Log-Eintrag
- Query-Performance: < 500ms für Dashboard-Abfragen
- Export-Performance: < 5s für 1.000 Einträge

---

## API-Contracts (Referenz für Backend Developer)

**GET /api/logs/export**
```json
Query Params:
- type: "trades" | "analyses" | "system" | "audit"
- startDate: "2026-02-01T00:00:00Z"
- endDate: "2026-02-10T23:59:59Z"
- format: "json" | "csv"

Response (200) - JSON:
{
  "type": "trades",
  "dateRange": {
    "start": "2026-02-01T00:00:00Z",
    "end": "2026-02-10T23:59:59Z"
  },
  "count": 150,
  "data": [
    {
      "id": "uuid-123",
      "symbol": "BTC/USDT",
      "side": "long",
      ...
    }
  ]
}

Response (200) - CSV:
id,symbol,side,entry_price,exit_price,...
uuid-123,BTC/USDT,long,45000.00,46000.00,...

Response (400):
{
  "success": false,
  "error": "Invalid date range"
}

Response (429):
{
  "success": false,
  "error": "Export rate limit exceeded"
}
```

---

## Definition of Done

- [ ] Datenbank-Schema implementiert (alle 4 Tabellen)
- [ ] Logging-Service implementiert
- [ ] Trade-Logging integriert in Hyperliquid-Module
- [ ] KI-Analysis-Logging integriert
- [ ] System-Event-Logging implementiert
- [ ] Audit-Log für Control-Actions implementiert
- [ ] Export-Endpoint implementiert (JSON + CSV)
- [ ] Retention-Policy implementiert (Cron-Job)
- [ ] Indices optimiert
- [ ] Performance-Tests: < 50ms Insert
- [ ] QA: Logging-Vollständigkeit verifiziert
