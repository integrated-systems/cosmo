-- Integrated Systems (Cosmo) — Onboarding (Sign-Up-ийн 2-р алхам: СӨХ-ны
-- байгууллагын мэдээлэл+Plan сонголт) дэмжих багана+функц. Шинэ хүснэгэл
-- ГҮЙЦЭТ үүсгэсэнгүй — зөвхөн tenants хүснэгэлд багана нэмж, tenant+эрх үүсгэх атомик
-- RPC функц бичив (2026-08-15).

alter table tenants add column if not exists plan_key text;
alter table tenants add column if not exists registration_no text;
alter table tenants add column if not exists tax_payer_no text;
alter table tenants add column if not exists email text;
alter table tenants add column if not exists phone text;

-- Шинэ хэрэглэгч анх удаа нэвтэрч, өөрийн tenant үүсгэхэд ЭНЭ функцийг дуудна
-- (supabase.rpc). SECURITY DEFINER тул RLS-ийг тойрч, гэхдээ дотроо
-- auth.uid()-ыг заавал шалгадаг тул нэвтэрсэн хэрэглэгч л дуудаж чадна.
-- tenant үүсгэх БОЛОН user_roles бүртгэх хоёр үйлдлийг НЭГ транзакц дотор
-- хийдэг тул хагас дутуу үүсэх эрсдэлгүй.
create or replace function create_tenant_and_assign_admin(
  p_tenant_name text,
  p_plan_key text,
  p_registration_no text,
  p_tax_payer_no text,
  p_email text,
  p_phone text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Нэвтрээгүй хэрэглэгч tenant үүсгэх боломжгүй';
  end if;

  insert into tenants (name, status, plan_key, registration_no, tax_payer_no, email, phone)
  values (p_tenant_name, 'trial', p_plan_key, p_registration_no, p_tax_payer_no, p_email, p_phone)
  returning id into v_tenant_id;

  insert into user_roles (user_id, tenant_id, role)
  values (auth.uid(), v_tenant_id, 'tenant_admin');

  return v_tenant_id;
end;
$$;
