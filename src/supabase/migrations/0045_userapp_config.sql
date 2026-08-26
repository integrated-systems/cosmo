-- 2026-08-19 хэрэглэгчтэй тохиролцсоны дагуу "Сууц вмчлвгч" (owner) role
-- бүрэн блоклохын оронд whitelist-тэй болгох архитектурын анхны алхам.
alter table owners add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists owners_user_id_idx on owners(user_id);

-- "UserApp тохиргоо" (/uappconfig) хуудасны "Модуль тохиргоо" таб —
-- SISADMIN резидент (Мобайл) апп-д ямар модуль харагдахыг сонгодог
-- whitelist. Хандах эрхийн тохиргоог ОРЛОХГүй, нэмэлт шүүлтүүр л.
create table userapp_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  page_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, page_key)
);

alter table userapp_config enable row level security;

create policy "userapp_config_select_member" on userapp_config for select using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "userapp_config_write_admin" on userapp_config for insert with check (is_supersysadmin() or is_tenant_admin(tenant_id));
create policy "userapp_config_update_admin" on userapp_config for update using (is_supersysadmin() or is_tenant_admin(tenant_id));
create policy "userapp_config_delete_admin" on userapp_config for delete using (is_supersysadmin() or is_tenant_admin(tenant_id));
