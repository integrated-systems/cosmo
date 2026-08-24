-- 2026-08-19 хэрэглэгчтэй тохиролцсон архитектур: "Хүлээн зөвшөөргөл"
-- (approval_status: pending/approved/rejected, ГАНЦ УДААГИЙН, шинэ
-- бүртгүүлэгчид зориулсан) БОЛОН "Твлбврийн статус" (status: trial/
-- active/suspended/cancelled, зөвшөөрсний ДАРАА л хамааралтай)
-- хоёрыг бүрэн ТУСГААРЛАВ — үмнв нь нэг баганад холилдож байсан.
-- Trial 14 хоногийн хугацаа (trial_ends_at) ЗвВШввРСВН мвчээс л
-- эхэлж тоологдоно (signup хийсэн мвчээс биш) — хүлээгдэж байх үед
-- хэрэглэгч ямар ч хуудас нээж чадахгүй тул тэр хугацаа "үрэгдэхгүй".
alter table tenants add column if not exists approval_status text not null default 'approved' check (approval_status in ('pending','approved','rejected'));
alter table tenants add column if not exists trial_ends_at timestamptz;

update tenants set approval_status = 'pending', status = 'trial' where status = 'pending_approval';
update tenants set approval_status = 'rejected' where status = 'rejected';
update tenants set approval_status = 'approved' where status in ('trial','active','suspended','cancelled') and approval_status <> 'pending';

alter table tenants drop constraint tenants_status_check;
alter table tenants add constraint tenants_status_check
  check (status = ANY (ARRAY['trial'::text, 'active'::text, 'suspended'::text, 'cancelled'::text]));

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

  insert into tenants (name, status, approval_status, plan_key, registration_no, tax_payer_no, email, phone)
  values (p_tenant_name, 'trial', 'pending', p_plan_key, p_registration_no, p_tax_payer_no, p_email, p_phone)
  returning id into v_tenant_id;

  insert into user_roles (user_id, tenant_id, role)
  values (auth.uid(), v_tenant_id, 'tenant_admin');

  return v_tenant_id;
end;
$function$;
