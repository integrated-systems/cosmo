-- 2026-09-13 (52): "Албан мэдэгдэл" хуудсыг бүрэн ажиллагаатай гэдгийг
-- шалгаж эхлэхийн тулд:
-- 1) official_notices -- "Илгээсэн" таб-ын лог (толгой мөр бүр,
--    хүлээн авагчийн бүлэг/төрөл, дүн, суваг, тоо г.м.)
-- 2) msgr_messages.official_notice_id -- Мессенжер сувгаар илгээсэн
--    зурвасуудыг тухайн alban medegdel-тэй холбож, "УНШСАН" тоог
--    нэгтгэн тооцоолох боломжтой болгоно.
create table official_notices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sender text not null,
  group_key text not null check (group_key in ('owner', 'client', 'spot_only')),
  recipient_key text not null check (recipient_key in ('all', 'one', 'overdue', 'at_risk')),
  recipient_label text not null,
  recipient_id uuid,
  recipient_name text,
  notice_type text not null,
  title text not null,
  content text,
  channel_email boolean not null default false,
  channel_sms boolean not null default false,
  channel_messenger boolean not null default true,
  recipient_count integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table official_notices enable row level security;

create policy "official_notices_select" on official_notices for select
  using (is_supersysadmin() or is_staff_member(tenant_id));

create policy "official_notices_insert" on official_notices for insert
  with check (is_supersysadmin() or is_staff_member(tenant_id));

alter table msgr_messages add column if not exists official_notice_id uuid references official_notices(id) on delete set null;
