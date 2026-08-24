-- 2026-08-19 хэрэглэгчтэй тохиролцсон Audit log ("Logs" /logs, СИСАДМИН
-- бүлэг) — чухал үйлдлүүдийг (Approve/Reject, статус/багц өөрчлөлт,
-- хэрэглэгч үүсгэх/устгах/засах, admin солих г.м) хэн хэзээ хийсэн
-- бэ гэдгийг хадгалдаг болов.
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  details jsonb,
  target_name text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_tenant_id_idx on audit_log(tenant_id);
create index if not exists audit_log_created_at_idx on audit_log(created_at desc);

alter table audit_log enable row level security;

create policy "audit_log_select_admin_only"
  on audit_log for select
  using (is_supersysadmin() or is_tenant_admin(tenant_id));

create policy "audit_log_insert_any_member"
  on audit_log for insert
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

-- tenant устгагдвал ч (on delete set null) audit тэмдэглэл үлдэнэ,
-- зүгээр tenant_id null болно (эргэн харах үед target_name-ээр
-- тодорхойлно).
create or replace function public.log_audit_event(p_tenant_id uuid, p_action text, p_details jsonb default null, p_target_name text default null)
returns void
language plpgsql
security definer
as $function$
declare
  v_email text;
begin
  if not (is_supersysadmin() or p_tenant_id in (select my_tenant_ids())) then
    raise exception 'Зөвшөөргүй';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  insert into audit_log (tenant_id, user_id, actor_email, action, details, target_name)
  values (p_tenant_id, auth.uid(), v_email, p_action, p_details, p_target_name);
end;
$function$;
