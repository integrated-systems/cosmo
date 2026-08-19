-- Integrated Systems (Cosmo) — "Харилцагчийн бvртгэл" (/providers)
-- хуудас. 2026-08-19 хэрэглэгчийн заасны дагуу: Owners/Clientele-тэй
-- одоогоор ХОЛБООГvй, зөвхөн vйлчилгээ vзvvлэгч (provider) байгууллагын
-- бvртгэл (жиш: хог ачилтын компани, зогсоолын систем vйлчилгээ гэх мэт).
create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  legal_entity_name text not null,
  certificate_no text,
  ceo_name text,
  mobile text,
  phone text,
  email text,
  contract_no text,
  contract_start date,
  contract_end date,
  bank_name text,
  bank_iban text,
  bank_account text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists providers_tenant_id_idx on providers(tenant_id);

alter table providers enable row level security;

create policy "providers: tenant-аараа хязгаарлана"
  on providers for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
