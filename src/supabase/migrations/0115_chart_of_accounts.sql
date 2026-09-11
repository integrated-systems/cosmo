-- 2026-09-09 (38): Ажилтны бүртгэлийн 3-р үе шат — Дансны
-- төлөвлөгөө (chart of accounts). Эндээс хойш "Суурь данс"/
-- "Зарлагын данс" (payroll_tax_settings, payroll_addition_settings)
-- чөлөөт текст БИШ, энэ хүснэгэлээс сонгодог болно. Кодуудыг
-- FinConfig.jsx-ийн урьд өмнe нь бичсэн тайлбарт (5400, 5600, 7010-
-- 7013, 7020) дурдсантай яг тохируулав.
create table if not exists chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null check (category in (
    'cash', 'short_term_investment', 'receivable', 'inventory', 'prepaid_expense', 'fixed_asset',
    'payable', 'equity', 'income', 'expense'
  )),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists chart_of_accounts_tenant_id_idx on chart_of_accounts(tenant_id);

alter table chart_of_accounts enable row level security;
create policy "coa_select" on chart_of_accounts for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "coa_write" on chart_of_accounts for all
  using ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'accounting'))
  with check ((is_supersysadmin() or tenant_id in (select my_tenant_ids())) and can_edit_section(tenant_id, 'accounting'));

-- Одоо байгаа бүх tenant-д стандарт дансны жагсаалтыг seed хийв.
insert into chart_of_accounts (tenant_id, code, name, category, sort_order)
select t.id, x.code, x.name, x.category, x.sort_order
from tenants t
cross join (values
  ('1010', 'Кассад байгаа бэлэн мөнгө', 'cash', 1),
  ('1020', 'Харилцахад байгаа мөнгө', 'cash', 2),
  ('1030', 'Богино хугацаат хөрөнгө оруулалт', 'short_term_investment', 3),
  ('1110', 'Сууц өмчлөгчдийн авлага', 'receivable', 4),
  ('1120', 'Аж ахуйн нэгжийн авлага', 'receivable', 5),
  ('1130', 'Ажилтнаас авах авлага', 'receivable', 6),
  ('1140', 'Бусад авлага', 'receivable', 7),
  ('1190', 'Найдваргүй авлагын хасагдуулга', 'receivable', 8),
  ('1210', 'Бараа материал', 'inventory', 9),
  ('1220', 'Түлш шатахуун', 'inventory', 10),
  ('1230', 'Сэлбэг хэрэгсэл', 'inventory', 11),
  ('1400', 'Урьдчилж төлсөн зардал/тооцоо', 'prepaid_expense', 12),
  ('2010', 'Үндсэн хөрөнгө', 'fixed_asset', 13),
  ('3010', 'НДШ өглөг', 'payable', 14),
  ('3020', 'ХХОАТ суутгал өглөг', 'payable', 15),
  ('3030', 'Цалингийн өглөг', 'payable', 16),
  ('3040', 'Бусад өглөг', 'payable', 17),
  ('3050', 'Урьдчилж авсан орлого', 'payable', 18),
  ('4010', 'Хуримтлалын сан', 'equity', 19),
  ('5400', 'Түрээсийн орлого', 'income', 20),
  ('5600', 'Бусад орлого', 'income', 21),
  ('7010', 'Цалин хүлсний зардал', 'expense', 22),
  ('7011', 'Хоолны мөнгөний зардал', 'expense', 23),
  ('7012', 'Унааны мөнгөний зардал', 'expense', 24),
  ('7013', 'Утасны мөнгөний зардал', 'expense', 25),
  ('7020', 'НДШ-ийн ажил олгогчийн зардал', 'expense', 26),
  ('7030', 'Засвар үйлчилгээний зардал', 'expense', 27),
  ('7040', 'Тохижилтын зардал', 'expense', 28),
  ('7050', 'Цэвэрлэгээний зардал', 'expense', 29),
  ('7060', 'Бусад тогтмол зардал', 'expense', 30)
) as x(code, name, category, sort_order)
on conflict (tenant_id, code) do nothing;
