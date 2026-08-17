-- Integrated Systems (Cosmo) — "Хаягжилт тохиргоо" (/addressing) хуудасны
-- Supabase хүснэгэл. Тоот-үүдийн БҮТЭЦ (өмчлөгчгүй ч гэсэн байх ёстой)
-- хадгална — `owners`-аас тусдаа, зөвхөн байршил+хэмжээ.

create table if not exists unit_layouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  building_no int not null,
  entrance_no text not null,
  floor int not null,
  door_no int not null,
  sqm numeric,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, building_no, entrance_no, floor, door_no)
);
create index if not exists unit_layouts_tenant_id_idx on unit_layouts(tenant_id);

alter table unit_layouts enable row level security;

create policy "unit_layouts: tenant-аараа хязгаарлана"
  on unit_layouts for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
