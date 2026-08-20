-- "Хэрэглэгчийн удирдлага" (/accounts). Нууц vг бодит Supabase Auth-тай
-- холбогдоогvй (Edge Function + service role шаардана — дараагийн ажил).
create table if not exists tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null check (role in ('admin','board','supervisory_board','executive_director','accountant','manager','owner')),
  fullname text not null,
  email text not null,
  address text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);
create index if not exists tenant_users_tenant_id_idx on tenant_users(tenant_id);
alter table tenant_users enable row level security;
create policy "tenant_users: tenant-аараа хязгаарлана"
  on tenant_users for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
