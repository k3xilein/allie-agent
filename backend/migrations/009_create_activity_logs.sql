-- Migration: Create activity_logs table for detailed trading activity tracking
-- Created: 2026-02-17

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  category VARCHAR(30) NOT NULL,
  event VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  severity VARCHAR(10) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS')),
  cycle_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_cycle ON activity_logs(cycle_id);
