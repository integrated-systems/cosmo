-- 2026-08-19 аудит: tenant_users/access_rules-ийн RLS зүгээр "tenant-ийн
-- гишүүн vv?" гэдгийг л шалгадаг байсан ("tenant_admin эсэх vv?" биш) —
-- үүнээс болж энгийн Менежер (admin биш) API-г шууд дуудаж шинэ
-- хэрэглэгч нэмэх/устгах/ролийг өөрчлөх боломжтой байсан. Одоо зүгээр
-- tenant_admin/supersysadmin л INSERT/UPDATE/DELETE хийж чадна (SELECT
-- гишүүн бүгдэд нээлттэй хэвээр).
create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
as $function$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and tenant_id = p_tenant_id and role = 'tenant_admin'
  );
$function$;

-- tenant_users
drop policy if exists "tenant_users: tenant-аараа хязгаарлана" on tenant_users;

create policy "tenant_users_select_member"
  on tenant_users for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "tenant_users_insert_admin_only"
  on tenant_users for insert
  with check (is_supersysadmin() or is_tenant_admin(tenant_id));

create policy "tenant_users_update_admin_only"
  on tenant_users for update
  using (is_supersysadmin() or is_tenant_admin(tenant_id))
  with check (is_supersysadmin() or is_tenant_admin(tenant_id));

create policy "tenant_users_delete_admin_only"
  on tenant_users for delete
  using (is_supersysadmin() or is_tenant_admin(tenant_id));

-- access_rules
drop policy if exists "access_rules: tenant-аараа хязгаарлана" on access_rules;

create policy "access_rules_select_member"
  on access_rules for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "access_rules_insert_admin_only"
  on access_rules for insert
  with check (is_supersysadmin() or is_tenant_admin(tenant_id));

create policy "access_rules_update_admin_only"
  on access_rules for update
  using (is_supersysadmin() or is_tenant_admin(tenant_id))
  with check (is_supersysadmin() or is_tenant_admin(tenant_id));

create policy "access_rules_delete_admin_only"
  on access_rules for delete
  using (is_supersysadmin() or is_tenant_admin(tenant_id));
