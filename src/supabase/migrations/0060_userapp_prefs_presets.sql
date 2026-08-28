-- 2026-08-28: Хэрэглэгчийн хүсэлтээр дэвсгэр зургийг ГАДНААС IMPORT хийх
-- боломжийг (upload/storage) БүРМВСВН хаав — учир нь ийм импортолсон
-- зургуудыг байршуулах, хадгалах асуудал үүсдэг, мвн апп-ын онцлог
-- үзэмжийг алдагдуулдаг. Зөвхөн программд БАГТААСАН 6 бэлэн зургаас
-- (public/backgrounds/) сонгодог боллоо.
alter table userapp_prefs add column if not exists bg_preset text;
alter table userapp_prefs drop column if exists bg_image_path;

-- "userapp-backgrounds" storage bucket үүнээс хойш ашиглагдахгүй тул
-- (upload UI бүрэн хаагдсан) устгана. storage.objects хүснэгэлд
-- шууд DELETE хийхийг хамгаалдаг trigger байдаг тул session тохиргоог
-- түр зөвшөөрнө.
drop policy if exists "userapp-backgrounds: өөрийн зам уншина" on storage.objects;
drop policy if exists "userapp-backgrounds: өөрийн замд байршуулна" on storage.objects;
drop policy if exists "userapp-backgrounds: өөрийн замыг солино" on storage.objects;
drop policy if exists "userapp-backgrounds: өөрийн замыг устгана" on storage.objects;
set storage.allow_delete_query = 'true';
delete from storage.objects where bucket_id = 'userapp-backgrounds';
delete from storage.buckets where id = 'userapp-backgrounds';
