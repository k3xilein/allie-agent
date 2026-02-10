# ALLIE-4: Hyperliquid Integration (Testnet)

**Status:** Spezifikation abgeschlossen  
**Erstellt:** 2026-02-10  
**Agent:** Requirements Engineer  

---

## Überblick

Integration mit der Hyperliquid API für Trading-Operationen. Initiale Phase ausschließlich auf Testnet zur sicheren Erprobung des Systems.

## Abhängigkeiten

- **ALLIE-3** (Agent Control Panel) - Nutzt diese Integration für Order-Execution

---

## User Stories

### US-4.1: API-Wallet-Konfiguration
**Als** System-Administrator  
**möchte ich** ein Hyperliquid API-Wallet sicher konfigurieren  
**damit** der Agent handeln kann ohne Zugriff auf Hauptwallet

**Acceptance Criteria:**
- Environment Variables für API-Credentials:
  - `HYPERLIQUID_API_KEY`
  - `HYPERLIQUID_PRIVATE_KEY`
  - `HYPERLIQUID_TESTNET=true` (erzwingt Testnet)
- Beim Start: System validiert API-Verbindung
- Bei fehlenden/ungültigen Credentials:
  - Agent startet NICHT
  - Fehlermeldung im Log
  - UI zeigt "Configuration Error"
- Wallet-Permissions werden überprüft:
  - **MUSS:** Trading-Rechte haben
  - **DARF NICHT:** Withdrawal-Rechte haben
  - Falls Withdrawal möglich: Warnung loggen (aber nicht blocken in Testnet)

### US-4.2: Account-Balance abrufen
**Als** System  
**möchte ich** den aktuellen Account-Balance abrufen  
**damit** Position Sizing kalkuliert werden kann

**Acceptance Criteria:**
- API-Call zu Hyperliquid: Get Account Info
- Daten extrahieren:
  - Total Balance (USDT)
  - Available Balance (nicht in Positionen gebunden)
  - Margin Used
- Caching: Balance wird max. alle 30 Sekunden aktualisiert
- Bei API-Fehler: Cached-Wert nutzen + Log-Warning

### US-4.3: Market-Positionen abrufen
**Als** System  
**möchte ich** alle offenen Positionen vom Exchange abrufen  
**damit** das Dashboard korrekte Daten anzeigt

**Acceptance Criteria:**
- API-Call zu Hyperliquid: Get Open Positions
- Daten extrahieren pro Position:
  - Symbol
  - Side (Long/Short)
  - Entry Price
  - Size
  - Unrealized PnL
  - Liquidation Price
- Polling-Intervall: Alle 5 Sekunden (bei aktivem Trading)
- WebSocket-Update an Frontend bei Änderungen

### US-4.4: Market Order ausführen
**Als** Trading-Agent  
**möchte ich** Market Orders ausführen  
**damit** Positionen eröffnet/geschlossen werden können

**Acceptance Criteria:**
- Funktion: `executeMarketOrder(symbol, side, size)`
- Pre-Flight Checks:
  - Agent-Status = "running"
  - Ausreichend Available Balance
  - Size innerhalb erlaubter Limits
  - Symbol ist auf Hyperliquid verfügbar
- Order-Execution via Hyperliquid API
- Response-Handling:
  - Success: Order-ID + Fill-Price speichern
  - Error: Fehlergrund loggen + Order ablehnen
- Post-Execution:
  - Trade in Datenbank speichern
  - Position-Update triggern
  - Audit-Log-Eintrag

### US-4.5: Alle Positionen schließen (Emergency)
**Als** System  
**möchte ich** im Notfall alle Positionen mit einer Aktion schließen  
**damit** der Emergency Stop funktioniert

**Acceptance Criteria:**
- Funktion: `closeAllPositions()`
- Ablauf:
  1. Alle offenen Positionen abrufen
  2. Für jede Position: Market Order in Gegenrichtung
  3. Warten auf Order-Fills (max. 30s)
  4. Nicht geschlossene Positionen erneut versuchen (max. 3 Retries)
- Response:
  - Anzahl erfolgreich geschlossener Positionen
  - Liste fehlgeschlagener Positionen (falls vorhanden)
- Logging: Detaillierte Logs für jeden Close-Versuch

---

## Edge Cases & Risiken

### Edge Cases
- API Rate-Limit wird erreicht
  - **Lösung:** Exponential Backoff, max. 3 Retries
- Netzwerk-Timeout während Order-Execution
  - **Lösung:** Order-Status abfragen, Idempotenz via Client-Order-ID
- Position wird teilweise gefüllt
  - **Lösung:** Partial Fill akzeptieren, Rest als separate Order tracken
- Hyperliquid Maintenance-Window
  - **Lösung:** Agent auto-stop + Notification-Log

### Risiken
- **Testnet-Daten sind nicht 100% realistisch**
  - Mitigation: Dokumentieren, dass Produktion-Verhalten abweichen kann
- **API-Key-Leak**
  - Mitigation: Secrets in .env (nicht im Repo), read-only access für Agent-User
- **Slippage bei Market Orders**
  - Mitigation: Akzeptiert (dokumentiert in Trade-Logs)

---

## Technische Anforderungen

### API-Client
- Library: `hyperliquid-ts` oder äquivalent
- Retry-Logik: Exponential Backoff (1s, 2s, 4s)
- Timeout: 10s pro Request
- Logging: Alle API-Calls (Request + Response) in Debug-Logs

### Error-Handling
- Network-Errors: Retry
- API-Errors (4xx): Log + Reject (KEIN Retry)
- Rate-Limit (429): Backoff + Retry
- Server-Errors (5xx): Retry (max. 3x)

### Security
- API-Keys niemals in Logs ausgeben
- Private Key im Memory nur während Signing
- HTTPS-Only für alle API-Calls

---

## API-Wrapper (Referenz für Backend Developer)

```typescript
interface HyperliquidClient {
  // Account-Daten
  getAccountBalance(): Promise<AccountBalance>
  getOpenPositions(): Promise<Position[]>
  
  // Trading
  executeMarketOrder(params: {
    symbol: string,
    side: 'buy' | 'sell',
    size: number
  }): Promise<OrderResult>
  
  closeAllPositions(): Promise<CloseAllResult>
  
  // Utility
  validateConnection(): Promise<boolean>
  getMarketInfo(symbol: string): Promise<MarketInfo>
}

interface AccountBalance {
  totalBalance: number
  availableBalance: number
  marginUsed: number
}

interface Position {
  symbol: string
  side: 'long' | 'short'
  entryPrice: number
  size: number
  unrealizedPnL: number
  liquidationPrice: number
}

interface OrderResult {
  success: boolean
  orderId?: string
  fillPrice?: number
  filledSize?: number
  error?: string
}

interface CloseAllResult {
  success: boolean
  attempted: number
  closed: number
  failed: number
  failedPositions: string[]
}
```

---

## Testnet-Spezifika

### Konfiguration
- Testnet-URL: `https://api.hyperliquid-testnet.xyz`
- Auto-Funding: Testnet-Accounts können kostenlos USDT erhalten
- Reset-Zyklen: Testnet kann periodisch zurückgesetzt werden

### Testing-Strategie
- Initial: Manuelle Test-Trades via API
- Automatisiert: Unit-Tests mit Mock-Responses
- Integration-Tests: Echte Testnet-Calls (täglich)

---

## Definition of Done

- [ ] Hyperliquid Client-Library integriert
- [ ] Environment-Variablen für API-Credentials
- [ ] API-Wrapper für alle 5 Funktionen implementiert
- [ ] Connection-Validierung beim Start
- [ ] Error-Handling + Retry-Logik
- [ ] Logging für alle API-Calls
- [ ] Integration-Test mit Testnet-Account
- [ ] Dokumentation: Testnet-Setup-Anleitung
- [ ] Security-Review: Secrets-Handling
