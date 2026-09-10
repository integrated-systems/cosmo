-- 2026-09-08 (23): АЛДАА ЗАСАВ — 0106 migration зөвхөн my_tenant_ids()-
-- ыг өөрчилсөн ч, системд үнэн хэрэгтээ 3 ӨӨР tenant-шалгах функц
-- (my_tenant_ids, is_staff_member, is_tenant_admin) зэрэгцэн
-- ашиглагддаг байсан тул "owners" зэрэг is_staff_member ашигладаг
-- хүснэгэлүүд бодит RLS хамгаалалтгүй үлдсэн байв (олдвор: Гэрлүг
-- Виста (suspended) tenant-ийн admin owners хүснэгэлийг бүрэн харж
-- чадаж байсан).
--
-- 2-р, ИЛҮҮ нарийн алдаа: tenants хүснэгэл өөрөө
-- "id in (select my_tenant_ids())" policy-той байсан тул, 0106-ийн
-- дараа suspended tenant өөрийн ТУХАЙН МөРөө (статусаа) ч уншиж
-- чадахгүй болсон — үүнээс болж frontend "тухайн tenant suspended
-- эсэхийг" тогтоож чадахгүй, "Paused" дэлгэц огт харагдахгүй,
-- энгийн Layout руу шидэгдэж байв.
--
-- Шийдэл: tenants-ийн SELECT policy-г my_tenant_ids_all()-руу
-- шилжүүлж (өөрийн статусаа үргэлж уншиж чадна), харин
-- is_staff_member()/is_tenant_admin() хоёрыг my_tenant_ids()-тэй
-- ижил зарчмаар (suspended үед false) өөрчилөв.
create or replace function public.is_staff_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
as $function$
  select exists (
    select 1 from user_roles ur
    join tenants t on t.id = ur.tenant_id
    where ur.user_id = auth.uid() and ur.tenant_id = p_tenant_id and ur.role <> 'owner'
      and t.status <> 'suspended'
  );
$function$;

create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
as $function$
  select exists (
    select 1 from user_roles ur
    join tenants t on t.id = ur.tenant_id
    where ur.user_id = auth.uid() and ur.tenant_id = p_tenant_id and ur.role = 'tenant_admin'
      and t.status <> 'suspended'
  );
$function$;

drop policy if exists "supersysadmin bugdiig harna, SoH-iin gishuun ooriin tenant-aa h" on tenants;
create policy "tenants_select"
  on tenants for select
  using (is_supersysadmin() or id in (select my_tenant_ids_all()));
