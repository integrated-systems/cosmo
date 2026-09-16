-- 2026-09-13 (47): БОДИТ АЛДАА ЗАСАВ — 0123 migration-д нэмсэн
-- property_no_parking/property_no_storage (owner/clientele дээрх
-- НЭГ ганц талбар) нь 1-ээс олон зогсоол/агуулах нэмэхэд зөвхөн
-- ЭХНИЙ мөрөнд л ӨУБД харагддаг, үлдсэн мөрүүдэд огт харагддаггүй
-- дутуу зохион байгуулалт үүсгэсэн байсныг хэрэглэгч олов. Үүнийг
-- зогсоол/агуулах БҮР өөрийн ганц бүртгэлийн дугаартай байдгаар
-- зассан — property_no-г grid_parkings/grid_storages (jsonb массив)
-- доторх мөр бүрт нь ("propertyNo" гэсэн шинэ түлхүүр) хадгалдаг
-- болгосон тул, тусдаа owner/clientele баганад хадгалах шаардлагагүй
-- боллоо (0 бодит мөр ашигласан тул устгах аюулгүй).
alter table owners drop column if exists property_no_parking;
alter table owners drop column if exists property_no_storage;
alter table clientele drop column if exists property_no_parking;
alter table clientele drop column if exists property_no_storage;
