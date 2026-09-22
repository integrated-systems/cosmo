-- 2026-09-22 (71): НББ үлдэгдэл засвар (2-р зүйл) — шинэ tenant
-- (СөХ) үүсэхэд chart_of_accounts автоматаар seed хийгддэггүй
-- байсныг олов. Migration 0115 (анхны 27 данс) болон дараа нь
-- 0139/0143 (рэнумбер, 2020/7070 нэмэлт) бүгд "одоо байгаа tenant-д
-- л" гэсэн НЭГ УДААГИЙН insert байсан тул, ЭНЭ migration-ий дараа
-- үүсэх ЯМАР Ч шинэ tenant хоосон дансны жагсаалттай үлддэг байв.
-- Одоо seed_default_chart_of_accounts()-ыг гаргаж, create_tenant_
-- and_assign_admin() дотор шууд дуудаж, шинэ tenant үүсмэгц АВТОМАТААР
-- бүрэн (2020/7070-той) дансны жагсаалттай болгоно.
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
    ('7070', 'Элэгдлийн зардал', 'expense', 61)
  ) as x(code, name, category, sort_order)
  where not exists (
    select 1 from chart_of_accounts coa where coa.tenant_id = p_tenant_id and coa.code = x.code
  );
end;
$function$;

create or replace function create_tenant_and_assign_admin(p_tenant_name text, p_plan_key text, p_registration_no text, p_tax_payer_no text, p_email text, p_phone text)
returns uuid
language plpgsql
security definer
as $function$
declare
  v_tenant_id uuid;
  v_auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Нэвтрээгүй хэрэглэгч tenant үүсгэх боломжгүй';
  end if;

  if exists (select 1 from tenants where lower(trim(name)) = lower(trim(p_tenant_name))) then
    raise exception 'Ийм нэртэй СөХ аль хэдийн бүртгэгдсэн байна. Хэрэв энэ таны СөХ мөн бол, аль хэдийн бүртгүүлсэн менежертэйгээ холбогдож нэмэлт эрх авна уу.';
  end if;

  insert into tenants (name, status, approval_status, plan_key, registration_no, tax_payer_no, email, phone, terms_accepted_at)
  values (p_tenant_name, 'active', 'pending', 'trial', p_registration_no, p_tax_payer_no, p_email, p_phone, now())
  returning id into v_tenant_id;

  insert into user_roles (user_id, tenant_id, role)
  values (auth.uid(), v_tenant_id, 'tenant_admin');

  select email into v_auth_email from auth.users where id = auth.uid();
  insert into tenant_users (tenant_id, user_id, role, fullname, email, status)
  values (v_tenant_id, auth.uid(), 'admin', coalesce(v_auth_email, 'үүсгэсэн Админ'), coalesce(v_auth_email, ''), 'active');

  perform seed_default_chart_of_accounts(v_tenant_id);

  return v_tenant_id;
end;
$function$;
