create table if not exists org_settings (
  org_id uuid not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (org_id, key)
);

insert into org_settings (org_id, key, value)
values
  ('00000000-0000-0000-0000-000000000000','requiredTags','["owner","env","team","cost_center"]'::jsonb),
  ('00000000-0000-0000-0000-000000000000','forecast','{"alpha":0.3,"h":30}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','statements','{"topN":5}'::jsonb)
on conflict (org_id, key) do nothing;
