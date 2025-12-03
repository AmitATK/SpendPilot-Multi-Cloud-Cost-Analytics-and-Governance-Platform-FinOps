create extension if not exists pgcrypto;
create extension if not exists citext;

-- Orgs & Users
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  name text,
  created_at timestamptz default now()
);

create table if not exists user_org_roles (
  user_id uuid references users(id) on delete cascade,
  org_id uuid references orgs(id) on delete cascade,
  role text not null check (role in ('ADMIN','FINANCE','TEAM_LEAD')),
  primary key (user_id, org_id)
);

-- Cloud Accounts & Resources
create table if not exists cloud_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  provider text not null check (provider in ('aws','azure','gcp')),
  account_id text not null,
  display_name text,
  unique(org_id, provider, account_id)
);

create table if not exists resources (
  id bigserial primary key,
  org_id uuid not null references orgs(id),
  account_id uuid not null references cloud_accounts(id),
  service text not null,  -- EC2, S3, Lambda, RDS, etc.
  region text,
  resource_arn text,
  tags jsonb default '{}'::jsonb,
  first_seen date default current_date,
  last_seen date default current_date
);

-- Daily usage/cost facts (MVP)
create table if not exists resource_usage_daily (
  id bigserial primary key,
  org_id uuid not null references orgs(id),
  account_id uuid not null references cloud_accounts(id),
  resource_id bigint references resources(id),
  service text not null,
  usage_date date not null,
  quantity numeric,
  unit text,
  unblended_cost numeric not null,
  currency text default 'INR',
  tags jsonb default '{}'::jsonb
);
create index if not exists i_usage_org_date_service on resource_usage_daily(org_id, usage_date, service);
create index if not exists i_usage_tags on resource_usage_daily using gin(tags jsonb_path_ops);

-- Budgets
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  name text not null,
  scope jsonb not null,                 -- e.g. {"team":"checkout"}
  monthly_limit numeric not null,
  thresholds int[] default '{70,90,100}',
  currency text default 'INR',
  active boolean default true,
  created_at timestamptz default now()
);

-- Idempotency for monthly thresholds
create table if not exists budget_events (
  id bigserial primary key,
  org_id uuid not null references orgs(id),
  budget_id uuid not null references budgets(id),
  period_start date not null,
  threshold int not null,
  fired_at timestamptz not null default now(),
  unique(budget_id, period_start, threshold)
);

-- Alert channels
create table if not exists alert_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  channel text not null check (channel in ('email','slack')),
  target text not null,                 -- email or webhook URL
  scope jsonb default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

-- Cleanup suggestions
create table if not exists cleanup_suggestions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  resource_id bigint references resources(id),
  kind text not null check (kind in ('unused','idle','old_snapshot')),
  detected_on date not null default current_date,
  current jsonb not null,
  proposed jsonb not null,
  est_savings numeric,
  status text not null default 'open' check (status in ('open','accepted','dismissed'))
);
