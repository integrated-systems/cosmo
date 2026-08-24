-- HOTFIX 2026-08-19: Одоо байгаа 3 tenant (Хүннү 2222, Гэрлүг Виста,
-- Гэрлүг Палас) Approve хийгдэхээс ӨМНӨ (trial_ends_at багана бий
-- болохоос ӨМНӨ) аль хэдийн зөвшөөрөгдсөн байсан тул тэдний
-- trial_ends_at хараахан NULL хэвээр байсан — Topbar-ийн "Захиалах"
-- countdown үүнээс болж үзэгдээгүй. 14 хоногийн шинэ хугацаа тавьж
-- backfill хийв.
update tenants
set trial_ends_at = now() + interval '14 days'
where plan_key = 'trial' and approval_status = 'approved' and trial_ends_at is null;
