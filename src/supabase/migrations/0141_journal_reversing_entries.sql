-- 2026-09-22 (64): НББ стандарт нийцүүлэлт (3-р зүйл) — Буцаах
-- бичилт (reversing entries). Одоо хүртэл journal_entries/
-- journal_entry_lines-ийг can_edit_section(accounting) эрхтэй staff
-- ШУУД UPDATE/DELETE хийж болдог байсан (UI-даар ил гараагүй ч, RLS
-- зөвшөөрдөг байсан) — энэ нь НББ-ийн үндсэн зарчим ("анхан шатны
-- баримт бичигдсэний дараа өрчлөгдэхгүй, зөвхөн БУЦААХ БИЧИЛТЭЭР
-- залруулна")-д харшилдаг байв. Одоо ЗӨВХӨН supersysadmin л
-- UPDATE/DELETE хийж чадна, staff нь зөвхөн INSERT (шинэ бичилт
-- vүсгэх, эсвэл буцаах бичилт vүсгэх) хийж чадна.
alter table journal_entries add column if not exists reverses_entry_id uuid references journal_entries(id);

drop policy je_write on journal_entries;

create policy je_insert on journal_entries for insert
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

create policy je_update on journal_entries for update
  using (is_supersysadmin())
  with check (is_supersysadmin());

create policy je_delete on journal_entries for delete
  using (is_supersysadmin());

drop policy jel_write on journal_entry_lines;

create policy jel_insert on journal_entry_lines for insert
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

create policy jel_update on journal_entry_lines for update
  using (is_supersysadmin())
  with check (is_supersysadmin());

create policy jel_delete on journal_entry_lines for delete
  using (is_supersysadmin());
