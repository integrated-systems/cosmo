-- 2026-09-25 (87): Хэрэглэгчийн тодруулсны дагуу — "Хуримтлалын сан"
-- зориулалт бүр ЭЗДИЙН ЭРХИЙН дотоод шилжүүлэг байх ёстой (СөХ-ны
-- орлогод НЭМЭГДЭХГүй, зөвхөн аль хэдийн орсон Хязгаарлалтгүй
-- нeeцээс Хязгаарлалттай нeeц рүү "тусгаарлах" тэмдэглэгээ). ҮҮнд
-- зориулж:
-- 1) journal_entries.source_type-д 'reserve_allocation' нэмнэ
--    (depreciation-тай ЯГ ИЖИЛ, сар бүрийн автомат posting-ийн загвар)
-- 2) "4120 Хязгаарлалттай нeeц" шинэ эздийн эрхийн данс үүсгэнэ
alter table journal_entries drop constraint journal_entries_source_type_check;
alter table journal_entries add constraint journal_entries_source_type_check
  check (source_type = any (array['manual','payroll','invoice_payment','invoice_sent','depreciation','reserve_allocation']));

insert into chart_of_accounts (tenant_id, code, name, category)
select tenant_id, '4120', 'Хязгаарлалттай нeeц', 'equity'
from chart_of_accounts where code = '4110'
on conflict do nothing;
