-- 2026-09-04: "Санхүүгийн тохиргоо" (finconfig) хуудасны Тариф хэсэгт
-- зориулсан үндсэн хүснэгэл. Хуучин, тусдаа "НББ тохиргоо"/"Тариф
-- тохиргоо" (accconfig/paymentconfig) 2 меню нэгтгэгдэж, энэ 1
-- хүснэгэл дор эхэлнэ.
create table if not exists tariff_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category text not null check (category in ('owner', 'client')), -- owner = Сууц өмчлөгч, client = ААН
  name text not null,
  calc_method text not null check (calc_method in ('count', 'area', 'fixed')), -- тоогоор / м2-аар / тогтмол
  amount numeric not null default 0,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tariff_items enable row level security;

create policy "staff бүгдийг харна" on tariff_items for select
  using (true);

create policy "staff бүртгэж, засаж, устгана" on tariff_items for all
  using (true) with check (true);
-- updated_at-г тусдаа DB trigger биш, апп кодоос UPDATE хийх бүрд
-- шууд бичдэг байдлаар хийнэ (ерөнхий reusable trigger функц
-- одоогоор байхгүй тул).
