-- Migration: Create system_logs table
-- Created: 2026-02-10

CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  user_id INTEGER REFERENCES users(id),
  details JSONB,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_logs_severity ON system_logs(severity);
CREATE INDEX idx_logs_event_type ON system_logs(event_type);
