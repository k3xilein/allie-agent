-- Create user_settings table for storing user configuration
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted API keys (using AES-256-GCM)
    api_keys_encrypted TEXT,
    api_keys_iv TEXT,
    api_keys_tag TEXT,
    
    -- Risk management parameters (stored as JSON)
    risk_management JSONB DEFAULT '{
        "maxPositionSize": 10,
        "maxDailyLoss": 5,
        "stopLossPercent": 2,
        "takeProfitPercent": 5
    }'::jsonb,
    
    -- Strategy configuration (stored as JSON)
    strategy JSONB DEFAULT '{
        "type": "balanced",
        "timeframe": "15m",
        "minConfidence": 70
    }'::jsonb,
    
    -- Notification preferences (stored as JSON)
    notifications JSONB DEFAULT '{
        "email": false,
        "tradeAlerts": true,
        "dailyReport": false
    }'::jsonb,
    
    -- Onboarding status
    onboarding_completed BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE user_settings IS 'Stores user-specific settings including API keys (encrypted), risk management parameters, trading strategy, and notification preferences';
COMMENT ON COLUMN user_settings.api_keys_encrypted IS 'Encrypted API keys using AES-256-GCM encryption';
COMMENT ON COLUMN user_settings.api_keys_iv IS 'Initialization vector for API key encryption';
COMMENT ON COLUMN user_settings.api_keys_tag IS 'Authentication tag for API key encryption';
