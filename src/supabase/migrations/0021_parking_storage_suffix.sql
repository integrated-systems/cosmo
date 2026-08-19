-- Integrated Systems (Cosmo) — 2026-08-19: Бодит хотхонд "G186а" маягийн
-- (тоо+кирилл vсэг дагавартай, ганцхан тусгай дугаар) зогсоол/агуулах
-- тааралдсанаар олдсон бvтцийн дутагдал. Бvсийн хvрээн (start-end) загвар
-- ийм дан ганц тусгай дугаарыг илэрхийлэх боломжгvй тул `suffix` талбар
-- нэмэв, unique constraint-д мвн оруулав (186 ба 186а хоёр ӨӨР мвр байх
-- ёстой).
alter table unit_parking add column if not exists suffix text;
alter table unit_storage add column if not exists suffix text;

alter table unit_parking drop constraint if exists unit_parking_tenant_id_floor_level_zone_label_spot_no_key;
alter table unit_parking add constraint unit_parking_unique_spot unique (tenant_id, floor_level, zone_label, spot_no, suffix);

alter table unit_storage drop constraint if exists unit_storage_tenant_id_floor_level_zone_label_spot_no_key;
alter table unit_storage add constraint unit_storage_unique_spot unique (tenant_id, floor_level, zone_label, spot_no, suffix);
