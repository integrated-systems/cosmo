-- 2026-09-25 (86): Хэрэглэгчийн хүсэлтээр "Хуримтлалын сан"-г
-- зориулалтаар (Ариутгалын зардлын хуримтлал, Их засварын хуримтлал,
-- Лифт засварын хуримтлал г.м — хотхон бүрийн онцлогоос хамаарна)
-- ангилж, нэмэх/устгах боломжтой жагсаалт болгоно.
create table if not exists reserve_fund_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  monthly_amount numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table reserve_fund_categories enable row level security;

create policy reserve_fund_categories_select on reserve_fund_categories for select
  using (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));
create policy reserve_fund_categories_insert on reserve_fund_categories for insert
  with check (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));
create policy reserve_fund_categories_update on reserve_fund_categories for update
  using (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));
create policy reserve_fund_categories_delete on reserve_fund_categories for delete
  using (tenant_id in (select tenant_id from tenant_users where user_id = auth.uid()));
