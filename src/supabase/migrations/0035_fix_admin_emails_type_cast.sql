-- HOTFIX 2026-08-19: get_tenant_admin_emails() функц ХЭЗЭЭ Ч зөв
-- ажиллаагүй байсан bug олдож зассан — RETURNS TABLE-д admin_email
-- "text" гэж зарлагдсан ч, auth.users.email нь бодитоор
-- "character varying(255)" төрлтэй тул ямар ч дуудлага
-- "structure of query does not match function result type" гэсэн
-- алдаагаар зогсдог байв. Үүнээс болж TenantStatus.jsx-ийн "Одоогийн
-- админ"/"АДМИН НЭВТРЭХ ИМЭЙЛ" багана ХЭЗЭЭ Ч дүүргэгддэггүй байсан
-- (frontend талд `if (!adminError)` шалгалт учир алдааг чимээгүй
-- залгидаг байсан тул харагдахгүй байв).
create or replace function public.get_tenant_admin_emails()
returns table(tenant_id uuid, admin_email text)
language plpgsql
security definer
as $function$
begin
  if not is_supersysadmin() then
    raise exception 'Зөвшөөргүй';
  end if;
  return query
    select ur.tenant_id, au.email::text
    from user_roles ur
    join auth.users au on au.id = ur.user_id
    where ur.role = 'tenant_admin';
end;
$function$;
