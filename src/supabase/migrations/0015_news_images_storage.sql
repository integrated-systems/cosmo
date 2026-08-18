-- Integrated Systems (Cosmo) — 2026-08-19: "Паблик мэдээ" функцийг
-- бvрмвсvн арилгав (хэрэглэгчийн шийдвэр: /news хуудсыг зөвхөн дотоод
-- tenant-ийн гишvvдэд зориулна, нэвтрэлтгvй гадаад хэрэглэгчид зориулсан
-- нээлттэй горим байхгvй). Мвн зурагны Supabase Storage bucket vvсгэв.

alter table news drop column if exists is_public;

-- "news-images" bucket: public=true (getPublicUrl шууд ажиллана).
-- Файлын зам: news-images/{tenant_id}/{filename} — upload/delete-ийг
-- зөвхөн тухайн tenant-ийн гишvvн (эсвэл supersysadmin) хийж чадна.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "news-images: нийтэд уншигдана (public bucket)"
  on storage.objects for select
  using (bucket_id = 'news-images');

create policy "news-images: tenant-аараа upload"
  on storage.objects for insert
  with check (
    bucket_id = 'news-images'
    and (is_supersysadmin() or (storage.foldername(name))[1]::uuid in (select my_tenant_ids()))
  );

create policy "news-images: tenant-аараа устгана"
  on storage.objects for delete
  using (
    bucket_id = 'news-images'
    and (is_supersysadmin() or (storage.foldername(name))[1]::uuid in (select my_tenant_ids()))
  );
