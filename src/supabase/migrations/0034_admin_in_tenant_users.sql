create or replace function public.create_tenant_and_assign_admin(
  p_tenant_name text, p_plan_key text, p_registration_no text,
  p_tax_payer_no text, p_email text, p_phone text
)
returns uuid
language plpgsql
security definer
as $function$
declare
  v_tenant_id uuid;
  v_auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Нэвтрээгүй хэрэглэгч tenant үүсгэх боломжгүй';
  end if;

  if exists (select 1 from tenants where lower(trim(name)) = lower(trim(p_tenant_name))) then
    raise exception 'Ийм нэртэй СӨХ аль хэдийн бүртгэгдсэн байна. Хэрэв энэ таны СӨХ мөн бол, аль хэдийн бүртгүүлсэн менежертэйгээ холбогдож нэмэлт эрх авна уу.';
  end if;

  insert into tenants (name, status, approval_status, plan_key, registration_no, tax_payer_no, email, phone)
  values (p_tenant_name, 'active', 'pending', 'trial', p_registration_no, p_tax_payer_no, p_email, p_phone)
  returning id into v_tenant_id;

  insert into user_roles (user_id, tenant_id, role)
  values (auth.uid(), v_tenant_id, 'tenant_admin');

  -- 2026-08-19 хэрэглэгч олсон архитектурын цоорхой: анхны бүртгүүлэгч
  -- (tenant_admin) tenant_users хүснэгэлд огт мөргүй байсан тул
  -- "Хэрэглэгчийн удирдлага" (/accounts) хуудсанд ХЭЗЭЭ Ч харагддаггүй
  -- байв. Одоо шинэ tenant үүсгэх бүрд тэднийг ч хамт tenant_users-т
  -- role='admin'-аар бүртгэнэ (fullname үгүй тул оронд нь имэйлээ
  -- ашиглана, дараа нь "Хэрэглэгчийн удирдлага"-аас засаж болно).
  select email into v_auth_email from auth.users where id = auth.uid();
  insert into tenant_users (tenant_id, user_id, role, fullname, email, status)
  values (v_tenant_id, auth.uid(), 'admin', coalesce(v_auth_email, 'Үүсгэсэн Админ'), coalesce(v_auth_email, ''), 'active');

  return v_tenant_id;
end;
$function$;
-- Одоо байгаа tenant-vvдийн анхны (sign-up хийсэн) tenant_admin-г
-- backfill хийнэ (шинэ RPC vvсгэгдэхээс ӨМНв vvссэн tenant-vvд).
insert into tenant_users (tenant_id, user_id, role, fullname, email, status)
select ur.tenant_id, ur.user_id, 'admin', au.email, au.email, 'active'
from user_roles ur
join auth.users au on au.id = ur.user_id
where ur.role = 'tenant_admin'
  and not exists (
    select 1 from tenant_users tu where tu.tenant_id = ur.tenant_id and tu.user_id = ur.user_id
  );
