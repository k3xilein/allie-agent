-- Migration: Create trades table
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(5) NOT NULL CHECK (side IN ('long', 'short')),
  entry_price DECIMAL(18, 8) NOT NULL,
  exit_price DECIMAL(18, 8),
  size DECIMAL(18, 8) NOT NULL,
  entry_timestamp TIMESTAMP NOT NULL,
  exit_timestamp TIMESTAMP,
  realized_pnl DECIMAL(18, 8),
  strategy VARCHAR(50),
  ai_reasoning TEXT,
  market_context JSONB,
  evaluation VARCHAR(10) CHECK (evaluation IN ('good', 'bad') OR evaluation IS NULL),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_entry_ts ON trades(entry_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_evaluation ON trades(evaluation);
CREATE INDEX IF NOT EXISTS idx_trades_exit_ts ON trades(exit_timestamp DESC) WHERE exit_timestamp IS NOT NULL;
