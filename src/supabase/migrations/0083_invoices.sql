-- 2026-09-04 (6): "СӨХ төлбөрийн нэхэмжлэх үүсгэх" функцийн үндсэн
-- бүтэц. tariff_items-д "applies_to" нэмж, тарифын мвр бүр ЯГ ЮУГ
-- (тоот өөрвө, зогсоол, агуулах, талбай)-ыг тоолж/хэмждэгийг
-- тодорхой болгов (эс үгүй бол тооцооллын хүдэлгүүр алдаатай болно).
alter table tariff_items add column if not exists applies_to text not null default 'unit' check (applies_to in ('unit', 'parking', 'storage', 'land'));

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  target_type text not null check (target_type in ('owner', 'client')),
  target_id uuid not null,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  total_amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'at_risk')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (tenant_id, target_type, target_id, period_year, period_month)
);

alter table invoices enable row level security;
create policy "staff бүгдийг харна" on invoices for select using (true);
create policy "staff бүртгэж, засаж, устгана" on invoices for all using (true) with check (true);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  tariff_item_id uuid references tariff_items(id) on delete set null,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  amount numeric not null default 0
);

alter table invoice_items enable row level security;
create policy "staff бүгдийг харна" on invoice_items for select using (true);
create policy "staff бүртгэж, засаж, устгана" on invoice_items for all using (true) with check (true);
