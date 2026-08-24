-- 2026-08-19 хэрэглэгч тодорхой асуусан: шинэ tenant үүсгэх үед нэрний
-- давхардал шалгагдаагүй байсныг олж, засав.
create unique index if not exists tenants_name_lower_unique_idx on tenants (lower(trim(name)));

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
    raise exception 'Ийм нэртэй СӨХ аль хэдийн бүртгэгдсэн байна. Хэрэв энэ таны СӨХ мөн бол, аль хэдийн бүртгүүлсэн менежертэйгээ холбогдож нэмэлт эрх авна уу.';
  end if;

  insert into tenants (name, status, plan_key, registration_no, tax_payer_no, email, phone)
  values (p_tenant_name, 'pending_approval', p_plan_key, p_registration_no, p_tax_payer_no, p_email, p_phone)
  returning id into v_tenant_id;

  insert into user_roles (user_id, tenant_id, role)
  values (auth.uid(), v_tenant_id, 'tenant_admin');

  return v_tenant_id;
end;
$function$;
