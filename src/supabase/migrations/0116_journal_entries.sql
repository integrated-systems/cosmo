-- 2026-09-09 (39): Ажилтны бүртгэлийн 4-р (сүүлийн) үе шат —
-- журналын бичилт. payroll_tax_settings.base_account нь "тооцооллын
-- үндэслэх данс" (жиш ХХОАТ-ийн хувьд Түрээсийн орлого 5400) гэсэн
-- утгатай хэвээр үлдэнэ; журналд Кт (өглөг) тал луу бичихэд шинэ
-- liability_account талбарыг ашиглана (НДШ->3010, ХХОАТ->3020).
alter table payroll_tax_settings add column if not exists liability_account text;
update payroll_tax_settings set liability_account = '3010' where code = 'ndsh';
update payroll_tax_settings set liability_account = '3020' where code = 'hhoat';

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entry_date date not null default current_date,
  description text not null,
  source_type text not null default 'manual' check (source_type in ('manual', 'payroll')),
  source_ref text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists journal_entries_tenant_id_idx on journal_entries(tenant_id);

create table if not exists journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references journal_entries(id) on delete cascade,
  account_code text not null,
  debit numeric not null default 0,
  credit numeric not null default 0
);
create index if not exists journal_entry_lines_entry_id_idx on journal_entry_lines(entry_id);

-- Rule of two: employees/payroll_tax_settings-тэй ИЖИЛ аюулгүй RLS
-- загвар. journal_entry_lines-ийн RLS-ийг эцэг journal_entries
-- мөрийн tenant_id-аар шалгана (lines өөрөө tenant_id баганагүй).
alter table journal_entries enable row level security;
create policy "je_select" on journal_entries for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "je_write" on journal_entries for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'accounting'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'accounting'));

alter table journal_entry_lines enable row level security;
create policy "jel_select" on journal_entry_lines for select
  using (exists (
    select 1 from journal_entries je
    where je.id = journal_entry_lines.entry_id
      and (is_supersysadmin() or je.tenant_id in (select my_tenant_ids()))
  ));
create policy "jel_write" on journal_entry_lines for all
  using (exists (
    select 1 from journal_entries je
    where je.id = journal_entry_lines.entry_id
      and (is_supersysadmin() or je.tenant_id in (select my_tenant_ids()))
      and can_edit_section(je.tenant_id, 'accounting')
  ))
  with check (exists (
    select 1 from journal_entries je
    where je.id = journal_entry_lines.entry_id
      and (is_supersysadmin() or je.tenant_id in (select my_tenant_ids()))
      and can_edit_section(je.tenant_id, 'accounting')
  ));
