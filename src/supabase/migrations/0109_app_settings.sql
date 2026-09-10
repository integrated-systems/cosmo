-- 2026-09-08 (26): Billing хуудаснаас SUPERSYSADMIN гараар засварлаж
-- болдог, апп даяар ашиглах текст тохиргоо (эхлээд зөвхөн "Paused"
-- дэлгэцний зурвас). Ирээдүйд адил төрлийн (key, value) текст
-- тохиргоо нэмэгдвэл энд л нэмнэ (Rule of two).
create table if not exists app_settings (
  key text primary key,
  value text
);

alter table app_settings enable row level security;

create policy "app_settings_select"
  on app_settings for select
  using (true);

create policy "app_settings_write"
  on app_settings for all
  using (is_supersysadmin())
  with check (is_supersysadmin());

insert into app_settings (key, value) values (
  'suspended_message',
  'Танай байгууллагын программыг үнэгүй турших хугацаа дууссан тул хандах эрхийг түр зогсоолоо. Программд хадгалсан туршилтын өгөгдлүүд 14 хоногийн турш серверт хадгалагдах бөгөөд программыг үргэлжлүүлэн ашиглахыг хүсвэл энэ хугацаанд амжиж доорх багцуудаас аль нэгийг сонгон хүсэлтээ илгээнэ үү.'
) on conflict (key) do nothing;
