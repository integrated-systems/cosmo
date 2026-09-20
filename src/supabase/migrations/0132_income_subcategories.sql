-- 2026-09-13 (55): "Орлогын дэд ангилал" (НББ таб) хvснэгэлийн "Vйлдэл"
-- баганын Засах/Устгах товч ажиллахгүй байсныг хэрэглэгч олов —
-- шалтгаан нь бодит DB хүснэгэл огт байгаагүй, INCOME_CATEGORIES
-- зөвхөн HARDCODED статик массив, товчнууд `disabled` байсан
-- (тайлбар: "НББ модуль хийгдсэний дараа идэвхжинэ"). Одоо жинхэнэ,
-- tenant тус бүр өөрсдийн жагсаалттай (анхны 10 нэрээр автоматаар
-- үрждэг) хүснэгэл болгож бүрэн ажиллагаатай болгоно.
create table income_subcategories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table income_subcategories enable row level security;

create policy "income_subcategories_select" on income_subcategories for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "income_subcategories_write" on income_subcategories for all
  using (is_supersysadmin() or (tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'finconfig_nbb')))
  with check (is_supersysadmin() or (tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'finconfig_nbb')));
