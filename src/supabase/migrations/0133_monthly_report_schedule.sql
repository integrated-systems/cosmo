-- 2026-09-20 (56): "өмнөх сарын тайлан мэдээ" автомат нийтлэлт.
-- Хэрэглэгчтэй зөвлөлдсөний дагуу: шинэ tenant үүсэхэд ЭНЭ функц
-- анхнаасаа ИДЭВХГүй байх ёстой (staff гараар асаах хүртэл).
alter table fin_settings add column if not exists monthly_report_enabled boolean not null default false;
alter table fin_settings add column if not exists monthly_report_day integer;
