-- Integrated Systems (Cosmo) — Tenant Status хуудсанд "Үйлдэл" багана
-- (Засах/Устгах)+админы нэвтрэх имэйл харуулахад зориулав.

-- 1) supersysadmin tenants мөр устгах боломжтой байх (өмнө зөвхөн UPDATE
--    policy байсан, DELETE байхгүй байв)
create policy "supersysadmin tenants устгаж чадна"
  on tenants for delete
  using (is_supersysadmin());

-- 2) Tenant-ийн tenant_admin эрхтэй хэрэглэгчийн ИМЭЙЛ (ЗөВХөН имэйл,
--    нууц үг ХЭЗЭЭ Ч биш — Supabase Auth нууц үгийг bcrypt hash-аар
--    хадгалдаг тул эх утга нь ЮУГААР Ч эргэж унших боломжгүй) харуулах
--    RPC. SECURITY DEFINER тул auth.users-руу хандах боломжтой, гэхдээ
--    дотроо ЗААВАЛ is_supersysadmin() шалгадаг тул зөвхөн SUPERSYSADMIN
--    л дуудаж чадна.
create or replace function get_tenant_admin_emails()
returns table(tenant_id uuid, admin_email text)
language plpgsql
security definer
as $$
begin
  if not is_supersysadmin() then
    raise exception 'Зөвшөөрөлгүй';
  end if;
  return query
    select ur.tenant_id, au.email
    from user_roles ur
    join auth.users au on au.id = ur.user_id
    where ur.role = 'tenant_admin';
end;
$$;
