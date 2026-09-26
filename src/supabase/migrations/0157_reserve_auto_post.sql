-- 2026-09-26 (90): Хэрэглэгчийн хүсэлтээр — "Хуримтлалын сан"-ыг
-- Гараар/Автоматаар татах горим тохируулна. pg_cron аль хэдийн
-- суулгагдсан (1.6.4) тул бодит автомат posting боломжтой.
alter table fin_settings add column if not exists reserve_auto_post boolean not null default false;
alter table fin_settings add column if not exists reserve_auto_post_day int not null default 1 check (reserve_auto_post_day between 1 and 28);

-- 2026-09-26: өдөр бүр 1 удаа ажиллаж, "reserve_auto_post=true"
-- БОЛОН өнөөдөр==reserve_auto_post_day тохирсон tenant бүрт,
-- ЭНЭ САР posted эсэхийг шалгаад (давхардуулахгүй), FinConfig.jsx-
-- ийн "Энэ сарын хуваарилалт хийх" товчтой ЯГ ИЖИЛ Дт 4110/Кт 4120
-- бичилт үүсгэнэ.
create or replace function public.auto_post_reserve_allocations()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tenant record;
  v_total numeric;
  v_entry_id uuid;
  v_month_start date;
  v_admin_id uuid;
begin
  v_month_start := date_trunc('month', current_date)::date;
  for v_tenant in
    select fs.tenant_id
    from fin_settings fs
    where fs.reserve_auto_post = true
      and fs.reserve_auto_post_day = extract(day from current_date)
  loop
    -- энэ сар аль хэдийн posted эсэхийг шалгах (давхардуулахгүй)
    if exists (
      select 1 from journal_entries je
      where je.tenant_id = v_tenant.tenant_id
        and je.source_type = 'reserve_allocation'
        and je.entry_date >= v_month_start
    ) then
      continue;
    end if;

    select coalesce(sum(monthly_amount), 0) into v_total
    from reserve_fund_categories where tenant_id = v_tenant.tenant_id;

    if v_total <= 0 then
      continue;
    end if;

    select tu.user_id into v_admin_id from tenant_users tu
    where tu.tenant_id = v_tenant.tenant_id and tu.role = 'admin' limit 1;

    insert into journal_entries (tenant_id, entry_date, description, source_type, created_by)
    values (v_tenant.tenant_id, current_date, to_char(current_date, 'YYYY') || ' оны ' || to_char(current_date, 'MM') || '-р сарын хуримтлалын сангийн хуваарилалт (автомат)', 'reserve_allocation', v_admin_id)
    returning id into v_entry_id;

    insert into journal_entry_lines (entry_id, account_code, debit, credit) values
      (v_entry_id, '4110', v_total, 0),
      (v_entry_id, '4120', 0, v_total);
  end loop;
end;
$function$;

select cron.schedule('reserve-auto-post-daily', '0 2 * * *', $$select public.auto_post_reserve_allocations();$$);
