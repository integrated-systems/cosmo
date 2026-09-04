-- 2026-09-04 (12): ЕрӨӨнхий, дахин ашиглагдах "section lock" систем -
-- тенант бүр, тохиргооны хуудсан дэх таб бүрээр (section_key)
-- Open/Delegated/Locked гэсэн 3 тврийн байдал зохицуулна. Зөвхөн
-- Frontend БИШ, RLS дээр нь мвн шалгалт хийж, техникийн мэдлэгтэй
-- хэрэглэгч ч тохиргоог "хаалттай" үед өөрчилж чадахгүй байхаар
-- хамгаална.
create table if not exists tenant_locked_sections (
  tenant_id uuid not null references tenants(id) on delete cascade,
  section_key text not null,
  state text not null default 'open' check (state in ('open', 'delegated', 'locked')),
  delegated_to uuid references auth.users(id) on delete set null,
  locked_by uuid references auth.users(id) on delete set null,
  locked_at timestamptz,
  primary key (tenant_id, section_key)
);

alter table tenant_locked_sections enable row level security;

create policy "бүгд харна" on tenant_locked_sections for select using (true);

create policy "зөвхөн supersysadmin бичнэ" on tenant_locked_sections for insert
  with check (is_supersysadmin());

create policy "зөвхөн supersysadmin засна" on tenant_locked_sections for update
  using (is_supersysadmin());

create policy "зөвхөн supersysadmin устгана" on tenant_locked_sections for delete
  using (is_supersysadmin());

-- Төрлөрсөн RPC функц - бүх холбогдох хүснэгэлийн INSERT/UPDATE/DELETE
-- policy-д дуудагдана. Шинэ тохиргооны хуудас нэмэх бүрд зөвхөн
-- өврийн section_key-гээ сонгоод, энэ функцийг л дуудна.
create or replace function can_edit_section(p_tenant_id uuid, p_section_key text)
returns boolean language sql stable security definer as $$
  select
    is_supersysadmin()
    or
    not exists (select 1 from tenant_locked_sections where tenant_id = p_tenant_id and section_key = p_section_key)
    or
    (select state from tenant_locked_sections where tenant_id = p_tenant_id and section_key = p_section_key) = 'open'
    or
    (
      (select state from tenant_locked_sections where tenant_id = p_tenant_id and section_key = p_section_key) = 'delegated'
      and (select delegated_to from tenant_locked_sections where tenant_id = p_tenant_id and section_key = p_section_key) = auth.uid()
    );
$$;

-- basement_floors ("Зогсоол, Агуулах, Талбай" - section_key: 'addressing_grid')
drop policy if exists "basement_floors: staff бүгдийг харж удирдана" on basement_floors;

create policy "basement_floors: staff бүгдийг харна" on basement_floors for select
  using (is_supersysadmin() or is_staff_member(tenant_id));

create policy "basement_floors: staff засна (цоожгүй үед)" on basement_floors for insert
  with check ((is_supersysadmin() or is_staff_member(tenant_id)) and can_edit_section(tenant_id, 'addressing_grid'));

create policy "basement_floors: staff өөрчилнэ (цоожгүй үед)" on basement_floors for update
  using ((is_supersysadmin() or is_staff_member(tenant_id)) and can_edit_section(tenant_id, 'addressing_grid'));

create policy "basement_floors: staff устгана (цоожгүй үед)" on basement_floors for delete
  using ((is_supersysadmin() or is_staff_member(tenant_id)) and can_edit_section(tenant_id, 'addressing_grid'));

-- unit_layouts ("Тоот" - section_key: 'addressing_units')
drop policy if exists "unit_layouts: tenant-аараа хязгаарлана" on unit_layouts;

create policy "unit_layouts: tenant-аараа харна" on unit_layouts for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "unit_layouts: staff засна (цоожгүй үед)" on unit_layouts for insert
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'addressing_units'));

create policy "unit_layouts: staff өөрчилнэ (цоожгүй үед)" on unit_layouts for update
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'addressing_units'));

create policy "unit_layouts: staff устгана (цоожгүй үед)" on unit_layouts for delete
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'addressing_units'));
