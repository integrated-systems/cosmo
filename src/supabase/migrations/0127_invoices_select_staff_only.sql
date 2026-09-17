-- 2026-09-13 (50): БОДИТ АЮУЛГҮЙ БАЙДЛЫН АЛДАА ЗАСАВ — Резидент
-- (UserApp) хэрэглэгчийн эрхээр session simulation хийж байхад олов:
-- invoices_select policy (0119, 0126 migration) "my_tenant_ids()"
-- ашигладаг байсан бөгөөд, энэ функц АЛИВ user_roles мөрийг (тэр
-- дундаа role='owner', резидентийн мөр) ЯЛГАЛГҮЙ тухайн tenant-д
-- хамааруулдаг байсныг олов — үүнээс болж РЕЗИДЕНТ (role='owner')
-- ХЭРЭГЛЭГЧ БҮХ tenant-ийн БҮХ өмчлэгчийн нэхэмжлэхийг харж чаддаг
-- байсан (аюулгүй байдлын ноцтой цоорхой). msgr_list-ийн ашигладаг
-- "is_staff_member()" функц (role <> 'owner' гэж тодорхой ялгадаг)-
-- ыг ашиглаж, зөвхөн жинхэнэ АЖИЛТАН (staff) бүх tenant-ийн invoice-
-- ыг харах, резидент бол зөвхөн өөрийнхөө target_id-той invoice-ыг л
-- харах эрхтэй болгож зассан.
drop policy if exists "invoices_select" on invoices;
create policy "invoices_select" on invoices for select
  using (
    is_supersysadmin()
    or is_staff_member(tenant_id)
    or (target_type = 'owner' and target_id = public.my_owner_invoice_target_id())
  );
