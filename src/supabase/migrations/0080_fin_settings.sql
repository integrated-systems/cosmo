-- 2026-09-04: "Санхүүгийн тохиргоо" (finconfig) хуудасны НББ хэсэгт
-- зориулсан ганц мврт тохиргоо (tenant бүрт НЭГ мвр) — "Хүримтлалын
-- сан", "Төлбөрийн хоцрогдол", "Хотхоны хаалт" гэсэн 3 картын
-- үзүүлэлтүүдийг агуулна.
create table if not exists fin_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  -- Хүримтлалын сан
  monthly_reserve_amount numeric not null default 0,
  -- Төлбөрийн хоцрогдол (Сууц өмчлөгч БОЛОН Талбай өмчлөгч хоёуланд
  -- адилхан үйлчлэх ерөнхий нэг тохиргоо — тус тусад нь биш)
  overdue_penalty_pct numeric not null default 0,
  overdue_days numeric not null default 30,
  at_risk_days numeric not null default 180,
  -- Хотхоны хаалт (Хаалтны тариф)
  gate_unit_minutes numeric not null default 15,
  gate_unit_price numeric not null default 0,
  gate_temp_stop_interval_minutes numeric not null default 15,
  gate_free_guest_minutes numeric not null default 60,
  updated_at timestamptz not null default now()
);

alter table fin_settings enable row level security;

create policy "staff бүгдийг харна" on fin_settings for select
  using (true);

create policy "staff бүртгэж, засна" on fin_settings for all
  using (true) with check (true);
