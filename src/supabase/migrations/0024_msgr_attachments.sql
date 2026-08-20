-- Integrated Systems (Cosmo) — 2026-08-19: "Мессенжер" (/msgr) хуудасны
-- мессеж бичих талбарын хавсралт (файл хавсаргах) товчийг ажилд оруулав.
-- Файлын зам: msgr-attachments/{tenant_id}/{list_id}/{filename}.
alter table msgr_messages add column if not exists attachment_url text;
alter table msgr_messages add column if not exists attachment_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('msgr-attachments', 'msgr-attachments', true, 10485760, null)
on conflict (id) do nothing;

create policy "msgr-attachments: нийтэд уншигдана (public bucket)"
  on storage.objects for select
  using (bucket_id = 'msgr-attachments');

create policy "msgr-attachments: tenant-аараа upload"
  on storage.objects for insert
  with check (
    bucket_id = 'msgr-attachments'
    and (is_supersysadmin() or (storage.foldername(name))[1]::uuid in (select my_tenant_ids()))
  );

create policy "msgr-attachments: tenant-аараа устгана"
  on storage.objects for delete
  using (
    bucket_id = 'msgr-attachments'
    and (is_supersysadmin() or (storage.foldername(name))[1]::uuid in (select my_tenant_ids()))
  );
