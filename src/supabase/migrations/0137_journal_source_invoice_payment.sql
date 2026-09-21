-- 2026-09-20 (61, 2-р үе шат): RecordPaymentModal.jsx-ээс автоматаар
-- үүсгэдэг журналын бичилтүүдийг "manual" (гараар)-аас ялгаж
-- тодорхойлохын тулд, journal_entries.source_type-ийн CHECK
-- constraint-д 'invoice_payment' шинэ төрөл нэмэв.
alter table journal_entries drop constraint journal_entries_source_type_check;
alter table journal_entries add constraint journal_entries_source_type_check
  check (source_type = any (array['manual'::text, 'payroll'::text, 'invoice_payment'::text]));
