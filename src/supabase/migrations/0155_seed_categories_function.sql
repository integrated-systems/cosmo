-- 2026-09-25 (88): "seed_default_chart_of_accounts()"-тэй ижил
-- зарчмаар, шинээр үүсэх tenant бүрт "Орлогын ангилал"/"Зарлагын
-- ангилал" урьдчилан холбогдсон жагсаалт автоматаар үүсдэг болгоно.
create or replace function public.seed_default_income_expense_categories(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into income_subcategories (tenant_id, name, account_code, sort_order)
  select p_tenant_id, x.name, x.account_code, x.sort_order
  from (values
    ('Гишүүдийн татвар', '5110', -3),
    ('Түрээсийн орлого', '5410', -2),
    ('Бусад орлого', '5610', -1),
    ('Айл, эрх, зогсоол, агуулах', '5610', 0),
    ('Аж ахуйн нэгж', '5610', 1),
    ('Антены, лифтний самбарын түрээс', '5610', 2),
    ('Банкны хүүгийн орлого', '5610', 3),
    ('Зогсоолын хураамж', '5610', 4),
    ('Чипний орлого', '5610', 5),
    ('Ажилчдаас авах авлага', '5610', 6),
    ('Хохирлын нөхөн төлбөр', '5610', 7),
    ('Бусад', '5610', 8),
    ('Хаалтны хэтэрсэн хугацаа, түр зогсолтын төлбөр', '5610', 9)
  ) as x(name, account_code, sort_order)
  where not exists (select 1 from income_subcategories isc where isc.tenant_id = p_tenant_id);

  insert into expense_subcategories (tenant_id, name, account_code, sort_order)
  select p_tenant_id, x.name, x.account_code, x.sort_order
  from (values
    ('Цалин хүлсний зардал', '7010', 0),
    ('Нийгмийн даатгалын зардал', '7020', 1),
    ('Засвар үйлчилгээний зардал', '7030', 2),
    ('Тохижилтын зардал', '7040', 3),
    ('Цэвэрлэгээний зардал', '7050', 4),
    ('Бусад тогтмол зардал', '7060', 5),
    ('Элэгдлийн зардал', '7070', 6),
    ('Найдваргүй авлагын зардал', '7080', 7)
  ) as x(name, account_code, sort_order)
  where not exists (select 1 from expense_subcategories esc where esc.tenant_id = p_tenant_id);
end;
$function$;

create or replace function public.create_tenant_and_assign_admin(p_tenant_name text, p_plan_key text, p_registration_no text, p_tax_payer_no text, p_email text, p_phone text)
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
  perform seed_default_income_expense_categories(v_tenant_id);

  return v_tenant_id;
end;
$function$;
