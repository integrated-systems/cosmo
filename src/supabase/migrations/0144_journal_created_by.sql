-- 2026-09-22 (70): НББ-ийн үлдсэн цоорхойнуудыг засах (1-р зүйл) —
-- journal_entries.created_by баганыг ХЭН Ч БӨГЛӨДӨГГҮй байсныг олов
-- (Employees.jsx-ийн цалингийн журнал л зөв бөглөдэг байсан, бусад
-- бүх INSERT цэг — RecordPaymentModal.jsx, NewJournalEntryModal,
-- "Буцаах" үйлдэл, Invoice.jsx-ийн орлого хүлээн зөвшөөрөх бичилт —
-- үүнийг ОГТ бөглөдөггүй байв, аудитын зам дутуу байсан). Frontend
-- талд бүгдийг нь засаад, ЭНД зөвхөн server талын элэгдлийн функцийг
-- ч мөн адил засав.
create or replace function _post_monthly_depreciation_core(p_tenant_id uuid, p_period date)
returns table(posted_asset_id uuid, posted_amount numeric)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_period date := date_trunc('month', p_period)::date;
  r record;
  v_amount numeric;
  v_remaining numeric;
  v_monthly_factor numeric;
  v_base numeric;
  v_total numeric := 0;
  v_entry_id uuid;
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

    v_total := v_total + v_amount;

    posted_asset_id := r.id;
    posted_amount := v_amount;
    return next;
  end loop;

  if v_total > 0 then
    insert into journal_entries (tenant_id, entry_date, description, source_type, created_by)
    values (p_tenant_id, v_period, to_char(v_period, 'YYYY') || ' оны ' || to_char(v_period, 'MM') || '-р сарын элэгдэл', 'depreciation', auth.uid())
    returning id into v_entry_id;

    insert into journal_entry_lines (entry_id, account_code, debit, credit) values
      (v_entry_id, '7070', v_total, 0),
      (v_entry_id, '2020', 0, v_total);
  end if;
end;
$function$;
