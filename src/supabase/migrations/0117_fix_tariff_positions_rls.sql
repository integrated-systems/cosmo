-- 2026-09-09 (40): АЮУЛГҮЙ БАЙДЛЫН АЛДАА ЗАСАВ — tariff_items,
-- job_positions хүснэгэлийн RLS policy үнэн хэрэгтээ "qual: true"
-- (бүрэн нээлттэй, tenant-ийн ялгааг огт шалгадаггүй) байсныг
-- олов — ямар ч tenant-ийн хэрэглэгч бусад БҮХ tenant-ийн Тариф,
-- Албан тушаалын мэдээллийг унших, БИЧИХ ч чадах байсан. unit_
-- layouts/payroll_tax_settings-тэй ижил аюулгүй загвараар сольв.
--
-- Тэмдэглэл: policyname-д кирилл үсэг (олон байт) орсноос шалтгаалж
-- заримдаа тэгш үгүйсгэлтэй "drop policy IF EXISTS <нэр>" statement
-- бодит нэртэй яг таарахгүй байх эрсдэлтэй (identifier truncation
-- г.м. шалтгаанаар) тул динамик do-block ашиглан pg_policy-с
-- ЯГ "qual = 'true'" гэсэн policy-г олж, эцсийн байдлаар устгав.
do $$
declare
  r record;
begin
  for r in
    select c.relname as tbl, p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    where c.relname in ('job_positions', 'tariff_items')
      and pg_get_expr(p.polqual, p.polrelid) = 'true'
  loop
    execute format('drop policy %I on %I', r.polname, r.tbl);
  end loop;
end $$;

create policy "tariff_items_select" on tariff_items for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "tariff_items_write" on tariff_items for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_tariff'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_tariff'));

create policy "job_positions_select" on job_positions for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "job_positions_write" on job_positions for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'finconfig_nbb'));
