-- 2026-09-26 (89): ЧУХАЛ АЛДАА ЗАСАВ — expense_subcategories/
-- reserve_fund_categories-ийн RLS policy (зөвхөн tenant_users
-- шалгадаг) нь SUPERSYSADMIN эрхийг ХАСАЖ үлдээж байсныг олов
-- (супөрсисадмин tenant_users-д бүртгэлтэй БАЙХ ШААРДЛАГАГҮй, харин
-- is_supersysadmin() функцээр танигддаг). income_subcategories-ийн
-- ЯГ ИЖИЛ, батлагдсан загвараар (is_supersysadmin() OR (tenant
-- гишүүнчлэл AND can_edit_section)) солив.
drop policy if exists expense_subcategories_select on expense_subcategories;
drop policy if exists expense_subcategories_insert on expense_subcategories;
drop policy if exists expense_subcategories_update on expense_subcategories;
drop policy if exists expense_subcategories_delete on expense_subcategories;

create policy expense_subcategories_select on expense_subcategories for select
  using (is_supersysadmin() or (tenant_id in (select my_tenant_ids())));
create policy expense_subcategories_write on expense_subcategories for all
  using (is_supersysadmin() or ((tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb')))
  with check (is_supersysadmin() or ((tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb')));

drop policy if exists reserve_fund_categories_select on reserve_fund_categories;
drop policy if exists reserve_fund_categories_insert on reserve_fund_categories;
drop policy if exists reserve_fund_categories_update on reserve_fund_categories;
drop policy if exists reserve_fund_categories_delete on reserve_fund_categories;

create policy reserve_fund_categories_select on reserve_fund_categories for select
  using (is_supersysadmin() or (tenant_id in (select my_tenant_ids())));
create policy reserve_fund_categories_write on reserve_fund_categories for all
  using (is_supersysadmin() or ((tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb')))
  with check (is_supersysadmin() or ((tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb')));
