-- Integrated Systems (Cosmo) — "Аж ахуйн нэгж бүртгэл" (/clientele) хуудасны
-- Supabase хүснэгэл. Owners-ийн бүтэц/RLS загварыг дахин ашигласан.

create table if not exists clientele (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  legal_entity_name text,
  reg_no text,
  sqm numeric,
  ceo_first_name_last_name text,
  mobile text,
  phone text,
  email text,
  contract_no text,
  contract_start date,
  contract_end date,
  has_parking boolean default false,
  parkings jsonb default '[]',
  has_storage boolean default false,
  storages jsonb default '[]',
  has_vehicle boolean default false,
  vehicles jsonb default '[]',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clientele_tenant_id_idx on clientele(tenant_id);

alter table clientele enable row level security;

create policy "clientele: tenant-аараа хязгаарлана"
  on clientele for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

-- 2026-08-17: "өмчийн Улсын бүртгэлийн дугаар" багана нэмэв (Owners-ийн
-- cadastral_no-той адил зорилготой, гэхдээ ААН-д зориулсан тул нэрийг
-- ялгаатай сонгов).
alter table clientele add column if not exists property_no text;
