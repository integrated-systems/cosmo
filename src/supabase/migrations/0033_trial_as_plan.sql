-- 2026-08-19 хэрэглэгч тодорхой заасан: "Trial" бол Төлбөрийн статус
-- (status) биш, "Багц" (plan_key)-ийн нэг тврл — хараахан твлбвр
-- твлввгүй ч бүртгэл үүсгэчихсэн tenant-ийг илэрхийлнэ.
update tenants set status = 'active', plan_key = 'trial' where status = 'trial';

alter table tenants drop constraint tenants_status_check;
alter table tenants add constraint tenants_status_check
  check (status = ANY (ARRAY['active'::text, 'suspended'::text, 'cancelled'::text]));

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
begin
  if auth.uid() is null then
    raise exception 'Нэвтрээгүй хэрэглэгч tenant үүсгэх боломжгүй';
  end if;

  if exists (select 1 from tenants where lower(trim(name)) = lower(trim(p_tenant_name))) then
    raise exception 'Ийм нэртэй СүХ аль хэдийн бүртгэгдсэн байна. Хэрэв энэ таны СүХ мвн бол, аль хэдийн бүртгүүлсэн менежертэйгээ холбогдож нэмэлт эрх авна уу.';
  end if;

  -- шинэ бүртгүүлэгч хараахан твлбвр твлввгүй тул plan_key үүрэг
  -- 'trial' (p_plan_key параметрийг үл харгалзана — ирээдүйн сонирхол
  -- л илэрхийлнэ, бодит идэвхтэй багц биш). status='active' (Төлбөрийн
  -- статус, Approval-тэй хамааралгүй).
  insert into tenants (name, status, approval_status, plan_key, registration_no, tax_payer_no, email, phone)
  values (p_tenant_name, 'active', 'pending', 'trial', p_registration_no, p_tax_payer_no, p_email, p_phone)
  returning id into v_tenant_id;

  insert into user_roles (user_id, tenant_id, role)
  values (auth.uid(), v_tenant_id, 'tenant_admin');

  return v_tenant_id;
end;
$function$;
