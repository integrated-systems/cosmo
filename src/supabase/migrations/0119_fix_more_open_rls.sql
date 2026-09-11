-- 2026-09-09 (42): Системтэй шалгахад "qual: true" (бүрэн нээлттэй)
-- бас 6 хүснэгэлд байгааг олов — үүнээс invoices/invoice_items
-- бол БОДИТ САНХүүГИЙН МЭДЭЭЛЭЛ (аль ч tenant-ийн хэрэглэгч бусад
-- БүХ tenant-ийн нэхэмжлэхийг унших, бичих ч чадаж байсан).
--
-- Тэмдэглэл: fin_settings/org_report_info-ийн бичих эрхийг
-- can_edit_section(tenant_id,'finconfig_nbb') болгосноор, аль
-- хэдийн 'finconfig_nbb'-г ЦООЖИЛСОН tenant (Хүннү 2222 Резиденс)
-- эдгээр 2 хүснэгэлд ч БИЧИХ боломжгүй БОЛНО — энэ бол цоожны
-- анхны зорилготой нийцсэн, зөв чангаруулалт (өмнө нь цоож дутуу
-- хамардаг байсан цоорхойг хаав), гэхдээ бодит үр дагавартай тул
-- тэмдэглэв.
do $$
declare
  r record;
begin
  for r in
    select c.relname as tbl, p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    where c.relname in ('invoices', 'invoice_items', 'fin_settings', 'org_report_info', 'fixed_asset_categories', 'fixed_asset_types')
      and (pg_get_expr(p.polqual, p.polrelid) = 'true' or pg_get_expr(p.polwithcheck, p.polrelid) = 'true')
  loop
    execute format('drop policy %I on %I', r.polname, r.tbl);
  end loop;
end $$;

-- invoices, invoice_items ("Нэхэмжлэх" цэс, key='invoice')
create policy "invoices_select" on invoices for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "invoices_write" on invoices for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'invoice'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'invoice'));

create policy "invoice_items_select" on invoice_items for select
  using (exists (
    select 1 from invoices i
    where i.id = invoice_items.invoice_id
      and (is_supersysadmin() or i.tenant_id in (select my_tenant_ids()))
  ));
create policy "invoice_items_write" on invoice_items for all
  using (exists (
    select 1 from invoices i
    where i.id = invoice_items.invoice_id
      and (is_supersysadmin() or i.tenant_id in (select my_tenant_ids()))
      and can_edit_section(i.tenant_id, 'invoice')
  ))
  with check (exists (
    select 1 from invoices i
    where i.id = invoice_items.invoice_id
      and (is_supersysadmin() or i.tenant_id in (select my_tenant_ids()))
      and can_edit_section(i.tenant_id, 'invoice')
  ));

-- fin_settings, org_report_info (Санхүүгийн тохиргоо -> НББ бүлэг, key='finconfig_nbb')
create policy "fin_settings_select" on fin_settings for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "fin_settings_write" on fin_settings for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'));

create policy "org_report_info_select" on org_report_info for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "org_report_info_write" on org_report_info for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'));

-- fixed_asset_categories, fixed_asset_types (Үндсэн хөрөнгө тохиргоо, key='fixedassconfig')
create policy "fixed_asset_categories_select" on fixed_asset_categories for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "fixed_asset_categories_write" on fixed_asset_categories for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'fixedassconfig'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'fixedassconfig'));

create policy "fixed_asset_types_select" on fixed_asset_types for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "fixed_asset_types_write" on fixed_asset_types for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'fixedassconfig'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'fixedassconfig'));
