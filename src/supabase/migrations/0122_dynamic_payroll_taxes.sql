-- 2026-09-13 (45): БОДИТ АРХИТЕКТУРЫН АЛДАА ЗАСАВ — цалингийн
-- тооцоолол зөвхөн НДШ, ХХОАТ гэсэн 2 татварыг хатуу кодолсон
-- (hardcoded) байсан тул, SUPERSYSADMIN шинэ татвар (жиш "Хотын
-- татвар") нэмэхэд ажилтны модал, цалингийн модал, тооцооллын
-- логик АЛЬ АЛИНД нь огт харагддаггүй, тооцоологддоггүй байв.
-- employees.deduct_ndsh/ndsh_custom_.../deduct_hhoat/hhoat_custom_...
-- гэсэн тус тусын баганыг НЭГ ганц JSONB (tax_overrides) болгож,
-- payroll_addition_settings.taxable_socialins/taxable_incometax-ыг
-- НЭГ ганц JSONB (taxable_flags) болгож, ямар ч тооны татварт
-- динамикаар тэлэгддэг болгов.
alter table employees add column if not exists tax_overrides jsonb not null default '{}'::jsonb;
alter table payroll_addition_settings add column if not exists taxable_flags jsonb not null default '{}'::jsonb;

-- Одоо байгаа dataг (ndsh/hhoat-ийн хуучин баганаас) шинэ JSONB
-- бүтэц рүү шилжүүлнэ.
update employees set tax_overrides = jsonb_strip_nulls(jsonb_build_object(
  'ndsh', jsonb_build_object(
    'deduct', deduct_ndsh,
    'custom_employee_rate', ndsh_custom_employee_rate,
    'custom_employer_rate', ndsh_custom_employer_rate,
    'reason', ndsh_reason
  ),
  'hhoat', jsonb_build_object(
    'deduct', deduct_hhoat,
    'custom_rate', hhoat_custom_rate,
    'reason', hhoat_reason
  )
));

update payroll_addition_settings set taxable_flags = jsonb_build_object(
  'ndsh', taxable_socialins,
  'hhoat', taxable_incometax
);

alter table employees drop column if exists deduct_ndsh;
alter table employees drop column if exists ndsh_custom_employee_rate;
alter table employees drop column if exists ndsh_custom_employer_rate;
alter table employees drop column if exists ndsh_reason;
alter table employees drop column if exists deduct_hhoat;
alter table employees drop column if exists hhoat_custom_rate;
alter table employees drop column if exists hhoat_reason;

alter table payroll_addition_settings drop column if exists taxable_socialins;
alter table payroll_addition_settings drop column if exists taxable_incometax;
