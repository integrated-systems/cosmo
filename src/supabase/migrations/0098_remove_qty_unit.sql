-- 2026-09-08 (7): "Тоо хэмжээ" (qty+unit) талбарыг бүрэн арилгав —
-- хэрэглэгчийн шийдвэрээр (Б хувилбар) тоологдох боломжтой эд
-- хөрөнгө бүр НЭГ БүРЧЛЭН бүртгэлд суух ёстой (зэрэг элэгдэх, зэрэг
-- актлагдах, зэрэг тоологдох боломжгүй тул). Устгахаас үмнө
-- анхдагч БУС (qty=1, unit='ширхэг' биш) утгатай мөрүүдийн мэдээллийг
-- Тэмдэглэлд хадгалж үлдээв (жиш газрын талбайн хэмжээ алдагдахгүй).
update fixed_assets
set note = trim(both E'\n' from
  coalesce(note, '') || (case when coalesce(note, '') != '' then E'\n' else '' end) ||
  'Хуучин тоо хэмжээ: ' || qty || ' ' || unit
)
where not (qty = 1 and unit = 'ширхэг');

alter table fixed_assets drop column if exists qty;
alter table fixed_assets drop column if exists unit;
