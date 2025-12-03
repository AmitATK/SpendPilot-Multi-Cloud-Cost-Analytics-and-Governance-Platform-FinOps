CREATE INDEX IF NOT EXISTS rud_org_date_service_idx
ON resource_usage_daily(org_id, usage_date, service);