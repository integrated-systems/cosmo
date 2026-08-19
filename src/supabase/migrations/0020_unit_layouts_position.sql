-- Integrated Systems (Cosmo) — 2026-08-19: "Тоот, Зогсоол, Агуулах"
-- хуудсанд тоотуудын дараалал vе vе солигдож харагдах алдааны vндэс:
-- door_no (тоотын дугаар/шошго) ба ДЭЛГЭЦ ДЭЭРХ БАЙРЛАЛ (баганы дараалал)
-- хоёрыг ижилсvvлж, дугаараар эрэмбэлж байсан нь буруу таамаглал байв.
-- Хэрэглэгч тодорхой заасны дагуу эдгээрийг тусгаарлав: `position` нь
-- СИСАДМИН AddressConfig дээр анх vvсгэсэн ЗvvНЭЭС БАРУУН зохион
-- байгуулалтыг л хадгална, дугаар (door_no) хожим өвчлөгдсөн ч
-- (дахин нэрлэгдсэн ч) БАЙРЛАЛ хвдлвхгvй.
alter table unit_layouts add column if not exists position integer;

-- Одоо байгаа мврvvдийг (тухайн vеийн door_no vнэн звв дараалалтай
-- тохирч байсан тул) door_no-оор эрэмбэлж backfill хийв.
with ranked as (
  select id, row_number() over (partition by tenant_id, building_no, entrance_no, floor order by door_no) - 1 as pos
  from unit_layouts
)
update unit_layouts u
set position = r.pos
from ranked r
where u.id = r.id;

alter table unit_layouts alter column position set not null;
alter table unit_layouts alter column position set default 0;
