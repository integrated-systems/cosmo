-- Integrated Systems (Cosmo) — анхны schema
-- 2026-08-15 хэрэглэгчтэй тохиролцсон 4 хүснэгэл: tenants, owners,
-- real_estate_market_prices, user_roles.
-- Ажиллуулах газар: Supabase Dashboard → SQL Editor → энэ бүх файлыг
-- бүхэлд нь paste хийгээд Run дар.

-- ===================================================================
-- 1. tenants — СӨХ бүр 1 мөр
-- ===================================================================
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'trial' check (status in ('active', 'suspended', 'trial', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ===================================================================
-- 2. owners — Сууц өмчлөгч (Owners.jsx хүснэгэлийн бүх талбар)
-- ===================================================================
create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  building_no int,
  floor int,
  door_no int,
  firstname text,
  lastname text,
  regno text,
  own_date date,
  cadastral_no text,
  phones text[] default '{}',
  emails text[] default '{}',
  people_count int,
  child_0_5 int default 0,
  child_6_18 int default 0,
  has_storage boolean default false,
  storages jsonb default '[]',
  has_parking boolean default false,
  parkings jsonb default '[]',
  has_vehicle boolean default false,
  vehicles jsonb default '[]',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists owners_tenant_id_idx on owners(tenant_id);

-- ===================================================================
-- 3. real_estate_market_prices — Сар бүрийн зах зээлийн үнэ
--    (src/data/realEstateMarket.js-ийн MARKET_ROWS бүтэцтэй яг тохирсон)
-- ===================================================================
create table if not exists real_estate_market_prices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  month text not null, -- 'YYYY/MM' формат, front-end-тэй адил
  residential_sale_price numeric not null default 0,
  rental_1_room numeric not null default 0,
  rental_2_room numeric not null default 0,
  rental_3_room numeric not null default 0,
  rental_4_room numeric not null default 0,
  rental_5_room numeric not null default 0,
  rental_6_room numeric not null default 0,
  storage_sale_price numeric not null default 0,
  storage_rental_price numeric not null default 0,
  parking_sale_price numeric not null default 0,
  parking_rental_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, month)
);
create index if not exists real_estate_market_prices_tenant_id_idx on real_estate_market_prices(tenant_id);

-- ===================================================================
-- 4. user_roles — Хэрэглэгчийн эрх (RBAC архитектур 2026-08-10)
--    tenant_id = null → SUPERSYSADMIN (платформын дээд админ)
-- ===================================================================
create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, tenant_id, role)
);
create index if not exists user_roles_user_id_idx on user_roles(user_id);

-- ===================================================================
-- Helper функцууд — RLS policy-д ашиглана
-- ===================================================================
create or replace function is_supersysadmin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = 'supersysadmin' and tenant_id is null
  );
$$;

create or replace function my_tenant_ids()
returns setof uuid language sql stable security definer as $$
  select tenant_id from user_roles where user_id = auth.uid() and tenant_id is not null;
$$;

-- ===================================================================
-- RLS асаах + анхны бодлого (baseline — дэлгэрэнгүй tenant_features
-- давхарга дараа нэмэгдэнэ)
-- ===================================================================
alter table tenants enable row level security;
alter table owners enable row level security;
alter table real_estate_market_prices enable row level security;
alter table user_roles enable row level security;

create policy "supersysadmin бүгдийг харна, СӨХ-ны гишүүн өөрийн tenant-аа харна"
  on tenants for select
  using (is_supersysadmin() or id in (select my_tenant_ids()));

create policy "owners: tenant-аараа хязгаарлана"
  on owners for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "real_estate_market_prices: tenant-аараа хязгаарлана"
  on real_estate_market_prices for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "user_roles: өөрийн мөрөө л харна, supersysadmin бүгдийг харна"
  on user_roles for select
  using (is_supersysadmin() or user_id = auth.uid());
