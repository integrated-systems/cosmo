-- Integrated Systems (Cosmo) — Зогсоолын дугаарлалт (/addressing,
-- "Зогсоол" таб). unit_layouts-ээс ялгаатай нь: байртай (building)
-- ХОЛБООГvй, tenant (хотхон) даяар нэг нийтлэг сан (2026-08-19
-- хэрэглэгч тодорхой заасан).
--
-- Бvтэц: floor_level(чөлөөт текст, "B1"/"F2" гэх мэт — хотхон бvрд
-- давхаргvй/олон давхартай, доош/дээш аль аль тийш байж болно) +
-- zone_label(бvсийн тэмдэглэл, vсэг эсвэл тоо байж болно) + separator
-- (vгvй/"-"/"/"/зай) + spot_no. ЯГ ИЖИЛ zone_label+spot_no хослол өөр
-- өөр floor_level дээр ДАВТАГДАЖ болно (жиш: "B1 давхрын G145" ба
-- "B2 давхрын G145" хоёр тусдаа зогсоол) — тул unique constraint-д
-- floor_level заавал орно.
create table if not exists parking_spots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  floor_level text not null,
  zone_label text not null,
  separator text not null default '',
  spot_no integer not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, floor_level, zone_label, spot_no)
);
create index if not exists parking_spots_tenant_id_idx on parking_spots(tenant_id);

alter table parking_spots enable row level security;

create policy "parking_spots: tenant-аараа хязгаарлана"
  on parking_spots for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
