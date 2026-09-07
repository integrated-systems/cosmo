-- 2026-09-08: 7 сайжруулалт (хэрэглэгчтэй зевлелдсений үр дүн)
--
-- 5) org_report_info.reg_no - 2 tenant санамсаргүй адилхан регистрийн
--    дугаар оруулбал Богино холбоос (/a/{barcode}) буруу tenant руу
--    шилжүүлэх эрсдэлийг DB түвшинд хаана.
create unique index if not exists org_report_info_reg_no_unique
  on org_report_info(reg_no)
  where reg_no is not null and reg_no != '';

-- 3) Хариуцагч: чөлөөт текст ("хуулбар") -> job_positions руу FK.
-- Одоо байгаа текст утгыг тухайн tenant-ийн ижил нэртэй Албан
-- тушаалтай тааруулж (боломжтой бол) шилжүүлнэ.
alter table fixed_assets add column if not exists responsible_position_id uuid references job_positions(id) on delete set null;

update fixed_assets fa
set responsible_position_id = jp.id
from job_positions jp
where fa.responsible_person = jp.name
  and jp.tenant_id = fa.tenant_id
  and fa.responsible_position_id is null
  and fa.responsible_person is not null;

alter table fixed_assets drop column if exists responsible_person;

-- 2) Глобал Ангилал/Терел-ийг санамсаргүй устгахаас хамгаалах:
--    (а) is_active soft-delete flag,
--    (б) fixed_assets-ээс идэвхтэй ашиглагдаж байгаа бол ФИЗИКЭЭР
--        устгахыг DB түвшинд ХОРИГЛОХ (restrict).
alter table fixed_asset_categories add column if not exists is_active boolean not null default true;
alter table fixed_asset_types add column if not exists is_active boolean not null default true;

alter table fixed_assets drop constraint if exists fixed_assets_category_id_fkey;
alter table fixed_assets add constraint fixed_assets_category_id_fkey
  foreign key (category_id) references fixed_asset_categories(id) on delete restrict;

alter table fixed_assets drop constraint if exists fixed_assets_type_id_fkey;
alter table fixed_assets add constraint fixed_assets_type_id_fkey
  foreign key (type_id) references fixed_asset_types(id) on delete restrict;

-- 1-Б) Сар бүрийн элэгдлийг "Батлах" үйлдлээр ЦОРЫН ГАНЦ удаа бичих
-- (давхар бичихээс (asset_id, period) unique index хамгаална).
-- Хаагдсан үе дахин тооцоологдохгүй байх зарчим (НББ-ийн стандарт).
create table if not exists depreciation_postings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  asset_id uuid not null references fixed_assets(id) on delete cascade,
  period date not null,
  amount numeric not null,
  method_used text,
  created_at timestamptz not null default now()
);
create unique index if not exists depreciation_postings_asset_period_unique on depreciation_postings(asset_id, period);
create index if not exists depreciation_postings_tenant_id_idx on depreciation_postings(tenant_id);

alter table depreciation_postings enable row level security;
create policy "depreciation_postings: tenant-аараа хязгаарлана"
  on depreciation_postings for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

-- p_tenant_id-г ЗАСВАРГүй өгсөн ч, дуудагчийн эрхийг дотор нь
-- шалгана (SECURITY DEFINER тул RLS-ийг тойрдог, тиймээс энд заавал
-- шалгах ёстой).
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
begin
  if not (is_supersysadmin() or p_tenant_id in (select my_tenant_ids())) then
    raise exception 'Хандах эрхгүй';
  end if;

  for r in
    select fa.id, fa.purchase_price, fa.salvage_value, fa.accumulated_depreciation,
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
    v_remaining := greatest(0, r.purchase_price - coalesce(r.salvage_value, 0) - r.accumulated_depreciation);
    if v_remaining <= 0 then
      continue;
    end if;

    if r.depreciation_method = 'accelerated' and r.annual_depreciation_rate is not null and r.annual_depreciation_rate > 0 then
      v_monthly_factor := 1 - power(1 - r.annual_depreciation_rate / 100.0, 1.0 / 12);
      v_amount := least(v_remaining, (r.purchase_price - r.accumulated_depreciation) * v_monthly_factor);
    else
      v_amount := least(v_remaining, (r.purchase_price - coalesce(r.salvage_value, 0)) / r.useful_life_months);
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

grant execute on function public.post_monthly_depreciation(uuid, date) to authenticated;


