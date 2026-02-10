-- Migration: Create audit_log table
-- Created: 2026-02-10

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  ip_address VARCHAR(45),
  result VARCHAR(20) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE')),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action_type);
