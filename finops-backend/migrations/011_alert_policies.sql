create table if not exists alert_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  rule jsonb not null,
  channel_ids uuid[] default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_alert_policies_org on alert_policies(org_id);