-- Integrated Systems (Cosmo) — Байрны дугаарт "/", "-", үсэг, ":" зэрэг
-- тэмдэгт орсон байж болдог (жиш нь "58/1") тул `building_no`-г INT-ээс
-- TEXT болгож өөрчлөв — тоон биш, чөлөөт бичвэр гэж үзнэ.

alter table unit_layouts alter column building_no type text using building_no::text;
alter table owners alter column building_no type text using building_no::text;
