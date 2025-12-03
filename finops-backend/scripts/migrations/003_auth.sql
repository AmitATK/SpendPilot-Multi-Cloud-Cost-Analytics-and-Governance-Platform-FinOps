create extension if not exists citext;

-- Users (ensure table + password_hash exists)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  name text,
  password_hash text,
  created_at timestamptz default now()
);
alter table users add column if not exists password_hash text;

-- Roles link table (safe to have, even if you don’t use it yet)
create table if not exists user_org_roles (
  user_id uuid references users(id) on delete cascade,
  org_id uuid not null,
  role text not null check (role in ('ADMIN','FINANCE','TEAM_LEAD')),
  primary key (user_id, org_id)
);
