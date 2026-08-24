-- 2026-08-19 хэрэглэгчтэй тохиролцсон засвар: reassign_tenant_admin
-- үед хуучин админы tenant_users мөрийг УСТГАХГҮЙ, зүгээр status=
-- 'inactive' болгож паузлана — түүхэн бүртгэл (хэн, хэзээ, ямар
-- имэйлтэй байсан) хадгалагдана (audit trail).
create or replace function public.reassign_tenant_admin(p_tenant_id uuid, p_new_admin_email text)
returns void
language plpgsql
security definer
as $function$
declare
  v_new_user_id uuid;
  v_new_email text;
  v_existing_tu_id uuid;
begin
  if not is_supersysadmin() then
    raise exception 'Зөвшөөргүй';
  end if;

  select id, email into v_new_user_id, v_new_email from auth.users where email = p_new_admin_email;
  if v_new_user_id is null then
    raise exception 'Энэ имэйлээр бүртгэлтэй хэрэглэгч олдсонгүй — тэд эхлээд Sign-Up хийх шаардлагатай';
  end if;

  delete from user_roles where tenant_id = p_tenant_id and role = 'tenant_admin';

  insert into user_roles (user_id, tenant_id, role)
  values (v_new_user_id, p_tenant_id, 'tenant_admin')
  on conflict (user_id, tenant_id, role) do nothing;

  update tenant_users set status = 'inactive' where tenant_id = p_tenant_id and role = 'admin';

  select id into v_existing_tu_id from tenant_users where tenant_id = p_tenant_id and user_id = v_new_user_id;
  if v_existing_tu_id is not null then
    update tenant_users set role = 'admin', status = 'active' where id = v_existing_tu_id;
  else
    insert into tenant_users (tenant_id, user_id, role, fullname, email, status)
    values (p_tenant_id, v_new_user_id, 'admin', coalesce(v_new_email, ''), coalesce(v_new_email, ''), 'active');
  end if;
end;
$function$;
