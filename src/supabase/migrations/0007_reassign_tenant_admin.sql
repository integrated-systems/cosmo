-- Integrated Systems (Cosmo) — СөХ-ны админ солигдох (ажлаа өгөх/шилжүүлэх)
-- логик. SUPERSYSADMIN-ийн зориулалттай 2 хэрэгсэл:
-- 1) reassign_tenant_admin — шинэ (аль хэдийн бүртгэлтэй) хэрэглэгчийг
--    tenant_admin болгож, хуучин эзэмшигчийн эрхийг хаsна.
-- 2) Нууц үг сэргээх линк (frontend дээр supabase.auth.resetPasswordForEmail
--    ашиглана, тусад нь backend функц шаардлагагүй).

create or replace function reassign_tenant_admin(p_tenant_id uuid, p_new_admin_email text)
returns void
language plpgsql
security definer
as $$
declare
  v_new_user_id uuid;
begin
  if not is_supersysadmin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;

  select id into v_new_user_id from auth.users where email = p_new_admin_email;
  if v_new_user_id is null then
    raise exception 'Энэ имэйлээр бүртгэлтэй хэрэглэгч олдсонгүй — тэд эхлээд Sign-Up хийх шаардлагатай';
  end if;

  delete from user_roles where tenant_id = p_tenant_id and role = 'tenant_admin';

  insert into user_roles (user_id, tenant_id, role)
  values (v_new_user_id, p_tenant_id, 'tenant_admin')
  on conflict (user_id, tenant_id, role) do nothing;
end;
$$;
