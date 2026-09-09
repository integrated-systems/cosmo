-- 2026-09-08 (18): Billing хуудасны UI-г бүрэн дуусгах — Төлбөрийн
-- төлөв/Дараагийн огноо/Тэмдэглэл гэсэн 3 талбар ГАРААР удирддаг
-- байдлаар нэмэв (бодит нэхэмжлэх/төлбөрийн систем хараахан
-- холбогдоогүй тул одоохондоо SUPERSYSADMIN гараар тохируулна,
-- логикийг ирээдүйд автоматжуулна).
alter table tenants add column if not exists billing_status text not null default 'paid'
  check (billing_status in ('paid', 'pending', 'overdue'));
alter table tenants add column if not exists billing_next_date date;
alter table tenants add column if not exists billing_note text;
