-- 2026-08-30: ОЛСОН НОЦТОЙ АЛДАА — "msgr_list: staff l shinechilne"
-- гэсэн UPDATE policy нь ЗӨВХӨН staff-д л үйлчилдэг байсан, owner-т
-- msgr_list мвр (тухайлбал өврийн owner_unread_count)-ийг UPDATE
-- хийх ЭРХ ОГТ байхгүй байв. Supabase JS клиент RLS-ээс болж 0 мвр
-- үйлчилсэн үед алдаа шидэхгүй тул энэ нь ЧИМЭЭГүй бүтэлгүйтдэг байсан
-- — иймээс OwnerMsgrThread.jsx-ийн "owner_unread_count=0" reset хэзээ
-- ч бодитоор бичигдээгүй байв.
create policy "msgr_list: owner updates own row"
on msgr_list for update
using (owner_id in (select id from owners where user_id = auth.uid()))
with check (owner_id in (select id from owners where user_id = auth.uid()));
