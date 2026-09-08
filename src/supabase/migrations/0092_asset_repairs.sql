-- 2026-09-08: "Засвар, үйлчилгээ" таб — Үндсэн хөрөнгө дээр хийсэн
-- засвар үйлчилгээний бүртгэл (Clientele/Owners-той адил tenant-
-- хамгаалалттай CRUD хүснэгэл).
create table if not exists asset_repairs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references fixed_assets(id) on delete cascade,
  repair_date date not null default current_date,
  amount numeric not null default 0,
  description text,
  provider_org text,
  created_at timestamptz not null default now()
);
create index if not exists asset_repairs_tenant_id_idx on asset_repairs(tenant_id);
create index if not exists asset_repairs_asset_id_idx on asset_repairs(asset_id);

alter table asset_repairs enable row level security;
create policy "asset_repairs: tenant-аараа хязгаарлана"
  on asset_repairs for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
