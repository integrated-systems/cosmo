-- 2026-09-08 (28): 3 бодит цоорхойг засав.
--
-- #1: Багц (дахин) идэвхжүүлэх 3 газар (TenantStatus dropdown,
-- Багц ахиулах хүсэлт батлах, Billing dropdown) бүгд plan_key-г
-- шинэчилдэг ч billing_period_start/billing_status-ыг хөндөдөггүй
-- байсан тул, шинэ tenant бараг тэр даруйдаа дахин "Хугацаа
-- хэтэрсэн" болж болзошгүй байв. Одоо ЭНЭ НЭГ RPC-ээр 3 газар
-- бүгд дамжина (Rule of two).
--
-- #3: Төлбөртэй tenant-ийг plan_key='trial' болгож буцаахад
-- trial_ends_at шинэчлэгдэхгүй бол ("хүйтэн орон зай") ямар ч
-- автоматжуулалтад орохгүй байсныг мөн ЭНД шийдэв.
create or replace function public.reactivate_tenant_plan(p_tenant_id uuid, p_plan_key text)
returns void
language plpgsql
security definer
as $function$
begin
  if not is_supersysadmin() then
    raise exception 'Хандах эрхгүй';
  end if;
  update tenants set
    plan_key = p_plan_key,
    plan_activated_at = now(),
    billing_period_start = now(),
    billing_status = 'pending',
    status = 'active',
    trial_ends_at = case when p_plan_key = 'trial' then now() + interval '14 days' else trial_ends_at end
  where id = p_tenant_id;
end;
$function$;

grant execute on function public.reactivate_tenant_plan(uuid, text) to authenticated;

-- #2: "Төлөгдсөн" гэж тэмдэглэх үйлдэлд аудит/нотолгоо алга байсныг
-- шийдэв — хэн, хэзээ, хэдэн төгрөгөөр тэмдэглэсэн бэ гэдгийг
-- хадгална (бодит QPay холбогдох хүртэлх завсрын шийдэл).
create table if not exists payment_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  plan_key text not null,
  unit_price numeric not null,
  unit_count integer not null,
  amount numeric not null,
  marked_by uuid references auth.users(id),
  marked_at timestamptz not null default now()
);
create index if not exists payment_records_tenant_id_idx on payment_records(tenant_id);

alter table payment_records enable row level security;
create policy "payment_records_supersysadmin"
  on payment_records for all
  using (is_supersysadmin())
  with check (is_supersysadmin());
