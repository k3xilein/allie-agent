-- Migration: Create ai_analyses table
-- Created: 2026-02-10

CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market_data JSONB NOT NULL,
  current_position JSONB,
  ai_response TEXT NOT NULL,
  decision VARCHAR(20) NOT NULL,
  confidence INTEGER,
  action_taken BOOLEAN DEFAULT FALSE,
  rejection_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyses_timestamp ON ai_analyses(timestamp DESC);
CREATE INDEX idx_analyses_action_taken ON ai_analyses(action_taken);
CREATE INDEX idx_analyses_decision ON ai_analyses(decision);
