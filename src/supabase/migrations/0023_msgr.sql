-- Integrated Systems (Cosmo) — "Мессенжер" (/msgr) хуудасны Supabase
-- хvснэгэл. 2026-08-19 хэрэглэгч эцэслэн нэрлэсэн: "msgr_list" (харилцагч
-- тус бvрийн харилцан ярианы төлөв — pinned/muted/urgent/unread) +
-- "msgr_messages" (мессеж бvр).
create table if not exists msgr_list (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid references owners(id) on delete set null,
  pinned boolean not null default false,
  muted boolean not null default false,
  urgent boolean not null default false,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists msgr_list_tenant_id_idx on msgr_list(tenant_id);

create table if not exists msgr_messages (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references msgr_list(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  dir text not null check (dir in ('in', 'out')),
  body text not null,
  agent text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists msgr_messages_list_id_idx on msgr_messages(list_id);
create index if not exists msgr_messages_tenant_id_idx on msgr_messages(tenant_id);

alter table msgr_list enable row level security;
alter table msgr_messages enable row level security;

create policy "msgr_list: tenant-аараа хязгаарлана"
  on msgr_list for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "msgr_messages: tenant-аараа хязгаарлана"
  on msgr_messages for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
