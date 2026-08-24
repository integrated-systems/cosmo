-- 2026-08-19 хэрэглэгч тодорхой заасан дvрэм: дурын хvн sign-up хийж
-- СvХ vvсгэх vед хvлээн зввшввргvй "pending_approval" статустай vvсэж,
-- SUPERSYSADMIN "Tenant Status" хуудсаар зввшвврсний дараа л идэвхжинэ
-- (эсвэл татгалзана) — email баталгаажуулалт vнэн хэрэгтээ бизнесийн
-- эрхийг батлахгvй тул хvний хяналт зайлшгvй шаардлагатай.
alter table tenants drop constraint tenants_status_check;
alter table tenants add constraint tenants_status_check
  check (status = ANY (ARRAY['pending_approval'::text, 'active'::text, 'suspended'::text, 'trial'::text, 'cancelled'::text, 'rejected'::text]));

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
    raise exception 'Нэвтрээгvй хэрэглэгч tenant vvсгэх боломжгvй';
  end if;

  insert into tenants (name, status, plan_key, registration_no, tax_payer_no, email, phone)
  values (p_tenant_name, 'pending_approval', p_plan_key, p_registration_no, p_tax_payer_no, p_email, p_phone)
  returning id into v_tenant_id;

  insert into user_roles (user_id, tenant_id, role)
  values (auth.uid(), v_tenant_id, 'tenant_admin');

  return v_tenant_id;
end;
$function$;
