-- 2026-09-22 (63): НББ стандарт нийцүүлэлт (2-р зүйл) -- Хугацааны
-- хаалт (period locking). Одоо хүртэл ямар ч үеийн бичилтийг
-- чөлөөтэй нэмж, өөрчилж, устгаж болдог байсан -- стандарт (аудитын
-- шаардлага, НББ-ийн зарчим)-аар хаагдсан тайлант үед шинэ бичилт
-- хийх, өөрчлөх, устгах хориглогдох ёстой. үүнийг хүснэгэл үүсгэж,
-- journal_entries/journal_entry_lines-ийн RLS-д шууд (edit/delete
-- аль алинд нь) шалгуур нэмж хэрэгжүүлэв.
create table closed_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  closed_at timestamptz not null default now(),
  closed_by uuid references auth.users(id),
  unique (tenant_id, period_year, period_month)
);

alter table closed_periods enable row level security;

create policy "closed_periods_select" on closed_periods for select
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

-- supersysadmin ямар ч үед ЗАДЛАЖ (unlock) чадна — бусад нь
-- can_edit_section(accounting) байх ёстой.
create policy "closed_periods_write" on closed_periods for all
  using (is_supersysadmin() or (tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'accounting')))
  with check (is_supersysadmin() or (tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'accounting')));

-- journal_entries: хаагдсан үеийн бичилтийг INSERT/UPDATE/DELETE
-- хийхийг (supersysadmin-ээс бусад) хориглоно.
drop policy je_write on journal_entries;
create policy je_write on journal_entries for all
  using (
    is_supersysadmin() or (
      tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'accounting')
      and not exists (
        select 1 from closed_periods cp
        where cp.tenant_id = journal_entries.tenant_id
          and cp.period_year = extract(year from journal_entries.entry_date)::int
          and cp.period_month = extract(month from journal_entries.entry_date)::int
      )
    )
  )
  with check (
    is_supersysadmin() or (
      tenant_id in (select my_tenant_ids()) and can_edit_section(tenant_id, 'accounting')
      and not exists (
        select 1 from closed_periods cp
        where cp.tenant_id = journal_entries.tenant_id
          and cp.period_year = extract(year from journal_entries.entry_date)::int
          and cp.period_month = extract(month from journal_entries.entry_date)::int
      )
    )
  );

-- journal_entry_lines: харьяа journal_entries-ийн огноогоор ЯГ ИЖИЛ
-- шалгуур хэрэгжүүлнэ.
drop policy jel_write on journal_entry_lines;
create policy jel_write on journal_entry_lines for all
  using (
    exists (
      select 1 from journal_entries je
      where je.id = journal_entry_lines.entry_id
        and (
          is_supersysadmin() or (
            je.tenant_id in (select my_tenant_ids()) and can_edit_section(je.tenant_id, 'accounting')
            and not exists (
              select 1 from closed_periods cp
              where cp.tenant_id = je.tenant_id
                and cp.period_year = extract(year from je.entry_date)::int
                and cp.period_month = extract(month from je.entry_date)::int
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from journal_entries je
      where je.id = journal_entry_lines.entry_id
        and (
          is_supersysadmin() or (
            je.tenant_id in (select my_tenant_ids()) and can_edit_section(je.tenant_id, 'accounting')
            and not exists (
              select 1 from closed_periods cp
              where cp.tenant_id = je.tenant_id
                and cp.period_year = extract(year from je.entry_date)::int
                and cp.period_month = extract(month from je.entry_date)::int
            )
          )
        )
    )
  );
