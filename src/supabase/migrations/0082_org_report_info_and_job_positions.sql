-- 2026-09-04: "Санхүүгийн тохиргоо" (finconfig) хуудасны НББ хэсэгт
-- шинэ "Тайланд дуудагдах мэдээлэл" (тврийн тайланд шаардлагатай
-- байгууллагын бүртгэлийн мэдээлэл) болон "Албан тушаал" (ажилтны
-- бүртгэлд ашиглагдах бэлэн жагсаалт) дэд табуудад зориулав.
create table if not exists org_report_info (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  org_name text not null default '',
  activity_direction text not null default '',
  liability_type text not null default '',
  ownership_type text not null default '',
  reg_no text not null default '',
  tax_payer_no text not null default '',
  social_insurance_no text not null default '',
  province text not null default '',
  district text not null default '',
  bag_khoroo text not null default '',
  street text not null default '',
  building text not null default '',
  gate_no text not null default '',
  phone text not null default '',
  mobile text not null default '',
  fax text not null default '',
  email text not null default '',
  website text not null default '',
  ceo_name text not null default '',
  accountant_name text not null default '',
  bank_accounts jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table org_report_info enable row level security;
create policy "staff бүгдийг харна" on org_report_info for select using (true);
create policy "staff бүртгэж, засна" on org_report_info for all using (true) with check (true);

create table if not exists job_positions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table job_positions enable row level security;
create policy "staff бүгдийг харна" on job_positions for select using (true);
create policy "staff бүртгэж, засаж, устгана" on job_positions for all using (true) with check (true);
