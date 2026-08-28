-- 2026-08-27: Хэрэглэгчийн зурган хүснэгэсээр НАРИЙВЧЛАН тодорхойлсон
-- "5 леир, 5 слайдер" систем (доод → дээш):
--   Леир 1 (хамгийн доод) — дэлгэцийг 100% бүүрхэх, хамгийн арын фон
--                            (custom өнгө ЭСВЭЛ импортолсон зураг)
--   Леир 2 — дэлгэцийг 100% бүүрхэх ХАР давхарга, 100%(хар)→0%(тунгалаг)
--            — Слайдер 1 (хамгийн дээд слайдер)
--   Леир 3 — дэлгэцийг 100% бүүрхэх ӨНГӨГүүй blur давхарга,
--            100%→0% blur — Слайдер 2
--   Леир 4 — тайл/картны background өнгөний леир, custom өнгөнөөс
--            сонгоно, 100%→0% тунгалаг — Слайдер 3
--   Леир 5 (хамгийн дээд) — ЗӨВХӨН тайл/картуудыг бүүрхсэн ХАР
--            давхарга, 100%(хар)→0%(тунгалаг) — Слайдер 4
--   (нэмэлт, слайдер бүхий) — тайл/картны хүүрээний өнгө 100%(хар)→
--            100%(цагаан) — Слайдер 5 (хамгийн доод слайдер, card_border_gray)
--
-- Хуучин "card_tint" (хоёр чиглэлт -50..50 slider) энэ загварт байхгүй
-- болсон тул хасав. "card_transparency" нэрийг илүү тодорхой болгож
-- "card_fill_opacity" болгож үүсгэсэн (Леир 4-ийн опаситиг илэрхийлнэ,
-- анхдагч утга 100 — одоогийн харагдаж буй бүрэн ил өнгийг хадгална).
-- Шинээр "card_wash_opacity" (Леир 5, анхдагч 0 — одоогийн харагдацад
-- нөлөөлөхгүй).
alter table userapp_prefs drop column if exists card_tint;
alter table userapp_prefs add column if not exists card_color text;
alter table userapp_prefs rename column card_transparency to card_fill_opacity;
alter table userapp_prefs alter column card_fill_opacity set default 100;
update userapp_prefs set card_fill_opacity = 100 where card_fill_opacity = 0;
alter table userapp_prefs add column if not exists card_wash_opacity int not null default 0;
alter table userapp_prefs alter column bg_tint set default 0;
alter table userapp_prefs alter column bg_blur set default 0;
update userapp_prefs set bg_blur = 0 where bg_blur = 8;
