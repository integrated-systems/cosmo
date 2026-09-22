-- 2026-09-22 (68): НББ стандарт нийцүүлэлт (7-р зүйл) — Тайлангийн
-- тодруулга (Notes to financial statements). Сангийн сайдын
-- 2017.386 тушаалын "Санхүүгийн тайлангийн тодруулга" хэсгийн
-- "ТАНИЛЦУУЛГА" болон "НЯГТЛАН БОДОХ БҮРТГЭЛИЙН БОДЛОГО" хэсгүүд
-- (байгууллагын танилцуулга, дансны бодлогын тайлбар гэх мэт)
-- ГАРААР бөглөх шаардлагатай чөлөөт текст тул, tenant тус бүрт НЭГ
-- удаа хадгалж, дараа нь Тайлангийн тодруулга таб дээр харагдана.
-- Мөнгө/Авлага/Орлого/Зардлын задаргаа мврүүд нь journal_entries-ээс
-- АВТОМАТААР тооцоологддог тул хадгалах шаардлагагүй.
create table financial_statement_notes (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  intro_text text not null default '',
  accounting_policy_text text not null default '',
  related_parties_text text not null default '',
  subsequent_events_text text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table financial_statement_notes enable row level security;

create policy "fsn_select" on financial_statement_notes for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "fsn_write" on financial_statement_notes for all
  using (is_supersysadmin() or (tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'accounting')))
  with check (is_supersysadmin() or (tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'accounting')));
