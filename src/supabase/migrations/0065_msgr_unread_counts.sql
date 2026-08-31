-- 2026-08-30: ОЛСОН 2 БОДИТ АЛДАА:
--  1) msgr_list.unread_count ХЭЗЭЭ Ч нэмэгддэггүй байсан (зүгээр
--     staff хуудсаа нээхэд 0 болгож reset хийдэг л байсан) — тул
--     admin Sidebar-ийн badge үүргүй 0 хэвээрээ үлддэг байв.
--  2) unread_count нь STAFF-ийн (owner-ээс ирсэн зурвасны) уншаагүй
--     тоог зориулсан НЭГ л багана байсан ч, OwnerApp-ийн badge ЯГ
--     ЭНЭ АДИЛ баганыг уншдаг байсан тул OWNER-ий өөрийн (staff-аас
--     ирсэн) уншаагүй тоо биш, STAFF-ийн уншаагүй тоог буруу
--     үзүүлдэг байв.
alter table msgr_list add column if not exists owner_unread_count integer not null default 0;

create or replace function public.trg_bump_msgr_unread()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.dir = 'in' then
    -- Owner бичсэн -> STAFF-ийн уншаагүй тоог нэмнэ.
    update msgr_list set unread_count = unread_count + 1, updated_at = now() where id = new.list_id;
  else
    -- Staff бичсэн -> OWNER-ий уншаагүй тоог нэмнэ.
    update msgr_list set owner_unread_count = owner_unread_count + 1, updated_at = now() where id = new.list_id;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_msgr_bump_unread on msgr_messages;
create trigger trg_msgr_bump_unread
  after insert on msgr_messages
  for each row execute function trg_bump_msgr_unread();
