# ALLIE-5: KI Trading Logic (Kimi K2)

**Status:** Spezifikation abgeschlossen  
**Erstellt:** 2026-02-10  
**Agent:** Requirements Engineer  

---

## Überblick

Integration der KI-gestützten Trading-Logik via Kimi K2 (OpenRouter API). Die KI analysiert Marktdaten, trifft Trading-Entscheidungen und lernt aus vergangenen Trades.

## Abhängigkeiten

- **ALLIE-4** (Hyperliquid Integration) - Für Trade-Execution
- **ALLIE-3** (Agent Control Panel) - Wird von diesem Modul gesteuert

---

## User Stories

### US-5.1: KI-Modell konfigurieren
**Als** System-Administrator  
**möchte ich** die KI-API sicher konfigurieren  
**damit** der Agent Trading-Entscheidungen treffen kann

**Acceptance Criteria:**
- Environment Variables:
  - `OPENROUTER_API_KEY`
  - `AI_MODEL=moonshot/kimi-k2` (oder aktueller Model-Name)
- Beim Start: API-Verbindung validieren
- Bei fehlenden Credentials: Agent startet NICHT
- Rate-Limiting prüfen (OpenRouter-spezifisch)

### US-5.2: Marktdaten analysieren
**Als** Trading-Agent  
**möchte ich** regelmäßig Marktdaten analysieren  
**damit** Trading-Opportunitäten erkannt werden

**Acceptance Criteria:**
- Analyse-Intervall: Alle 5 Minuten (konfigurierbar)
- Input-Daten für KI:
  - Aktueller Preis (BTC/USDT)
  - OHLCV-Daten (letzte 100 Candles, 1h)
  - Volumen-Trend
  - RSI (14)
  - MACD
  - Bollinger Bands
- KI-Prompt-Template:
  ```
  Analyze the following market data for BTC/USDT and decide if we should:
  - OPEN LONG
  - OPEN SHORT
  - CLOSE POSITION (if open)
  - HOLD (do nothing)
  
  Market Data:
  {marketData}
  
  Current Position:
  {currentPosition}
  
  Account Balance:
  {accountBalance}
  
  Historical Mistakes (to avoid):
  {historicalMistakes}
  
  Provide your decision with:
  1. Action: OPEN_LONG | OPEN_SHORT | CLOSE | HOLD
  2. Reasoning: Detailed explanation
  3. Confidence: 0-100
  4. Suggested Size: Position size in USDT
  ```
- Response-Parsing: Strukturierte Antwort extrahieren
- Logging: Vollständige KI-Antwort speichern

### US-5.3: Trading-Entscheidung treffen
**Als** Trading-Agent  
**möchte ich** basierend auf KI-Analyse Trades ausführen  
**damit** das System autonom handeln kann

**Acceptance Criteria:**
- Decision-Pipeline:
  1. KI-Analyse abrufen
  2. Confidence-Check: Min. 70% für Aktion
  3. Safety-Checks:
     - Max. 1 Position gleichzeitig (MVP)
     - Position Size ≤ 10% des Account Balance
     - Nicht in Emergency Stop Modus
     - Kein wiederholter Fehler aus Historie
  4. Bei allen Checks erfolgreich: Order ausführen
  5. Trade dokumentieren
- Bei Ablehnung: Grund loggen (z.B. "Confidence too low: 65%")

### US-5.4: Aus Trades lernen
**Als** Trading-Agent  
**möchte ich** aus geschlossenen Trades lernen  
**damit** wiederholte Fehler vermieden werden

**Acceptance Criteria:**
- Nach Trade-Close (manuell oder automatisch):
  - Trade bewerten: Gewinn → "good", Verlust → "bad"
  - Verlust-Trades (PnL < -2%):
    - Marktkontext speichern
    - KI-Reasoning speichern
    - Als "Fehler" markieren
  - Bei 3+ ähnlichen Fehlern:
    - Pattern erkennen (z.B. "Immer Long bei RSI > 70 verloren")
    - Pattern in "Historical Mistakes" einfügen
    - Zukünftige KI-Prompts enthalten diese Fehler
- Fehler-Datenbank:
  - Max. 50 Fehler speichern (älteste werden rotiert)
  - Fehler-Gewichtung: Mehr Verlust → höhere Priorität

### US-5.5: Strategie-Gewichtung anpassen
**Als** Trading-Agent  
**möchte ich** erfolgreiche Strategien priorisieren  
**damit** das System sich verbessert

**Acceptance Criteria:**
- Strategien (initiale Liste):
  - "Trend Following"
  - "Mean Reversion"
  - "Breakout Trading"
- Tracking pro Strategie:
  - Anzahl Trades
  - Win-Rate
  - Durchschnittlicher PnL
- Gewichtung:
  - Erfolgreiche Strategien (Win-Rate > 55%) → höhere Confidence
  - Verlust-Strategien (Win-Rate < 45%) → niedrigere Confidence
- KI-Prompt enthält Strategie-Gewichtungen

---

## Edge Cases & Risiken

### Edge Cases
- KI-Response ist unparsebar
  - **Lösung:** Retry mit vereinfachtem Prompt, max. 3x, dann HOLD
- KI empfiehlt widersprüchliche Aktionen
  - **Lösung:** Default zu HOLD, Warnung loggen
- API-Rate-Limit (OpenRouter)
  - **Lösung:** Backoff, Analyse-Intervall erhöhen
- KI halluziniert Preise/Daten
  - **Lösung:** Server-seitige Validierung aller KI-Outputs

### Risiken
- **KI trifft konsistent schlechte Entscheidungen**
  - Mitigation: Manual Override-Möglichkeit, Performance-Monitoring
- **Prompt-Injection via Marktdaten**
  - Mitigation: Daten sanitizen, strukturiertes Format
- **Hohe API-Kosten**
  - Mitigation: Rate-Limiting, Budget-Alerts

---

## Technische Anforderungen

### KI-Integration
- Library: OpenRouter Node.js SDK oder direkte HTTP-Calls
- Timeout: 30s pro KI-Request
- Retry: Max. 2x bei Network-Errors
- Caching: Analyse-Ergebnisse für 5 Minuten (vermeidet doppelte Calls)

### Daten-Pipeline
1. Marktdaten von Hyperliquid abrufen
2. Technische Indikatoren berechnen (TA-Lib oder äquivalent)
3. Prompt konstruieren
4. KI-Call
5. Response parsen
6. Validation
7. Decision-Execution

### Performance
- Analyse-Zyklus: < 10s (Marktdaten → Entscheidung)
- KI-Response: < 5s (abhängig von OpenRouter)

---

## API-Contracts (Referenz für Backend Developer)

**POST /api/ai/analyze**
```json
Request:
{
  "symbol": "BTC/USDT",
  "marketData": {
    "currentPrice": 45000,
    "ohlcv": [...],
    "indicators": {
      "rsi": 65,
      "macd": { "value": 120, "signal": 110 },
      "bollingerBands": { "upper": 46000, "lower": 44000 }
    }
  },
  "currentPosition": {
    "symbol": "BTC/USDT",
    "side": "long",
    "entryPrice": 44500,
    "size": 0.1
  } | null,
  "accountBalance": 10000
}

Response (200):
{
  "decision": {
    "action": "HOLD", // "OPEN_LONG" | "OPEN_SHORT" | "CLOSE" | "HOLD"
    "reasoning": "Market is in consolidation phase with RSI at 65. Wait for clearer signal.",
    "confidence": 75,
    "suggestedSize": 0,
    "strategy": "Trend Following"
  },
  "timestamp": "2026-02-10T10:00:00Z"
}
```

**GET /api/ai/learning-stats**
```json
Response (200):
{
  "totalTrades": 120,
  "winRate": 58.3,
  "strategies": [
    {
      "name": "Trend Following",
      "trades": 60,
      "winRate": 65.0,
      "avgPnL": 2.5,
      "weight": 1.2
    },
    {
      "name": "Mean Reversion",
      "trades": 40,
      "winRate": 50.0,
      "avgPnL": -0.5,
      "weight": 0.8
    }
  ],
  "historicalMistakes": [
    {
      "pattern": "Opening long when RSI > 70",
      "occurrences": 5,
      "avgLoss": -3.2
    }
  ]
}
```

---

## KI-Prompt-Engineering (Referenz)

### System-Prompt (konstant)
```
You are a professional cryptocurrency trading analyst specializing in Bitcoin/USDT.
Your role is to analyze market data and provide clear, actionable trading decisions.

Rules:
- Be conservative: Only recommend trades with high confidence
- Prioritize capital preservation over aggressive gains
- Learn from past mistakes (provided in context)
- Never recommend trades that repeat historical errors
- Always provide detailed reasoning for your decisions
```

### User-Prompt (dynamisch)
```
Current Market Analysis Request:

Symbol: {symbol}
Current Price: ${currentPrice}
Account Balance: ${accountBalance}

Technical Indicators:
- RSI(14): {rsi}
- MACD: {macd}
- Bollinger Bands: Upper ${bbUpper}, Lower ${bbLower}

Current Position: {currentPosition || "None"}

Historical Mistakes to Avoid:
{historicalMistakes}

Please provide your trading decision in the following format:
ACTION: [OPEN_LONG | OPEN_SHORT | CLOSE | HOLD]
REASONING: [Your detailed analysis]
CONFIDENCE: [0-100]
SUGGESTED_SIZE: [Position size in USDT, 0 if HOLD/CLOSE]
STRATEGY: [Trend Following | Mean Reversion | Breakout Trading]
```

---

## Definition of Done

- [ ] OpenRouter API-Integration implementiert
- [ ] KI-Prompt-Template erstellt
- [ ] Marktdaten-Pipeline implementiert
- [ ] Technische Indikatoren (RSI, MACD, BB) berechnet
- [ ] Decision-Pipeline implementiert
- [ ] Learning-System (Historical Mistakes) implementiert
- [ ] Strategie-Gewichtung implementiert
- [ ] Response-Parsing + Validation
- [ ] Error-Handling für KI-API-Fehler
- [ ] Unit-Tests mit Mock-KI-Responses
- [ ] Integration-Test mit echtem KI-Call
- [ ] Performance-Test: < 10s pro Analyse-Zyklus
- [ ] Dokumentation: KI-Prompt-Tuning-Guide
