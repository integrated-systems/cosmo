-- 2026-09-04 (3): "Нэхэмжлэх" (өмнөх нэрээрээ "Нэхэмжлэл") дэд табын
-- "Нэхэмжлэх илгээх хуваарь" картад зориулсан талбарууд.
alter table fin_settings add column if not exists invoice_register_day int not null default 1;
alter table fin_settings add column if not exists invoice_send_day int not null default 2;
alter table fin_settings add column if not exists invoice_due_day int not null default 20;
alter table fin_settings add column if not exists notify_mail boolean not null default false;
alter table fin_settings add column if not exists notify_sms boolean not null default false;
alter table fin_settings add column if not exists notify_messenger boolean not null default true;
