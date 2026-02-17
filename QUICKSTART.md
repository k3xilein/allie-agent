# Quick Start Guide

Get Allie Agent running in minutes.

---

## System Requirements

- **OS**: macOS, Linux, or Windows with WSL2
- **Node.js**: 18+ and npm
- **Docker**: Docker Desktop or Docker Engine
- **Disk Space**: 5GB minimum
- **RAM**: 4GB minimum

---

## Installation (5 minutes)

### 1. Clone Repository

```bash
git clone https://github.com/k3xilein/allie-agent.git
cd allie-agent
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Hyperliquid Testnet
HYPERLIQUID_WALLET_ADDRESS=0x...your_wallet...
HYPERLIQUID_PRIVATE_KEY=...your_private_key...
HYPERLIQUID_TESTNET=true

# AI Service
OPENROUTER_API_KEY=...your_api_key...
AI_MODEL=google/gemini-2.0-flash-001

# Database
DATABASE_URL=postgresql://allie:password@localhost:5432/allie_trading
```

### 3. Start Services

```bash
docker-compose up -d
```

Wait ~30 seconds for services to start.

### 4. Access Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api

### 5. Create Admin Account

1. Open http://localhost:3000
2. Enter admin name and password
3. Click "Create Account"
4. You're logged in!

---

## First Trade (10 minutes)

### 1. Configure Trading Parameters

1. Click **Settings** in sidebar
2. Set parameters:
   - **Analysis Interval**: 2 minutes
   - **Min Confidence**: 55%
   - **Max Position Size**: 20%
   - **Max Leverage**: 10x
   - **Stop Loss**: 3%
   - **Take Profit**: 6%
3. Click **Save**

### 2. Add Funds to Wallet

1. Get your wallet address from display
2. Send USDC to wallet on Hyperliquid testnet
3. Wait for confirmation (~1 minute)

### 3. Start Trading Engine

1. Click **Dashboard**
2. Click **Start Trading** button
3. Watch for trading cycles to begin

### 4. Monitor Activity

1. Click **Activity Log** in sidebar
2. Watch real-time trading cycle data
3. See AI decisions and trade approvals/rejections

---

## Understanding the Dashboard

### Overview Card

Shows key metrics:
- **Balance**: Your current USDC balance
- **24h P&L**: Today's profit/loss
- **Open Positions**: Active trades
- **Win Rate**: % of profitable trades

### Active Positions

Current open trades:
- Entry price and current price
- Unrealized P&L (profit/loss)
- Risk/reward ratio
- Stop loss and take profit levels

### Trade History

Past trades with:
- Entry/exit prices
- Profit/loss per trade
- Trade duration
- AI confidence at entry

---

## Understanding Activity Log

Real-time visibility into trading cycle:

```
┌─ CYCLE #45 ──────────────────────────┐
│ 12:38:56 [MARKET] MARKET_DATA        │
│   BTC $42,150 | ETH $2,340           │
│                                       │
│ 12:38:57 [ANALYSIS] TECHNICAL_SIGNAL │
│   RSI=68 (Overbought), MACD=Bullish  │
│                                       │
│ 12:38:58 [ACCOUNT] BALANCE_CHECK     │
│   Balance: $10,234.56                │
│                                       │
│ 12:39:02 [AI] AI_DECISION            │
│   LONG BTC - Confidence: 72%          │
│                                       │
│ 12:39:03 [RISK] RISK_CHECK           │
│   ✓ Within limits                    │
│                                       │
│ 12:39:05 [TRADE] TRADE_EXECUTED      │
│   BTC LONG 0.1 @ $42,150             │
└───────────────────────────────────────┘
```

### Filter by Category

- **ENGINE**: System startup/shutdown
- **MARKET**: Price and data fetches
- **ANALYSIS**: Technical analysis results
- **AI**: AI decisions and reasoning
- **TRADE**: Order execution and results
- **RISK**: Risk check approvals/rejections
- **POSITION**: Position exits and scaling

### Filter by Severity

- **INFO**: Normal operations
- **SUCCESS**: Successful actions (trades, exits)
- **WARNING**: Rejections and issues
- **ERROR**: System errors

---

## Common Workflows

### Check Why Trade Was Rejected

1. Go to **Activity Log**
2. Filter by `Category: TRADE`
3. Look for `TRADE_REJECTED` entries
4. Expand JSON details to see reason
5. Common reasons:
   - **Confidence too low**: AI confidence below minimum
   - **Risk limit exceeded**: Position size or exposure too high
   - **Daily loss limit hit**: Already lost max for day
   - **Max positions reached**: Already at max open trades

### View Detailed Trade Analysis

1. Go to **Trade History**
2. Click on any trade
3. See:
   - Entry/exit prices and times
   - AI reasoning at entry
   - Technical indicators used
   - Profit/loss and fees
   - Trade duration

### Adjust Risk Parameters

1. Go to **Settings**
2. Modify:
   - `minConfidence` – Increase for more selective trades
   - `maxDailyLossPercent` – Reduce for stricter loss limits
   - `stopLossPercent` – Increase for looser stops
   - `takeProfitPercent` – Increase for bigger targets
3. Click **Save**
4. Changes take effect on next cycle

### Emergency Stop

1. Go to **Dashboard**
2. Click **EMERGENCY STOP** button
3. All positions closed immediately
4. Trading engine stops
5. Click **Reset** to resume trading

---

## Troubleshooting

### Services Not Starting

```bash
# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f

# Restart everything
docker-compose restart
```

### Can't Connect to Dashboard

```bash
# Test backend
curl http://localhost:4000/api/health/status

# Test frontend
curl http://localhost:3000
```

### No Trades Executing

Check Activity Log for reasons:
1. AI confidence too low? Reduce `minConfidence`
2. Position size too large? Reduce `maxPositionSizePercent`
3. Max positions reached? Reduce `maxPositions` or close a position
4. Daily loss limit? Reset or increase `maxDailyLossPercent`

### Database Connection Error

```bash
# Check database
docker-compose exec postgres psql -U allie -c "SELECT 1"

# Reset database
docker-compose down
docker volume rm allie-agent_postgres_data
docker-compose up -d
```

---

## Key Concepts

### Technical Signals

AI analyzes:
- **RSI** (Relative Strength Index): Momentum indicator
- **MACD** (Moving Average Convergence Divergence): Trend indicator
- **Bollinger Bands**: Volatility indicator
- **Moving Averages**: Trend direction

### AI Confidence

- **0-40%**: No trade
- **40-55%**: Weak signal (usually rejected)
- **55-70%**: Normal trade
- **70-85%**: Strong signal
- **85-100%**: Very strong signal

### Position Sizing

Calculated using Kelly Criterion:
```
Size = (Win% × Avg Win - Loss% × Avg Loss) / Avg Win
```

Capped at `maxPositionSizePercent` of balance.

### Risk Management

- **Stop Loss**: Automatic exit if price drops X%
- **Take Profit**: Automatic exit if price rises X%
- **Daily Loss Limit**: Stop trading if lost X% today
- **Max Positions**: Never hold more than N open trades
- **Max Leverage**: Never use more than Nx leverage

---

## Monitoring Checklist

**Daily**:
- [ ] Check balance and P&L
- [ ] Review Activity Log for any errors
- [ ] Verify positions are healthy

**Weekly**:
- [ ] Review trade history
- [ ] Check win rate and average trade time
- [ ] Verify risk metrics (drawdown, exposure)

**Monthly**:
- [ ] Review trading parameters
- [ ] Analyze performance trends
- [ ] Update strategy if needed
- [ ] Backup database

---

## Next Steps

1. **Read Full Documentation**:
   - `README.md` – Project overview
   - `API.md` – Complete API reference
   - `ARCHITECTURE.md` – System design

2. **Explore Code**:
   - `backend/` – Node.js trading engine
   - `frontend/` – React dashboard
   - `migrations/` – Database schema

3. **Deploy to Production**:
   - Follow `DEPLOYMENT.md`
   - Set up SSL/TLS
   - Configure monitoring

4. **Customize Strategy**:
   - Modify AI prompts in `TradingEngine.ts`
   - Adjust risk parameters in `RiskManagementEngine.ts`
   - Add new technical indicators

---

## Support

- **Documentation**: Check README.md, API.md, ARCHITECTURE.md
- **Issues**: GitHub Issues for bugs and features
- **Logs**: Check `docker-compose logs` for detailed error messages
- **Health Check**: `curl http://localhost:4000/api/health/check`

---

## Important Notes

⚠️ **Risk Warning**: This system trades real money. Start with small position sizes and thoroughly test before increasing exposure.

⚠️ **API Keys**: Never commit API keys or private keys to version control. Use environment variables.

⚠️ **Backups**: Regularly backup your database and configuration files.

⚠️ **Monitoring**: Monitor the Activity Log regularly to understand what the system is doing.

---

**Quick Start Guide** – Allie Agent v1.0
**Getting Started**: 15 minutes from installation to first trade
