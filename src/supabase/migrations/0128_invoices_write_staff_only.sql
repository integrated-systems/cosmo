-- 2026-09-13 (51): БОДИТ АЮУЛГҮЙ БАЙДЛЫН АЛДАА ЗАСАВ (үргэлжлэл) —
-- invoices_select-ийг зассан ч, резидент хэрэглэгч хэвээр бүх
-- tenant-ийн invoice-ыг харсаар байсныг session simulation-ээр олов.
-- Шалтгаан нь: "invoices_write" policy (cmd='ALL') SELECT-ийг ч
-- хамардаг байсан бөгөөд, түүний нөхцөл ("tenant_id in (select
-- my_tenant_ids())") ЯГ ӨМНӨХ ижил цоорхойтой (role='owner'-ийг
-- ялгадаггүй) байв. PostgreSQL-ийн RLS дор permissive policy-үүд
-- OR-оор нийлдэг тул, invoices_select зассан ч, invoices_write-ийн
-- SELECT-д хамаарах хэсэг цоорхойг үлдээж байсан юм. Одоо
-- "invoices_write"-ийг цэвэр бичих (INSERT/UPDATE/DELETE) 3 тусдаа
-- policy болгож задалж, SELECT-тэй огт давхцахгүй, is_staff_member()
-- ашигладаг болгов.
drop policy if exists "invoices_write" on invoices;

create policy "invoices_insert" on invoices for insert
  with check ((is_supersysadmin() or is_staff_member(tenant_id)) and can_edit_section(tenant_id, 'invoice'));

create policy "invoices_update" on invoices for update
  using ((is_supersysadmin() or is_staff_member(tenant_id)) and can_edit_section(tenant_id, 'invoice'));

create policy "invoices_delete" on invoices for delete
  using ((is_supersysadmin() or is_staff_member(tenant_id)) and can_edit_section(tenant_id, 'invoice'));
