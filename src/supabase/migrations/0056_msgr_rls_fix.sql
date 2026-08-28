-- 2026-08-27: OwnerApp bento дизайны Мессенжер badge холбох явцад ОЛСОН
-- ноцтой RLS цоорхой (owners/restmarket-тэй адил зүй тогтол) — "msgr_list"
-- болон "msgr_messages" хүснэгэл "for all ... tenant-аараа хязгаарлана"
-- гэсэн НЭГ policy-тэй байсан тул ердийн 'owner' role-той резидент ч
-- гэсэн СүХ-ийн БүХ бусад оршин суугчийн ХУВИЙН зурвасыг (staff-тай
-- хийсэн харилцан яриаг) шууд REST API-аар уншиж чадах эрсдэлтэй байв.
-- Одоо: staff бүгдийг харна/бичнэ (Msgr.jsx удирдлагын интерфэйс),
-- owner ЗӨВХӨН ӨӨРИЙН харилцан ярианы мврийг л харна (бичихгүй —
-- OwnerApp талд одоогоор зурвас бичих UI байхгүй, зөвхөн уншина).
--
-- Policy нэрийг Latin үсгээр бичив (0055 migration-ий адил шалтгаанаар:
-- энэ хүснэглүүдийн policy нэр Кирилл хэвээрээ deploy хийгдсэн ч,
-- ирээдүйд ижил төрлийн зөрчлөөс сэргийлэх зорилгоор шинэ policy-г
-- Latin-аар нэрлэв).
drop policy if exists "msgr_list: tenant-аараа хязгаарлана" on msgr_list;
drop policy if exists "msgr_messages: tenant-аараа хязгаарлана" on msgr_messages;

create policy "msgr_list: staff bugdiig harna, owner zovhon ooriigoo" on msgr_list
  for select using (
    is_supersysadmin() or is_staff_member(tenant_id)
    or owner_id in (select id from owners where user_id = auth.uid())
  );
create policy "msgr_list: staff l uusgene" on msgr_list
  for insert with check (is_supersysadmin() or is_staff_member(tenant_id));
create policy "msgr_list: staff l shinechilne" on msgr_list
  for update using (is_supersysadmin() or is_staff_member(tenant_id))
  with check (is_supersysadmin() or is_staff_member(tenant_id));
create policy "msgr_list: staff l ustgana" on msgr_list
  for delete using (is_supersysadmin() or is_staff_member(tenant_id));

create policy "msgr_messages: staff bugdiig harna, owner zovhon ooriinh" on msgr_messages
  for select using (
    is_supersysadmin() or is_staff_member(tenant_id)
    or list_id in (select id from msgr_list where owner_id in (select id from owners where user_id = auth.uid()))
  );
create policy "msgr_messages: staff l uusgene" on msgr_messages
  for insert with check (is_supersysadmin() or is_staff_member(tenant_id));
create policy "msgr_messages: staff l shinechilne" on msgr_messages
  for update using (is_supersysadmin() or is_staff_member(tenant_id))
  with check (is_supersysadmin() or is_staff_member(tenant_id));
create policy "msgr_messages: staff l ustgana" on msgr_messages
  for delete using (is_supersysadmin() or is_staff_member(tenant_id));
