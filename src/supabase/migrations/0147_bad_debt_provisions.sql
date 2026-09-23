-- 2026-09-23 (73): НББ үлдэгдэл засвар (4-р зүйл) — Найдваргүй
-- авлага (bad debt allowance). PaymentBadges/Owners-ийн "эрсдэлтэй"
-- (at_risk) төлөв БОЛОН НББ-ийн журнал хоёр огт холбогдоогүй тусдаа
-- систем байсныг олов — "1290 Найдваргүй авлагын хасагдуулга" данс
-- аль хэдийн байгаа ч ХЭЗЭЭ Ч ямар ч бичилтэд ашиглагдаагүй байв.
-- Одоо 7080 "Найдваргүй авлагын зардал" (Ф2-ийн 28-р мөр) данс нэмж,
-- bad_debt_provisions хүснэгэл үүсгэж, эрсдэлтэй invoice-үүдийг
-- тэмдэглэн, журналын бичилт (Дт 7080 / Кт 1290) үүсгэх боломжтой
-- болгоно. Идэмпотент (нэг invoice-ыг 2 удаа провижн хийхгүй).
insert into chart_of_accounts (tenant_id, code, name, category, sort_order)
select t.id, '7080', 'Найдваргүй авлагын зардал', 'expense', 62
from tenants t
where not exists (
  select 1 from chart_of_accounts coa where coa.tenant_id = t.id and coa.code = '7080'
);

create or replace function seed_default_chart_of_accounts(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into chart_of_accounts (tenant_id, code, name, category, sort_order)
  select p_tenant_id, x.code, x.name, x.category, x.sort_order
  from (values
    ('1010', 'Кассад байгаа бэлэн мөнгө', 'cash', 1),
    ('1020', 'Харилцахад байгаа мөнгө', 'cash', 2),
    ('1110', 'Богино хугацаат хөрэнгэ оруулалт', 'short_term_investment', 3),
    ('1210', 'Сууц эмчлэгчдийн авлага', 'receivable', 4),
    ('1220', 'Аж ахуйн нэгжийн авлага', 'receivable', 5),
    ('1230', 'Ажилтнаас авах авлага', 'receivable', 6),
    ('1240', 'Бусад авлага', 'receivable', 7),
    ('1290', 'Найдваргүй авлагын хасагдуулга', 'receivable', 8),
    ('1410', 'Бараа материал', 'inventory', 9),
    ('1420', 'Түлш шатахуун', 'inventory', 10),
    ('1430', 'Сэлбэг хэрэгсэл', 'inventory', 11),
    ('1810', 'Урьдчилж төлсэн зардал/тооцоо', 'prepaid_expense', 12),
    ('2010', 'үндсэн хөрэнгэ', 'fixed_asset', 13),
    ('2020', 'Хуримтлагдсан элэгдэл', 'fixed_asset', 14),
    ('3110', 'НДШ өглөг', 'payable', 14),
    ('3120', 'ХХОАТ суутгал өглөг', 'payable', 15),
    ('3130', 'Цалингийн өглөг', 'payable', 16),
    ('3310', 'Бусад өглөг', 'payable', 17),
    ('3210', 'Урьдчилж авсан орлого', 'payable', 18),
    ('4110', 'Хуримтлалын сан', 'equity', 19),
    ('5110', 'Гишүүдийн татвар', 'income', 19.5),
    ('5410', 'Түрээсийн орлого', 'income', 20),
    ('5610', 'Бусад орлого', 'income', 21),
    ('7010', 'Цалин хүлсний зардал', 'expense', 22),
    ('7011', 'Хоолны мөнгөний зардал', 'expense', 23),
    ('7012', 'Унааны мөнгөний зардал', 'expense', 24),
    ('7013', 'Утасны мөнгөний зардал', 'expense', 25),
    ('7020', 'НДШ-ийн ажил олгогчийн зардал', 'expense', 26),
    ('7030', 'Засвар үйлчилгээний зардал', 'expense', 27),
    ('7040', 'Тохижилтын зардал', 'expense', 28),
    ('7050', 'Цэвэрлэгээний зардал', 'expense', 29),
    ('7060', 'Бусад тогтмол зардал', 'expense', 30),
    ('7070', 'Элэгдлийн зардал', 'expense', 61),
    ('7080', 'Найдваргүй авлагын зардал', 'expense', 62)
  ) as x(code, name, category, sort_order)
  where not exists (
    select 1 from chart_of_accounts coa where coa.tenant_id = p_tenant_id and coa.code = x.code
  );
end;
$function$;

create table bad_debt_provisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric not null check (amount > 0),
  journal_entry_id uuid references journal_entries(id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (invoice_id)
);
create index bad_debt_provisions_tenant_id_idx on bad_debt_provisions(tenant_id);

alter table bad_debt_provisions enable row level security;

create policy "bad_debt_provisions_select" on bad_debt_provisions for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "bad_debt_provisions_insert" on bad_debt_provisions for insert
  with check (is_supersysadmin() or (tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'accounting')));

create policy "bad_debt_provisions_delete" on bad_debt_provisions for delete
  using (is_supersysadmin());
