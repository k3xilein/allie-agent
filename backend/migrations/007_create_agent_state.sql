-- Migration: Create agent_state table
-- Created: 2026-02-10

CREATE TABLE agent_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status VARCHAR(20) NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'emergency_stop')),
  last_analysis_at TIMESTAMP,
  last_trade_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial state
INSERT INTO agent_state (id, status) VALUES (1, 'stopped');

-- Trigger for updated_at
CREATE TRIGGER update_agent_state_updated_at BEFORE UPDATE
ON agent_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
