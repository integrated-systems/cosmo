-- 2026-09-08: 2 шинэ модуль
--
-- 1) Байршил/Хариуцагч солигдсон түүх — APPEND-ONLY ledger (Депрециаци
--    posting-той адил зарчим: UPDATE/DELETE зөвшөөрөгдөхгүй, зөвхөн
--    шинэ мүр НЭМЭГДДЭГ). EditFixedAssetModal.jsx-ээр хадгалахад
--    location_id/responsible_position_id үнэхээр өөрчлөгдсөн үед л
--    1 мвр бичигдэнэ.
create table if not exists fixed_asset_assignment_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references fixed_assets(id) on delete cascade,
  old_location_id uuid references fixed_asset_locations(id) on delete set null,
  new_location_id uuid references fixed_asset_locations(id) on delete set null,
  old_responsible_position_id uuid references job_positions(id) on delete set null,
  new_responsible_position_id uuid references job_positions(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists fixed_asset_assignment_history_asset_id_idx on fixed_asset_assignment_history(asset_id);
create index if not exists fixed_asset_assignment_history_tenant_id_idx on fixed_asset_assignment_history(tenant_id);

alter table fixed_asset_assignment_history enable row level security;
create policy "fixed_asset_assignment_history: харах/бичих tenant-аараа"
  on fixed_asset_assignment_history for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "fixed_asset_assignment_history: бичих tenant-аараа"
  on fixed_asset_assignment_history for insert
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "fixed_asset_assignment_history: SUPERSYSADMIN устгана"
  on fixed_asset_assignment_history for delete
  using (is_supersysadmin());
-- UPDATE policy огт үгүй -> ямар ч хэрэглэгч засварлаж чадахгүй (append-only).

-- 2) Тооллого (физик инвентаризаци) — QR-аар скандаж "олдсон" гэж
--    тэмдэглэдэг үе шат бүхий систем.
create table if not exists inventory_counts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);
create index if not exists inventory_counts_tenant_id_idx on inventory_counts(tenant_id);

create table if not exists inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  count_id uuid not null references inventory_counts(id) on delete cascade,
  asset_id uuid not null references fixed_assets(id) on delete cascade,
  found boolean not null default false,
  found_at timestamptz,
  unique(count_id, asset_id)
);
create index if not exists inventory_count_items_count_id_idx on inventory_count_items(count_id);
create index if not exists inventory_count_items_tenant_id_idx on inventory_count_items(tenant_id);

alter table inventory_counts enable row level security;
create policy "inventory_counts: tenant-аараа хязгаарлана"
  on inventory_counts for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

alter table inventory_count_items enable row level security;
create policy "inventory_count_items: tenant-аараа хязгаарлана"
  on inventory_count_items for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

-- Тооллого эхлүүлэх — тухайн үеийн ИДЭВХТЭЙ (актлагдаагүй) бүх
-- хөрөнгийг олдоогүй гэж үзэн жагсаалт үүсгэнэ. Нэг tenant-д зэрэг 2
-- идэвхтэй тооллого явуулахыг хориглоно.
create or replace function public.start_inventory_count(p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_count_id uuid;
begin
  if not (is_supersysadmin() or p_tenant_id in (select my_tenant_ids())) then
    raise exception 'Хандах эрхгүй';
  end if;

  if exists (select 1 from inventory_counts where tenant_id = p_tenant_id and status = 'in_progress') then
    raise exception 'Идэвхтэй тооллого аль хэдийн явж байна';
  end if;

  insert into inventory_counts (tenant_id) values (p_tenant_id) returning id into v_count_id;

  insert into inventory_count_items (tenant_id, count_id, asset_id)
  select p_tenant_id, v_count_id, id from fixed_assets
  where tenant_id = p_tenant_id and status <> 'written_off';

  return v_count_id;
end;
$function$;

grant execute on function public.start_inventory_count(uuid) to authenticated;
