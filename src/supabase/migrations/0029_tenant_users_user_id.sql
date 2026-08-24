-- "Хэрэглэгчийн удирдлага" (/accounts) — 2026-08-19 (2-р засвар): нууц vг
-- бодит Supabase Auth-тай холбогдов. tenant_users мвр бvр одоо
-- харгалзах auth.users(id)-той холбогдоно (Edge Function
-- "manage-tenant-user" vvнийг тохируулна).
alter table tenant_users add column if not exists user_id uuid references auth.users(id) on delete set null;
