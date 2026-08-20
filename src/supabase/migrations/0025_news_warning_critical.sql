-- Integrated Systems (Cosmo) — "Мэдээ, мэдээлэл" (/news) хуудасны
-- Нэмэх/Засах модальд 2026-08-19 хэрэглэгч тодорхой заасны дагуу
-- "Онцлох мэдээ болгох"/"Шуурхай мэдээ болгох" 2 чекбоксын доор
-- шинээр "Сэрэмжлvvлэг мэдээ болгох"/"Ноцтой мэдээ болгох" нэмэв.
alter table news add column if not exists warning boolean not null default false;
alter table news add column if not exists critical boolean not null default false;
