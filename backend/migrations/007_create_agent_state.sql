-- Migration: Create agent_state table
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS agent_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status VARCHAR(20) NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'emergency_stop')),
  last_analysis_at TIMESTAMP,
  last_trade_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial state (only if not already present)
INSERT INTO agent_state (id, status) VALUES (1, 'stopped') ON CONFLICT (id) DO NOTHING;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_agent_state_updated_at ON agent_state;
CREATE TRIGGER update_agent_state_updated_at BEFORE UPDATE
ON agent_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
