-- 2026-09-09 (44): Хэрэглэгчийн хуучин "suh" системийн Ажилтан
-- нэмэх модалийн "Цалингаас суутгах татвар/шимтгэл" хэсгийн илүү
-- тодорхой, дэлгэрэнгүй логикийг Cosmo-д авчрав:
-- 1) Суутгахгүй бол ШАЛТГААНЫГ бичдэг (тайлан, аудитад зориулсан)
-- 2) НДШ (2 талт) татвар тул тусгай хувь хэмжээ ашиглахдаа
--    ажилтан/ажил oлгогчийн хувийг ТУСАД НЬ (ndsh_custom_rate нэг
--    буруу талбар байсныг 2 болгож задлав)
alter table employees add column if not exists ndsh_reason text;
alter table employees add column if not exists hhoat_reason text;
alter table employees add column if not exists ndsh_custom_employee_rate numeric;
alter table employees add column if not exists ndsh_custom_employer_rate numeric;

-- Хараахан бодит дата (ndsh_custom_rate ашигласан ажилтан) байхгүй
-- тул шилжүүлэн хөрвүүлэх шаардлагагүй, шууд хасна.
alter table employees drop column if exists ndsh_custom_rate;
