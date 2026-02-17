# API Reference

Complete REST API documentation for Allie Agent.

---

## Base URL

```
Production: https://allie.memero.store/api
Development: http://localhost:4000/api
```

All endpoints return JSON. Timestamps are ISO 8601 format.

---

## Authentication Endpoints

### Create Admin Account (First Access)

**Endpoint**: `POST /auth/setup`

**Description**: Creates the initial admin account. Only works once on first system access.

**Request**:
```json
{
  "adminName": "admin",
  "password": "secure_password_here"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Admin account created successfully",
  "sessionToken": "abc123xyz789",
  "user": {
    "id": 1,
    "email": "admin",
    "createdAt": "2026-02-17T12:34:56Z"
  }
}
```

**Response** (Failure):
```json
{
  "success": false,
  "message": "Admin account already exists or invalid input"
}
```

---

### Login

**Endpoint**: `POST /auth/login`

**Description**: Authenticate with password to get session token.

**Request**:
```json
{
  "password": "admin_password"
}
```

**Response** (Success):
```json
{
  "success": true,
  "sessionToken": "new_session_token",
  "user": {
    "id": 1,
    "email": "admin",
    "lastLogin": "2026-02-17T12:34:56Z"
  }
}
```

**Headers**: Automatically set `Authorization: Bearer <sessionToken>`

---

### Logout

**Endpoint**: `POST /auth/logout`

**Description**: Invalidate current session.

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get Session Info

**Endpoint**: `GET /auth/session`

**Description**: Verify current session validity and get user info.

**Response** (Valid):
```json
{
  "success": true,
  "isValid": true,
  "user": {
    "id": 1,
    "email": "admin"
  },
  "expiresAt": "2026-02-18T12:34:56Z"
}
```

**Response** (Invalid/Expired):
```json
{
  "success": false,
  "isValid": false,
  "message": "Session expired"
}
```

---

## Agent Control Endpoints

### Start Trading Engine

**Endpoint**: `POST /agent/start`

**Description**: Start automated trading cycles at configured interval.

**Request** (Optional):
```json
{
  "analysisIntervalMinutes": 2
}
```

**Response**:
```json
{
  "success": true,
  "message": "Trading engine started",
  "status": {
    "isRunning": true,
    "startedAt": "2026-02-17T12:34:56Z",
    "cycleCount": 0,
    "nextCycleAt": "2026-02-17T12:36:56Z"
  }
}
```

---

### Stop Trading Engine

**Endpoint**: `POST /agent/stop`

**Description**: Stop active trading cycles. Existing positions remain open.

**Response**:
```json
{
  "success": true,
  "message": "Trading engine stopped",
  "status": {
    "isRunning": false,
    "stoppedAt": "2026-02-17T12:40:00Z",
    "lastCycleAt": "2026-02-17T12:38:56Z",
    "totalCycles": 5
  }
}
```

---

### Emergency Stop

**Endpoint**: `POST /agent/emergency-stop`

**Description**: Immediately halt all trading and close all positions.

**Response**:
```json
{
  "success": true,
  "message": "Emergency stop activated",
  "closedPositions": 2,
  "totalLoss": -$234.50,
  "status": {
    "emergencyStopped": true,
    "activatedAt": "2026-02-17T12:41:00Z"
  }
}
```

---

### Reset Emergency Stop

**Endpoint**: `POST /agent/emergency-stop/reset`

**Description**: Reset emergency stop status to allow normal trading resume.

**Response**:
```json
{
  "success": true,
  "message": "Emergency stop cleared",
  "status": {
    "emergencyStopped": false,
    "readyToResume": true
  }
}
```

---

### Get Agent Status

**Endpoint**: `GET /agent/status`

**Description**: Get current engine status and statistics.

**Response**:
```json
{
  "success": true,
  "agent": {
    "isRunning": true,
    "emergencyStopped": false,
    "startedAt": "2026-02-17T12:00:00Z",
    "cycleCount": 23,
    "lastCycleAt": "2026-02-17T12:38:56Z",
    "nextCycleAt": "2026-02-17T12:40:56Z",
    "analysisIntervalMinutes": 2,
    "stats": {
      "totalTrades": 12,
      "successfulTrades": 8,
      "failedTrades": 4,
      "totalPnL": 234.50,
      "winRate": 0.67,
      "averageDuration": "45min"
    }
  }
}
```

---

## Dashboard Endpoints

### Get Overview

**Endpoint**: `GET /dashboard/overview`

**Description**: Get account summary and key metrics.

**Response**:
```json
{
  "success": true,
  "overview": {
    "accountBalance": 10234.56,
    "openPositions": 2,
    "totalExposure": 0.35,
    "dayPnL": 234.50,
    "dayPnLPercent": 2.34,
    "totalPnL": 1234.50,
    "totalPnLPercent": 13.7,
    "winRate": 0.67,
    "largestWin": 500.00,
    "largestLoss": -125.00,
    "averageTradeTime": 45,
    "maxDrawdown": 0.08,
    "sharpeRatio": 1.45,
    "timestamps": {
      "lastUpdate": "2026-02-17T12:38:56Z",
      "dayStart": "2026-02-17T00:00:00Z"
    }
  }
}
```

---

### Get Active Positions

**Endpoint**: `GET /dashboard/active`

**Description**: List all open positions.

**Response**:
```json
{
  "success": true,
  "positions": [
    {
      "id": 1,
      "symbol": "BTC",
      "side": "LONG",
      "entryPrice": 40000.00,
      "currentPrice": 41200.00,
      "quantity": 0.1,
      "leverage": 5,
      "entryTime": "2026-02-17T10:30:00Z",
      "unrealizedPnL": 1200.00,
      "unrealizedPnLPercent": 3.0,
      "stopLoss": 38800.00,
      "takeProfit": 43600.00,
      "riskReward": 1.4,
      "confidence": 72
    },
    {
      "id": 2,
      "symbol": "ETH",
      "side": "SHORT",
      "entryPrice": 2400.00,
      "currentPrice": 2350.00,
      "quantity": 1.0,
      "leverage": 3,
      "entryTime": "2026-02-17T11:15:00Z",
      "unrealizedPnL": 50.00,
      "unrealizedPnLPercent": 2.08,
      "stopLoss": 2472.00,
      "takeProfit": 2256.00,
      "riskReward": 1.3,
      "confidence": 58
    }
  ],
  "summary": {
    "totalPositions": 2,
    "totalExposure": 0.35,
    "totalUnrealizedPnL": 1250.00,
    "totalUnrealizedPnLPercent": 2.84
  }
}
```

---

### Get Trade History

**Endpoint**: `GET /dashboard/history`

**Query Parameters**:
- `page` (int, default: 1) – Page number for pagination
- `limit` (int, default: 50, max: 200) – Items per page
- `status` (string, optional) – Filter: "closed", "partial", "all"
- `symbol` (string, optional) – Filter by symbol (e.g., "BTC")
- `startDate` (ISO 8601, optional) – Filter from date
- `endDate` (ISO 8601, optional) – Filter to date

**Example**: `/dashboard/history?page=1&limit=20&symbol=BTC&status=closed`

**Response**:
```json
{
  "success": true,
  "trades": [
    {
      "id": 1,
      "symbol": "BTC",
      "side": "LONG",
      "entryPrice": 39000.00,
      "exitPrice": 39500.00,
      "quantity": 0.1,
      "leverage": 5,
      "entryTime": "2026-02-17T09:00:00Z",
      "exitTime": "2026-02-17T10:30:00Z",
      "duration": "1h 30m",
      "entryFee": 19.50,
      "exitFee": 19.75,
      "realizedPnL": 450.00,
      "realizedPnLPercent": 1.15,
      "confidence": 68,
      "aiReasoning": "Bullish RSI divergence with higher lows"
    },
    {
      "id": 2,
      "symbol": "ETH",
      "side": "SHORT",
      "entryPrice": 2500.00,
      "exitPrice": 2480.00,
      "quantity": 1.0,
      "leverage": 3,
      "entryTime": "2026-02-16T14:00:00Z",
      "exitTime": "2026-02-16T16:45:00Z",
      "duration": "2h 45m",
      "entryFee": 7.50,
      "exitFee": 7.44,
      "realizedPnL": 5.06,
      "realizedPnLPercent": 0.2,
      "confidence": 62,
      "aiReasoning": "Overbought conditions, pullback expected"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 147,
    "totalPages": 8
  }
}
```

---

## Activity Logs Endpoints

### Get Activity Logs

**Endpoint**: `GET /activity-logs`

**Query Parameters**:
- `page` (int, default: 1) – Page number
- `limit` (int, default: 50, max: 200) – Items per page
- `category` (string, optional) – Filter by category
  - `ENGINE`, `CYCLE`, `MARKET`, `ANALYSIS`, `AI`, `RISK`, `TRADE`, `POSITION`, `ACCOUNT`, `DECISION`, `ERROR`
- `severity` (string, optional) – Filter by severity
  - `INFO`, `SUCCESS`, `WARNING`, `ERROR`

**Example**: `/activity-logs?page=1&limit=50&category=TRADE&severity=ERROR`

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1245,
      "timestamp": "2026-02-17T12:38:56.123Z",
      "cycleId": 45,
      "category": "MARKET",
      "event": "MARKET_DATA",
      "severity": "INFO",
      "message": "Fetched market data: BTC $42,150 | ETH $2,340",
      "details": {
        "symbols": ["BTC", "ETH"],
        "prices": {
          "BTC": 42150.00,
          "ETH": 2340.00
        },
        "timestamp": "2026-02-17T12:38:56Z"
      }
    },
    {
      "id": 1246,
      "timestamp": "2026-02-17T12:38:57.234Z",
      "cycleId": 45,
      "category": "ANALYSIS",
      "event": "TECHNICAL_SIGNAL",
      "severity": "INFO",
      "message": "Technical Signal: BTC RSI=68 (Overbought), MACD=Bullish",
      "details": {
        "symbol": "BTC",
        "rsi": 68,
        "macd": "bullish",
        "bollinger": "upper_band",
        "trend": "up"
      }
    },
    {
      "id": 1247,
      "timestamp": "2026-02-17T12:39:02.456Z",
      "cycleId": 45,
      "category": "AI",
      "event": "AI_DECISION",
      "severity": "SUCCESS",
      "message": "AI Decision: LONG BTC with 72% confidence",
      "details": {
        "decision": "LONG",
        "symbol": "BTC",
        "confidence": 0.72,
        "reasoning": "Bullish momentum with RSI divergence",
        "suggestedSize": 0.1,
        "stopLoss": 40500.00,
        "takeProfit": 43800.00
      }
    },
    {
      "id": 1248,
      "timestamp": "2026-02-17T12:39:03.567Z",
      "cycleId": 45,
      "category": "RISK",
      "event": "RISK_CHECK",
      "severity": "SUCCESS",
      "message": "Risk check passed: Position within limits",
      "details": {
        "exposure": 0.15,
        "maxExposure": 0.35,
        "positions": 2,
        "maxPositions": 5,
        "dailyLoss": -50.00,
        "dailyLossLimit": -800.00
      }
    },
    {
      "id": 1249,
      "timestamp": "2026-02-17T12:39:05.678Z",
      "cycleId": 45,
      "category": "TRADE",
      "event": "TRADE_EXECUTED",
      "severity": "SUCCESS",
      "message": "Trade executed: BTC LONG 0.1 @ $42,150",
      "details": {
        "tradeId": 123,
        "symbol": "BTC",
        "side": "LONG",
        "quantity": 0.1,
        "entryPrice": 42150.00,
        "fee": 21.08,
        "orderId": "hyperliquid_order_456789"
      }
    },
    {
      "id": 1250,
      "timestamp": "2026-02-17T12:39:06.789Z",
      "cycleId": 45,
      "category": "TRADE",
      "event": "TRADE_REJECTED",
      "severity": "WARNING",
      "message": "Trade REJECTED: Confidence too low (45% < min 55%)",
      "details": {
        "symbol": "ETH",
        "decision": "SHORT",
        "confidence": 0.45,
        "minConfidence": 0.55,
        "reason": "AI confidence below threshold"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 8945,
    "totalPages": 179
  }
}
```

---

## Settings Endpoints

### Get Settings

**Endpoint**: `GET /settings`

**Description**: Get current trading parameters and configuration.

**Response**:
```json
{
  "success": true,
  "settings": {
    "trading": {
      "analysisIntervalMinutes": 2,
      "maxPositionSizePercent": 20,
      "maxLeverage": 10,
      "minConfidence": 55,
      "stopLossPercent": 3,
      "takeProfitPercent": 6,
      "maxPositions": 5
    },
    "risk": {
      "maxDailyLossPercent": 8,
      "maxDrawdownPercent": 15,
      "enableEmergencyStop": true,
      "emergencyStopDrawdown": 20
    },
    "strategy": "aggressive",
    "lastUpdated": "2026-02-17T10:00:00Z"
  }
}
```

---

### Update Settings

**Endpoint**: `POST /settings/update`

**Request** (All fields optional):
```json
{
  "trading": {
    "analysisIntervalMinutes": 3,
    "minConfidence": 60,
    "maxLeverage": 8
  },
  "risk": {
    "maxDailyLossPercent": 10
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": {
    "trading": {
      "analysisIntervalMinutes": 3,
      "maxPositionSizePercent": 20,
      "maxLeverage": 8,
      "minConfidence": 60,
      "stopLossPercent": 3,
      "takeProfitPercent": 6,
      "maxPositions": 5
    },
    "risk": {
      "maxDailyLossPercent": 10,
      "maxDrawdownPercent": 15,
      "enableEmergencyStop": true,
      "emergencyStopDrawdown": 20
    },
    "lastUpdated": "2026-02-17T12:45:00Z"
  }
}
```

---

## Health Endpoints

### Health Check

**Endpoint**: `GET /health/check`

**Description**: Run system diagnostics and return detailed health status.

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": "12ms",
      "connections": 5,
      "maxConnections": 20
    },
    "exchange": {
      "status": "ok",
      "responseTime": "145ms",
      "lastCheck": "2026-02-17T12:38:50Z"
    },
    "ai_service": {
      "status": "ok",
      "responseTime": "1234ms",
      "lastCheck": "2026-02-17T12:38:45Z"
    },
    "memory": {
      "status": "ok",
      "usage": "312MB",
      "limit": "1024MB"
    },
    "disk": {
      "status": "ok",
      "usage": "45%",
      "free": "250GB"
    }
  },
  "timestamp": "2026-02-17T12:38:56Z"
}
```

---

### Health Status

**Endpoint**: `GET /health/status`

**Description**: Quick health status without full diagnostics.

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2026-02-17T12:38:56Z"
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "error context"
  }
}
```

### Common HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | Trade executed successfully |
| 400 | Bad Request | Invalid parameter values |
| 401 | Unauthorized | Invalid session token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded (60 req/min) |
| 500 | Server Error | Unexpected server error |
| 503 | Service Unavailable | Database connection failed |

---

## Rate Limiting

All endpoints are rate limited to **60 requests per minute** per session.

Response headers include:
- `X-RateLimit-Limit: 60`
- `X-RateLimit-Remaining: 45`
- `X-RateLimit-Reset: 1645033136`

---

## Webhooks (Future)

Currently not implemented. Planned for future release to enable:
- Trade execution notifications
- Position status updates
- Risk warnings
- Emergency stop events

---

**API Reference** – Allie Agent v1.0
**Last Updated**: February 2026
