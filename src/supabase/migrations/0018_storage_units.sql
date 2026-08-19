-- Integrated Systems (Cosmo) — Агуулахын дугаарлалт (/addressing,
-- "Агуулах" таб). 2026-08-19 хэрэглэгч тодорхой заасны дагуу
-- parking_spots-той ЯГ ИЖИЛ бvтэц/зарчим (дугаарлах систем адил) —
-- tenant (хотхон) даяар нэг нийтлэг сан, байртай холбоогvй.
create table if not exists storage_units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  floor_level text not null,
  zone_label text not null,
  separator text not null default '',
  spot_no integer not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, floor_level, zone_label, spot_no)
);
create index if not exists storage_units_tenant_id_idx on storage_units(tenant_id);

alter table storage_units enable row level security;

create policy "storage_units: tenant-аараа хязгаарлана"
  on storage_units for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
