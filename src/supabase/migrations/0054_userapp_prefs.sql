-- 2026-08-27: Хуучин "suh" (userapp-react) төслийн Профайл хуудсыг
-- Cosmo стандартад нийцүүлж (tenant_id-тэй, RLS-тэй) шилжүүлэв. Хуучин
-- код device-local localStorage биш, СЕРВЕР талд (user_profiles) бүх
-- theme/интерфейс тохиргоог хадгалдаг байсан — энэ давуу талыг Cosmo-д
-- нэвтрүүлж, төхөөрөмж хооронд синк хийгддэг болгов.
create table userapp_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  -- 2026-08-27: хуучин кодод "bg_image_url" 10 жилийн signed URL хадгалдаг
  -- байсан (тэдний comment-д ч энэ эмзэг цэг гэдгийг тэмдэглэсэн — URL-ийг
  -- мэдэх хэн ч (эрхгүй ч гэсэн) нээж чадна). Cosmo-д зүгээр СТОРЕЖИЙН
  -- ЗАМЫГ Л хадгалж, client бүр өөрийн session-ээрээ RLS-ээр хамгаалагдсан
  -- .download()-оор л татаж, түр зуурын blob URL үүсгэдэг болгов —
  -- урт хугацааны нээлттэй холбоос үүсгэхгүй.
  bg_image_path text,
  bg_color text,
  bg_blur int not null default 8,
  bg_tint int not null default 0,
  card_tint int not null default 0,
  card_transparency int not null default 0,
  card_border_gray int,
  updated_at timestamptz not null default now()
);

alter table userapp_prefs enable row level security;

create policy "userapp_prefs_select_own" on userapp_prefs
  for select using (user_id = auth.uid());
create policy "userapp_prefs_insert_own" on userapp_prefs
  for insert with check (user_id = auth.uid());
create policy "userapp_prefs_update_own" on userapp_prefs
  for update using (user_id = auth.uid());

-- Хувийн дэвсгэр зураг — PRIVATE bucket, зам: {user_id}/background.jpg
-- (хуучин кодтой ижил зарчим, гэхдээ signed URL-ийн оронд Cosmo-ийн
-- бусад bucket-той нийцүүлэн RLS-ээр л хамгаалж, урт хугацааны signed
-- URL-ийг DB-д хадгалахгүй — харин client бүр өөрийн auth session-ээрээ
-- шууд уншина).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('userapp-backgrounds', 'userapp-backgrounds', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "userapp-backgrounds: өөрийн зам уншина"
  on storage.objects for select
  using (bucket_id = 'userapp-backgrounds' and (storage.foldername(name))[1]::uuid = auth.uid());

create policy "userapp-backgrounds: өөрийн замд байршуулна"
  on storage.objects for insert
  with check (bucket_id = 'userapp-backgrounds' and (storage.foldername(name))[1]::uuid = auth.uid());

create policy "userapp-backgrounds: өөрийн замыг солино"
  on storage.objects for update
  using (bucket_id = 'userapp-backgrounds' and (storage.foldername(name))[1]::uuid = auth.uid());

create policy "userapp-backgrounds: өөрийн замыг устгана"
  on storage.objects for delete
  using (bucket_id = 'userapp-backgrounds' and (storage.foldername(name))[1]::uuid = auth.uid());
