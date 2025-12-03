CREATE INDEX IF NOT EXISTS idx_usage_org_day
ON resource_usage_daily(org_id, usage_date);


CREATE INDEX IF NOT EXISTS idx_usage_org_srv_day
ON resource_usage_daily(org_id, service, usage_date);


CREATE INDEX IF NOT EXISTS idx_usage_tags_gin
ON resource_usage_daily USING gin (tags);


DO $$ BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_constraint WHERE conname = 'uniq_budget_events_period_threshold'
) THEN
ALTER TABLE budget_events
ADD CONSTRAINT uniq_budget_events_period_threshold
UNIQUE (budget_id, period_start, threshold);
END IF;
END $$;