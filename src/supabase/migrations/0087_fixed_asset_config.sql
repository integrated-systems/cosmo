-- 2026-09-07: "Үндсэн хөрөнгө тохиргоо" (/fixedassconfig, СИСАДМИН) хуудас
-- — Ангилал/Терел/Байршил лавлах хүснэгэлүүд. Категори бүр төрлийн
-- анхдагч ашиглах хугацаа/элэгдэл аргачлалыг агуулна (шинэ хөрөнгө
-- нэмэх үед автоматаар санал болно). Терел категорид харьяалагдана
-- (1 category -> N type).
--
-- fixed_assets хүснэгэлийн чөлөөт текст category/location баганыг
-- БүРЭН арилгаж, тэдгээрийн оронд лавлах хүснэгэлүүд рүү заасан FK
-- баганаар сольсон (Simplicity is everything — хуучирсан текст баганыг
-- патчлахгүй, шууд зөв бүтцээр сольсон).
create table if not exists fixed_asset_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  code text,
  default_useful_life_months integer not null default 48,
  default_depreciation_method text not null default 'straight_line' check (default_depreciation_method in ('straight_line', 'accelerated')),
  created_at timestamptz not null default now()
);
create index if not exists fixed_asset_categories_tenant_id_idx on fixed_asset_categories(tenant_id);
alter table fixed_asset_categories enable row level security;
create policy "fixed_asset_categories: tenant-аараа хязгаарлана"
  on fixed_asset_categories for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create table if not exists fixed_asset_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category_id uuid not null references fixed_asset_categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists fixed_asset_types_tenant_id_idx on fixed_asset_types(tenant_id);
create index if not exists fixed_asset_types_category_id_idx on fixed_asset_types(category_id);
alter table fixed_asset_types enable row level security;
create policy "fixed_asset_types: tenant-аараа хязгаарлана"
  on fixed_asset_types for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create table if not exists fixed_asset_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists fixed_asset_locations_tenant_id_idx on fixed_asset_locations(tenant_id);
alter table fixed_asset_locations enable row level security;
create policy "fixed_asset_locations: tenant-аараа хязгаарлана"
  on fixed_asset_locations for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

-- fixed_assets: чөлөөт текст category/location-ыг лавлах хүснэгэлийн
-- FK-аар сольж, борлуулагч байгууллага + элэгдлийн тооцооллын шинэ
-- талбаруудыг нэмэв. disposal_date (ашиглалтаас гарах огноо) нь
-- acquired_date + useful_life_months-с ЦОРЫН ГАНЦ эх сурвалжаас
-- generated column-оор тооцогдоно (клиент тал дахин тооцохгүй).
alter table fixed_assets drop column if exists category;
alter table fixed_assets drop column if exists location;
alter table fixed_assets add column if not exists category_id uuid references fixed_asset_categories(id) on delete set null;
alter table fixed_assets add column if not exists type_id uuid references fixed_asset_types(id) on delete set null;
alter table fixed_assets add column if not exists location_id uuid references fixed_asset_locations(id) on delete set null;
alter table fixed_assets add column if not exists seller_org text;
alter table fixed_assets add column if not exists useful_life_months integer;
alter table fixed_assets add column if not exists depreciation_method text check (depreciation_method in ('straight_line', 'accelerated'));
alter table fixed_assets add column if not exists salvage_value numeric not null default 0;
alter table fixed_assets drop column if exists disposal_date;
alter table fixed_assets add column disposal_date date generated always as (
  case when acquired_date is not null and useful_life_months is not null
    then (acquired_date + make_interval(months => useful_life_months))::date
    else null
  end
) stored;

create index if not exists fixed_assets_category_id_idx on fixed_assets(category_id);
create index if not exists fixed_assets_type_id_idx on fixed_assets(type_id);
create index if not exists fixed_assets_location_id_idx on fixed_assets(location_id);
