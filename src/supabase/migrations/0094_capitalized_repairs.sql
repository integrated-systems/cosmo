-- 2026-09-08 (3): Капиталжуулах засвар — хөрөнгийн үнэ цэнэ/ашиглах
-- хугацааг нэмэгдүүлдэг том засвар үйлчилгээ (жиш дээвэр солих,
-- дулаалга) энгийн зардал (routine maintenance)-с ялгаатай.
--
-- Дансны үлдэгдэл үнийн суурь томьёо: ЦОРЫН ГАНЦ газраас
-- (fixed_assets.book_value generated багана) тооцоологдоно —
-- (purchase_price + capitalized_amount) - accumulated_depreciation.
-- src/lib/depreciation.js болон post_monthly_depreciation() SQL
-- функц хоёулаа энэ ижил томьёог дагана (Rule of two).
alter table fixed_assets add column if not exists capitalized_amount numeric not null default 0;

alter table fixed_assets drop column if exists book_value;
alter table fixed_assets add column book_value numeric generated always as (
  purchase_price + capitalized_amount - accumulated_depreciation
) stored;

alter table asset_repairs add column if not exists is_capitalized boolean not null default false;
alter table asset_repairs add column if not exists extend_months integer;

create or replace function public.post_monthly_depreciation(p_tenant_id uuid, p_period date)
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
  if not (is_supersysadmin() or p_tenant_id in (select my_tenant_ids())) then
    raise exception 'Хандах эрхгүй';
  end if;

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
