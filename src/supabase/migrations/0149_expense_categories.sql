-- 2026-09-24 (83): Хэрэглэгчийн хүсэлтээр "Орлогын ангилал"/
-- "Зарлагын ангилал" гэсэн мэргэжлийн нягтлангийн шаардлагад
-- нийцсэн 2 дэд таб үүсгэнэ — ангилал бүрийг тодорхой ДАНСАНД
-- (chart_of_accounts) холбоно. Одоо байгаа "Орлогын дэд ангилал"
-- (income_subcategories, зөвхөн чөлөөт текст, үргэлж 5610 лүү
-- ордог байсан) үүнд НЭГТГЭГДЭНЭ.
alter table income_subcategories add column if not exists account_code text;
update income_subcategories set account_code = '5610' where account_code is null;

create table if not exists expense_subcategories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  account_code text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table expense_subcategories enable row level security;

create policy expense_subcategories_select on expense_subcategories for select
  using (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));
create policy expense_subcategories_insert on expense_subcategories for insert
  with check (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));
create policy expense_subcategories_update on expense_subcategories for update
  using (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));
create policy expense_subcategories_delete on expense_subcategories for delete
  using (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));
