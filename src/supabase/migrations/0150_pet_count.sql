-- 2026-09-25 (85): Хэрэглэгчийн хүсэлтээр "Тэжээвэр амьтан" талбар
-- нэмнэ (people_count/child_0_5/child_6_18-тай ЯГ ИЖИЛ бүтэц).
alter table owners add column if not exists pet_count integer;
