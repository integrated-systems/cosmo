-- 2026-09-13 (46): Хэрэглэгчийн хүсэлтээр — Зогсоол, Агуулах тус
-- бүр өөрийн (Үл хөдлөх хөрөнгийн) ӨУБД дугаартай байдаг тул,
-- owners/clientele хүснэгэлд property_no (Сууц/Талбайн ӨУБД)-с
-- гадна property_no_parking (Зогсоолын ӨУБД), property_no_storage
-- (Агуулахын ӨУБД) 2 шинэ талбар нэмэв.
alter table owners add column if not exists property_no_parking text;
alter table owners add column if not exists property_no_storage text;
alter table clientele add column if not exists property_no_parking text;
alter table clientele add column if not exists property_no_storage text;
