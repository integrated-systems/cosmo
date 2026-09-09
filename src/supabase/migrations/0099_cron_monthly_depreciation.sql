-- 2026-09-08 (10): Элэгдлийн батлалтыг 100% автоматжуулав — pg_cron
-- ашиглаж сар бүр (1-нд, 01:00 UTC) БҮХ tenant-д зориулж
-- post_monthly_depreciation()-тэй ЯГ ИЖИЛ логикийг ажиллуулна.
-- ҮҮнийг хийхийн тулд хэрэглэгчийн эрхийн шалгалт (auth.uid()-д
-- тулгуурладаг is_supersysadmin()/my_tenant_ids()) ШААРДЛАГАГҮЙ дотоод
-- функц (_post_monthly_depreciation_core) гаргаж, ЭНЭ функцийг:
--   (а) app-аас дуудагддаг public.post_monthly_depreciation() (эрхийн
--       шалгалттай, authenticated-д нээлттэй) ба
--   (б) cron job (эрхийн шалгалтгүй, зөвхөн cron.job хүснэгэлээс
--       дотооддоо дуудагддаг, PUBLIC/authenticated-д ил гаргаагүй)
-- хоёулаа дундаа ашиглана (Rule of two — логик 1 л газарт).
create extension if not exists pg_cron;

create or replace function public._post_monthly_depreciation_core(p_tenant_id uuid, p_period date)
returns table(posted_asset_id uuid, posted_amount numeric)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_period date := date_trunc('month', p_period)::date;
  r record;
  v_amount numeric;
  v_remaining numeric;
  v_monthly_factor numeric;
  v_base numeric;
begin
  for r in
    select fa.id, fa.purchase_price, fa.capitalized_amount, fa.salvage_value, fa.accumulated_depreciation,
           fa.useful_life_months, fa.depreciation_method, fa.annual_depreciation_rate
    from fixed_assets fa
    join fixed_asset_types ft on ft.id = fa.type_id
    where fa.tenant_id = p_tenant_id
      and fa.status <> 'written_off'
      and ft.is_depreciable
      and fa.depreciation_method is not null
      and fa.useful_life_months is not null
      and not exists (
        select 1 from depreciation_postings dp
        where dp.asset_id = fa.id and dp.period = v_period
      )
  loop
    v_base := r.purchase_price + coalesce(r.capitalized_amount, 0);
    v_remaining := greatest(0, v_base - coalesce(r.salvage_value, 0) - r.accumulated_depreciation);
    if v_remaining <= 0 then
      continue;
    end if;

    if r.depreciation_method = 'accelerated' and r.annual_depreciation_rate is not null and r.annual_depreciation_rate > 0 then
      v_monthly_factor := 1 - power(1 - r.annual_depreciation_rate / 100.0, 1.0 / 12);
      v_amount := least(v_remaining, (v_base - r.accumulated_depreciation) * v_monthly_factor);
    else
      v_amount := least(v_remaining, (v_base - coalesce(r.salvage_value, 0)) / r.useful_life_months);
    end if;

    if v_amount <= 0 then
      continue;
    end if;

    insert into depreciation_postings (tenant_id, asset_id, period, amount, method_used)
    values (p_tenant_id, r.id, v_period, v_amount, r.depreciation_method);

    update fixed_assets set accumulated_depreciation = accumulated_depreciation + v_amount where id = r.id;

    posted_asset_id := r.id;
    posted_amount := v_amount;
    return next;
  end loop;
end;
$function$;

-- App-аас (authenticated хэрэглэгч) дуудагддаг публик RPC — эрхийн
-- шалгалт хэвээрээ, дотоод core функц рүү төлөвлөгөөтэйгөөр шилжив.
create or replace function public.post_monthly_depreciation(p_tenant_id uuid, p_period date)
returns table(posted_asset_id uuid, posted_amount numeric)
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not (is_supersysadmin() or p_tenant_id in (select my_tenant_ids())) then
    raise exception 'Хандах эрхгүй';
  end if;
  return query select * from _post_monthly_depreciation_core(p_tenant_id, p_period);
end;
$function$;

-- Cron-ий цорын ганц зорилготой функц — БҮХ tenant-ыг тойрч, эрхийн
-- шалгалтгүйгээр (учир нь эндүүс дуудагддаг үед auth.uid() үгүй)
-- батлалт хийнэ. authenticated/PUBLIC-д ЭРХ ОЛГОХГҮЙ (доор revoke).
create or replace function public.cron_post_monthly_depreciation_all_tenants()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_tenant record;
begin
  for v_tenant in select distinct tenant_id from fixed_assets loop
    perform * from _post_monthly_depreciation_core(v_tenant.tenant_id, current_date);
  end loop;
end;
$function$;

revoke all on function public._post_monthly_depreciation_core(uuid, date) from public, authenticated, anon;
revoke all on function public.cron_post_monthly_depreciation_all_tenants() from public, authenticated, anon;
grant execute on function public.post_monthly_depreciation(uuid, date) to authenticated;

-- Сар бүрийн 1-ний 01:00 UTC (Улаанбаатарын цагаар 09:00) цагт
-- ажиллана. Давхар товлохоос сэргийлж, өмнө нь үүссэн ижил нэртэй
-- job байвал эхэлж арилгана.
select cron.unschedule(jobid) from cron.job where jobname = 'monthly-depreciation-posting';
select cron.schedule(
  'monthly-depreciation-posting',
  '0 1 1 * *',
  $$select public.cron_post_monthly_depreciation_all_tenants();$$
);
