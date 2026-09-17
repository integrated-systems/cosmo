-- 2026-09-13 (48): Хэрэглэгчийн хүсэлтээр Санхүүгийн тохиргоо ->
-- Тариф табанд "Зогсоол, агуулах өмчлөгчийн төлбөр" шинэ дэд таб
-- нэмэв — учир нь Дан зогсоол/агуулах өмчлөгч (сууцгүй) хүртэл одоог
-- хүртэл Сууц өмчлөгчтэй ЯГ АДИЛ тариф ('owner' категори) ашиглаж
-- байсан тул, жишээ нь "СӨХ-ны төлбөр" (сууцад л хамаарах, м2-тэй
-- холбоотой мөр) буруу тооцогдож болзошгүй байв. tariff_items.
-- category талбарт 'spot_only' гэсэн шинэ утгыг зөвшөөрөхийн тулд
-- CHECK constraint-ийг өргөтгөнө.
alter table tariff_items drop constraint if exists tariff_items_category_check;
alter table tariff_items add constraint tariff_items_category_check check (category = any (array['owner', 'client', 'spot_only']));
