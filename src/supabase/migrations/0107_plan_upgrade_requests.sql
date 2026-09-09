-- 2026-09-08 (22-2): Paused (suspended) tenant-ийн "Багц ахиулах"
-- хүсэлт үүсгэх урсгал. АНХААР: энэ хүснэгэлийн RLS нь my_tenant_ids()
-- (0106-д suspended tenant-ийг хассан)-ыг ашиглаж БОЛОХГүй — яг
-- эсрэгээрээ, SUSPENDED tenant-ийн ажилтан ч гэсэн хүсэлт үүсгэж
-- чадах ёстой (энэ бол тэдний хандалтаа сэргээх цорын ганц зам).
-- Тиймээс тусдаа "бүх tenant" (suspended ч хамаарна) функц ашиглав.
-- Тэмдэглэл: policy нэрийг ЦeeН үсэгтэй байлгав — Postgres identifier
-- 63 байтын хязгаартай, кирилл үсэг 2 байт тул урт нэр давхцах
-- эрсдэлтэй (эхний оролдлогод яг энэ шалтгаанаар алдаа гарсан).
create or replace function public.my_tenant_ids_all()
returns setof uuid
language sql
stable
security definer
as $function$
  select tenant_id from user_roles where user_id = auth.uid() and tenant_id is not null;
$function$;

create table if not exists plan_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  requested_plan_key text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists plan_upgrade_requests_tenant_id_idx on plan_upgrade_requests(tenant_id);

alter table plan_upgrade_requests enable row level security;

create policy "pur_select"
  on plan_upgrade_requests for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids_all()));

create policy "pur_insert"
  on plan_upgrade_requests for insert
  with check (tenant_id in (select my_tenant_ids_all()));

create policy "pur_update_supersysadmin"
  on plan_upgrade_requests for update
  using (is_supersysadmin())
  with check (is_supersysadmin());
