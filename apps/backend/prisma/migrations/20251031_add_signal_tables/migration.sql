-- Story 4.0d: Signal Calculation Standardization
-- Migration: Add signal configuration and cache tables
-- Date: 2024-10-31

-- Signal Configuration Table
CREATE TABLE IF NOT EXISTS signal_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_type VARCHAR(100) UNIQUE NOT NULL,
    parameters JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_signal_configuration_signal_type ON signal_configuration(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_configuration_enabled ON signal_configuration(enabled);

-- Signal Cache Table (Railway Redis-backed)
CREATE TABLE IF NOT EXISTS signal_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(500) UNIQUE NOT NULL,
    signal_type VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    hit_count INT DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signal_cache_signal_type ON signal_cache(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_cache_expires_at ON signal_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_signal_cache_created_at ON signal_cache(created_at DESC);

-- Add error_message column to signal_history (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'signal_history'
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE signal_history ADD COLUMN error_message TEXT;
    END IF;
END $$;

-- Seed default signal configurations
INSERT INTO signal_configuration (signal_type, parameters, enabled, description, version)
VALUES
    ('gayed_8_month',
     '{"shortPeriod": 8, "longPeriod": 9, "minimumDataPoints": 20}'::jsonb,
     true,
     'Gayed 8-Month Timing Signal for trend detection',
     '1.0.0'),
    ('gayed_20d',
     '{"period": 20, "minimumDataPoints": 40}'::jsonb,
     true,
     'Gayed 20-Day Short-term Signal',
     '1.0.0'),
    ('bollinger_bands',
     '{"period": 20, "standardDeviations": 2, "overboughtThreshold": 0.8, "oversoldThreshold": 0.2}'::jsonb,
     true,
     'Bollinger Band volatility and mean reversion signal',
     '1.0.0'),
    ('aggregate',
     '{"weights": {"gayed_8_month": 0.4, "gayed_20d": 0.3, "bollinger_bands": 0.3}}'::jsonb,
     true,
     'Composite aggregate signal combining multiple indicators',
     '1.0.0')
ON CONFLICT (signal_type) DO NOTHING;

-- Add comment to tables
COMMENT ON TABLE signal_configuration IS 'Story 4.0d: Signal parameters and configuration stored in Railway PostgreSQL';
COMMENT ON TABLE signal_cache IS 'Story 4.0d: Railway Redis-backed cache for expensive signal calculations';
