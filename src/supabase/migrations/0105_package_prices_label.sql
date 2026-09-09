-- 2026-09-08 (20): Багц сонголтын 5 газар (Бүртгэл үүсгэх,
-- Tenant Status, Топбарын "Багц ахиулах", EditTenantModal, Billing)
-- 3 өөр эх сурвалжтай (`data/plans.js` hardcode vs `package_prices`),
-- key нэрсийн зөрүү үүссэн (`starter` vs `basic`, `premium_plus`
-- data/plans.js-д огт байхгүй байсан) — package_prices-ыг ЦОРЫН ГАНЦ
-- эх сурвалж болгож нэгтгэв. label багана нэмж, харагдах нэрийг ч
-- энд хадгална (Rule of two — display нэр 3 дахин хуулбарлагдахгүй).
alter table package_prices add column if not exists label text;
update package_prices set label = 'Basic' where plan_key = 'basic';
update package_prices set label = 'Standard' where plan_key = 'standard';
update package_prices set label = 'Premium' where plan_key = 'premium';
update package_prices set label = 'Premium+' where plan_key = 'premium_plus';
alter table package_prices alter column label set not null;
