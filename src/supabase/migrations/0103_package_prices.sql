-- 2026-09-08 (17): Billing хуудас — багц бүрийн НЭГ ТООТОД ногдох
-- сарын үнэ. tenant бүрийн сарын төлбөр = price_per_unit × (тухайн
-- tenant-ийн бүртгэлтэй тоотын тоо, owners хүснэгэлээс COUNT).
-- Ангилал/Терел, package_features-тэй ижил зарчим — ГЛОБАЛ, зөвхөн
-- SUPERSYSADMIN бичнэ.
create table if not exists package_prices (
  plan_key text primary key,
  price_per_unit numeric not null default 0
);

alter table package_prices enable row level security;
create policy "package_prices: SUPERSYSADMIN л бичнэ"
  on package_prices for all
  using (is_supersysadmin())
  with check (is_supersysadmin());
create policy "package_prices: бүгд харна"
  on package_prices for select
  using (true);

insert into package_prices (plan_key, price_per_unit) values
('basic', 0),
('standard', 1100),
('premium', 3200),
('premium_plus', 5500)
on conflict (plan_key) do nothing;
