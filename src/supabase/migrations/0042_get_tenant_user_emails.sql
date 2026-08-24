-- 2026-08-19 хэрэглэгчтэй тохиролцсон засвар — "4-р асуудал"
-- (tenant_users vs auth.users): tenant_users.email нь үүсгэсэн мөчийн
-- snapshot тул хугацаа өнгөрөхэд хуучирч болзошгүй. Үүнээс сэргийлж,
create or replace function public.get_tenant_user_emails(p_tenant_id uuid)
returns table(user_id uuid, live_email text)
language plpgsql
security definer
as $function$
begin
  if not (is_supersysadmin() or is_tenant_admin(p_tenant_id) or p_tenant_id in (select my_tenant_ids())) then
    raise exception 'Зөвшөөргүй';
  end if;
  return query
    select tu.user_id, au.email::text
    from tenant_users tu
    join auth.users au on au.id = tu.user_id
    where tu.tenant_id = p_tenant_id;
end;
$function$;
