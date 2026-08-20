-- Integrated Systems (Cosmo) — "Хандах эрхийн тохиргоо" (/rolesrules)
-- хуудас. 2026-08-19 хэрэглэгчтэй тохиролцсон 5 роль (Salesforce-ийн
-- Profile загварыг бахvvжуулсан хувилбар): board(Удирдах зввлвл),
-- supervisory_board(Хяналтын зввлвл), executive_director(Гvйцэтгэх
-- захирал), accountant(Нягтлан бодогч), manager(Менежер). SISADMIN
-- ("СvХ-ийн бурхан") болон SUPERSYSADMIN ("бурхдын бурхан") энэ
-- матрицад ОГТ ОРОХГvй — тэдний эрх кодоор hardcode, vргvй засварлагдах
-- боломжгvй (аюулгvй байдлын vндэс).
create table if not exists access_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  page_key text not null,
  role text not null check (role in ('board', 'supervisory_board', 'executive_director', 'accountant', 'manager')),
  action text not null,
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (tenant_id, page_key, role, action)
);
create index if not exists access_rules_tenant_id_idx on access_rules(tenant_id);

alter table access_rules enable row level security;

create policy "access_rules: tenant-аараа хязгаарлана"
  on access_rules for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
