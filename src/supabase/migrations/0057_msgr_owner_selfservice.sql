-- 2026-08-27: OwnerApp-д зориулсан бие даасан "Мессенжер" (thread харагдац)
-- хийхийн тулд owner ӨӨРИЙН харилцан ярианд бичих зөвшөөрөл нэмэв. 0056
-- migration зөвхөн staff бичнэ гэж хэт хатуу хязгаарласан байсан — учир нь
-- OwnerApp талд зурвас бичих UI байхгүй гэж таамагласан, гэхдээ "CC
-- Messenger" гэдэг нэрнээс үзэхэд бодит хүсэлт нь ХОЁР ТАЛТ харилцаа
-- байх ёстой. Postgres RLS multiple permissive policy-г OR-оор
-- нэгтгэдэг тул 0056-ийн staff-only policy-г УСТГАХГүй, зүгээр НЭМЖ
-- owner-д зориулсан хязгаарлагдмал (зөвхөн ӨӨРИЙН, зөвхөн dir='in')
-- policy нэмнэ.
create policy "msgr_list: owner uusgej bolno oorii" on msgr_list
  for insert with check (
    is_supersysadmin() or is_staff_member(tenant_id)
    or (
      tenant_id in (select my_tenant_ids())
      and owner_id in (select id from owners where user_id = auth.uid())
    )
  );

create policy "msgr_messages: owner zovhon ooriin list-d dir in bichne" on msgr_messages
  for insert with check (
    is_supersysadmin() or is_staff_member(tenant_id)
    or (
      dir = 'in'
      and list_id in (select id from msgr_list where owner_id in (select id from owners where user_id = auth.uid()))
    )
  );
