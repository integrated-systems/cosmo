-- 2026-09-25 (87): seed_default_chart_of_accounts()-д "4120
-- Хязгаарлалттай нөөц" нэмж, ШИНЭ tenant үүсэх бүрд автоматаар
-- багтдаг болгоно (одоо байгаа tenant-үүдэд 0152-т аль хэдийн нэмсэн).
create or replace function public.seed_default_chart_of_accounts(p_tenant_id uuid)
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
    ('1210', 'Сууц өмчлөгчдийн авлага', 'receivable', 4),
    ('1220', 'Аж ахуйн нэгжийн авлага', 'receivable', 5),
    ('1230', 'Ажилтнаас авах авлага', 'receivable', 6),
    ('1240', 'Бусад авлага', 'receivable', 7),
    ('1290', 'Найдваргүй авлагын хасагдуулга', 'receivable', 8),
    ('1410', 'Бараа материал', 'inventory', 9),
    ('1420', 'Түлш шатахуун', 'inventory', 10),
    ('1430', 'Сэлбэг хэрэгсэл', 'inventory', 11),
    ('1810', 'Урьдчилж төлсэн зардал/тооцоо', 'prepaid_expense', 12),
    ('2010', 'Үндсэн хөрэнгэ', 'fixed_asset', 13),
    ('2020', 'Хуримтлагдсан элэгдэл', 'fixed_asset', 14),
    ('3110', 'НДШ өглөг', 'payable', 14),
    ('3120', 'ХХОАТ суутгал өглөг', 'payable', 15),
    ('3130', 'Цалингийн өглөг', 'payable', 16),
    ('3310', 'Бусад өглөг', 'payable', 17),
    ('3210', 'Урьдчилж авсан орлого', 'payable', 18),
    ('4110', 'Хуримтлалын сан', 'equity', 19),
    ('4120', 'Хязгаарлалттай нөөц', 'equity', 19.4),
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
