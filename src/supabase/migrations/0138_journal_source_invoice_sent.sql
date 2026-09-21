-- 2026-09-20 (61, 3-р үе шат): Тайлангуудыг (Орлого-зарлагын тайлан,
-- Тэнцэл) бодит гүйлгээгээр тестлэх үед олдсон чухал цоорхой —
-- Invoice.jsx (нэхэмжлэх үүсгэх/илгээх) ЯМАР Ч журналын бичилт
-- үүсгэдэггүй байсан тул: (1) Орлого (5400/5600) хэзээ ч ямар ч
-- журналд хүлээн зөвшөөрөгддэггүй, (2) Авлагын данс (1110/1120)
-- зөвхөн төлбөр бүртгэх үед КРЕДИТЛЭГДЭЖ, ХЭЗЭЭ Ч ДЕБЕТЛЭГДЭЭГҮЙ тул
-- сөргөг тал руу үргэлж явдаг байв. Үүнийг засахын тулд, нэхэмжлэх
-- үүсгэх үед ч журналын бичилт (Дт Авлага / Кт Орлого) автоматаар
-- үүсгэдэг болгоно — үүнд шинэ source_type хэрэгтэй.
alter table journal_entries drop constraint journal_entries_source_type_check;
alter table journal_entries add constraint journal_entries_source_type_check
  check (source_type = any (array['manual'::text, 'payroll'::text, 'invoice_payment'::text, 'invoice_sent'::text]));
