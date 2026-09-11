-- 2026-09-09 (37): Ажилтны бүртгэлийн 2-р үе шат — employees
-- хүснэгэл. Хэрэглэгчийн хуучин "suh" системийн жишээ дэлгэцийг
-- үндэслэв. Нэмэгдэл (Хоол/Унаа/Утас) нь ажилтан бүрд ХАМААРАЛТАЙ
-- эсэхийг addition_codes массивт хадгална (тухайн кодтой
-- payroll_addition_settings мөр идэвхтэй бол л тооцооллод орно).
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  last_name text not null,
  first_name text not null,
  parent_name text,
  register_no text not null,
  citizenship text not null default 'Монгол',
  occupation_code text,
  insurer_type text not null default 'social_health' check (insurer_type in ('social_health', 'health_only', 'caregiver_or_contractor', 'pensioner', 'other')),
  civil_reg_no text,
  home_address text,
  position_id uuid references job_positions(id) on delete set null,
  base_salary numeric not null default 0,
  addition_codes text[] not null default '{}',
  deduct_ndsh boolean not null default true,
  ndsh_custom_rate numeric,
  deduct_hhoat boolean not null default true,
  hhoat_custom_rate numeric,
  hire_date date,
  status text not null default 'active' check (status in ('active', 'leave', 'terminated')),
  phone text,
  email text,
  bank text,
  iban text,
  account_no text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists employees_tenant_id_idx on employees(tenant_id);

-- Rule of two: payroll_tax_settings-тэй ИЖИЛ аюулгүй RLS загвар.
alter table employees enable row level security;
create policy "employees_select" on employees for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "employees_write" on employees for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'hrm'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'hrm'));
