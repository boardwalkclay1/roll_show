-- 0098_analytics_upgrade.sql

-- Add advanced analytics fields on top of existing table
ALTER TABLE analytics ADD COLUMN event_type TEXT;
ALTER TABLE analytics ADD COLUMN target_type TEXT;
ALTER TABLE analytics ADD COLUMN target_id TEXT;
ALTER TABLE analytics ADD COLUMN metadata TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_target ON analytics(target_id);
