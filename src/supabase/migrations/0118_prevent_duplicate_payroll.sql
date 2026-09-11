-- 2026-09-09 (41): "Цалин төлөх" товчийг 2 удаа дарвал давхардсан
-- журналын бичилт үүсгэдэг байсныг DB түвшинд (unique constraint)
-- бүрмөсөн хаав — эх дата (JS) талд шалгалт байгаа ч, race
-- condition-с бүрэн хамгаалахын тулд DB constraint зайлшгүй.
alter table journal_entries add column if not exists period text;

-- Зөвхөн source_type='payroll' үед тухайн сард (tenant тус бүрд)
-- ЗАВАЛ 1-ээс илүүгүй журнал үүсэхийг зөвшөөрөхгүй.
create unique index if not exists journal_entries_payroll_period_unique
  on journal_entries (tenant_id, period)
  where source_type = 'payroll';
