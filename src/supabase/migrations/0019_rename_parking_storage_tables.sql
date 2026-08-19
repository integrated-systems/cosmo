-- Integrated Systems (Cosmo) — 2026-08-19: "unit_layouts"-ийн хажууд
-- цэгцтэй (цагаан толгойн дараалалтай) харагдахаар хэрэглэгч заасны
-- дагуу parking_spots/storage_units-ийг unit_parking/unit_storage болгож
-- сольсон. Индекс/constraint/RLS policy-ийг ч мвн нэртэй нь тааруулав.
alter table parking_spots rename to unit_parking;
alter table storage_units rename to unit_storage;

alter index parking_spots_pkey rename to unit_parking_pkey;
alter index parking_spots_tenant_id_floor_level_zone_label_spot_no_key rename to unit_parking_tenant_id_floor_level_zone_label_spot_no_key;
alter index parking_spots_tenant_id_idx rename to unit_parking_tenant_id_idx;

alter index storage_units_pkey rename to unit_storage_pkey;
alter index storage_units_tenant_id_floor_level_zone_label_spot_no_key rename to unit_storage_tenant_id_floor_level_zone_label_spot_no_key;
alter index storage_units_tenant_id_idx rename to unit_storage_tenant_id_idx;

alter policy "parking_spots: tenant-аараа хязгаарлана" on unit_parking rename to "unit_parking: tenant-аараа хязгаарлана";
alter policy "storage_units: tenant-аараа хязгаарлана" on unit_storage rename to "unit_storage: tenant-аараа хязгаарлана";
