-- 2026-09-09 (36): Ажилтны бүртгэлийн 1-р үе шат — НББ тохиргооны
-- "Цалин - Татвар, шимтгэл" болон "Цалин - Нэмэгдэл" таб (FinConfig.jsx,
-- одоог хүртэл InProgress placeholder байсан). Хэрэглэгчийн хуучин
-- "suh" системийн жишээ дэлгэцийг үндэслэв. Дансны төлөвлөгөө
-- (chart of accounts) БОДИТООР хараахан бий болоогүй (Нягтлан бодох
-- бүртгэл модуль өөрөө PageInProgress) тул "Суурь данс"/"Зарлагын
-- данс"-ыг тусдаа хүснэгэл БИШ, энгийн текст (жиш "7010") гэж
-- хадгална — журналын бичилт хараахан автоматжаагүй тул зөвхөн
-- тооцооллын тохиргоо гэдгийг тодорхой заасан (screenshot-той адил).
create table if not exists payroll_tax_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  calc_type text not null default 'simple' check (calc_type in ('simple', 'two_party', 'progressive')),
  rate_pct numeric,
  employee_rate_pct numeric,
  employer_rate_pct numeric,
  brackets jsonb,
  base_account text,
  is_active boolean not null default true,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists payroll_tax_settings_tenant_id_idx on payroll_tax_settings(tenant_id);

create table if not exists payroll_addition_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  frequency text not null default 'monthly' check (frequency in ('monthly', 'quarterly', 'yearly')),
  amount numeric not null default 0,
  expense_account text,
  taxable_incometax boolean not null default true,
  taxable_socialins boolean not null default true,
  is_active boolean not null default true,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists payroll_addition_settings_tenant_id_idx on payroll_addition_settings(tenant_id);

-- Rule of two: unit_layouts-той ИЖИЛ, аюулгүй RLS загвар (is_supersysadmin()
-- OR my_tenant_ids(), бичихэд нэмэлт can_edit_section() шалгалттай — энэ
-- хуудасны section key нь SectionLockBadge-д аль хэдийн 'finconfig_nbb'
-- гэж тодорхойлогдсон байсан).
alter table payroll_tax_settings enable row level security;
create policy "pts_select" on payroll_tax_settings for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "pts_write" on payroll_tax_settings for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'));

alter table payroll_addition_settings enable row level security;
create policy "pas_select" on payroll_addition_settings for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "pas_write" on payroll_addition_settings for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'));

-- Одоо байгаа бүх tenant-д Монгол Улсын хуулиар тогтоосон үндсэн
-- үзүүлэлтүүдийг (НДШ, ХХОАТ) урьдчилан бөглөж өгөв.
insert into payroll_tax_settings (tenant_id, code, name, calc_type, employee_rate_pct, employer_rate_pct, base_account, sort_order)
select id, 'ndsh', 'Нийгмийн даатгалын шимтгэл (НДШ)', 'two_party', 11.5, 12.5, '7010', 1
from tenants
on conflict (tenant_id, code) do nothing;

insert into payroll_tax_settings (tenant_id, code, name, calc_type, rate_pct, base_account, sort_order)
select id, 'hhoat', 'Хувь хүний орлогын албан татвар (ХХОАТ)', 'simple', 10, '7010', 2
from tenants
on conflict (tenant_id, code) do nothing;

insert into payroll_addition_settings (tenant_id, code, name, frequency, amount, expense_account, taxable_incometax, taxable_socialins, sort_order)
select id, 'annualbonus', 'Шагналт цалин', 'yearly', 0, '7010', true, true, 1
from tenants
on conflict (tenant_id, code) do nothing;

insert into payroll_addition_settings (tenant_id, code, name, frequency, amount, expense_account, taxable_incometax, taxable_socialins, sort_order)
select id, 'meal', 'Хоолны мөнгө', 'monthly', 0, '7011', true, true, 2
from tenants
on conflict (tenant_id, code) do nothing;

insert into payroll_addition_settings (tenant_id, code, name, frequency, amount, expense_account, taxable_incometax, taxable_socialins, sort_order)
select id, 'transport', 'Унааны мөнгө', 'monthly', 0, '7012', true, true, 3
from tenants
on conflict (tenant_id, code) do nothing;

insert into payroll_addition_settings (tenant_id, code, name, frequency, amount, expense_account, taxable_incometax, taxable_socialins, sort_order)
select id, 'phone', 'Утасны мөнгө', 'monthly', 0, '7013', true, true, 4
from tenants
on conflict (tenant_id, code) do nothing;
