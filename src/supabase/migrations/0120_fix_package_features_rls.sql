-- 2026-09-09 (43): БОДИТ АЛДАА ЗАСАВ — package_features хүснэгэл
-- зөвхөн SUPERSYSADMIN унших эрхтэй (qual: is_supersysadmin())
-- байсан тул, энгийн tenant_admin хэрэглэгчийн хувьд энэ хүснэгэл
-- үргэлж БҮРЭН ХООСОН харагддаг байсан. ҮҮнээс үүдэн
-- usePlanFeatures()-ийн hasFeature() функц "тохиргоогүй key ->
-- анхдагчаар нээлттэй" гэсэн fallback-аараа үргэлж TRUE буцааж,
-- Basic tenant ч БҮХ модулийг харж чадаж байсан бодит цоорхой
-- үүсгэсэн байв (хэрэглэгч session simulation-ээр биш, бодит
-- browser-ээр тестэлж илрүүлсэн).
--
-- Засвар: SELECT-ийг БҮХ нэвтэрсэн хэрэглэгчид нээлттэй болгож
-- (энэ бол зөвхөн "аль багц ямар модультай" гэсэн ерөнхий
-- лавлах мэдээлэл, tenant-д мэдрэмтгий зүйл биш), харин INSERT/
-- UPDATE/DELETE-ийг SUPERSYSADMIN л хэвээр үлдээв.
drop policy if exists "package_features: SUPERSYSADMIN л" on package_features;

create policy "package_features_select" on package_features for select
  using (true);
create policy "package_features_write" on package_features for insert
  with check (is_supersysadmin());
create policy "package_features_update" on package_features for update
  using (is_supersysadmin())
  with check (is_supersysadmin());
create policy "package_features_delete" on package_features for delete
  using (is_supersysadmin());
