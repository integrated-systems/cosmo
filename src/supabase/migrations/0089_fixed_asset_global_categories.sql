-- 2026-09-07 (6): Ангилал/Терел-ийг ГЛОБАЛ стандарт өгөгдөл болгов —
-- Монголын НББ-ийн стандарт хөрөнгийн ангилал/бүлэглэл нэг л удаа
-- үүсгэгдээд бүх tenant автоматаар өвлөнө (tenant_id тус бүрт
-- дахин бичихийг шаардахгүй). Гэрлүг Вистагийн хэрэглэгчийн аль
-- хэдийн үүсгэсэн 7 ангилал/37 терелийг ГЛОБАЛ болгож хөрвүүлэв.
alter table fixed_asset_categories alter column tenant_id drop not null;
alter table fixed_asset_types alter column tenant_id drop not null;

update fixed_asset_categories set tenant_id = null;
update fixed_asset_types set tenant_id = null;

drop policy if exists "fixed_asset_categories: tenant-аараа хязгаарлана" on fixed_asset_categories;
create policy "fixed_asset_categories: бүгд харна, зөвхөн SUPERSYSADMIN засна"
  on fixed_asset_categories for select
  using (true);
create policy "fixed_asset_categories: SUPERSYSADMIN бичнэ"
  on fixed_asset_categories for insert
  with check (is_supersysadmin());
create policy "fixed_asset_categories: SUPERSYSADMIN шинэчилнэ"
  on fixed_asset_categories for update
  using (is_supersysadmin())
  with check (is_supersysadmin());
create policy "fixed_asset_categories: SUPERSYSADMIN устгана"
  on fixed_asset_categories for delete
  using (is_supersysadmin());

drop policy if exists "fixed_asset_types: tenant-аараа хязгаарлана" on fixed_asset_types;
create policy "fixed_asset_types: бүгд харна, зөвхөн SUPERSYSADMIN засна"
  on fixed_asset_types for select
  using (true);
create policy "fixed_asset_types: SUPERSYSADMIN бичнэ"
  on fixed_asset_types for insert
  with check (is_supersysadmin());
create policy "fixed_asset_types: SUPERSYSADMIN шинэчилнэ"
  on fixed_asset_types for update
  using (is_supersysadmin())
  with check (is_supersysadmin());
create policy "fixed_asset_types: SUPERSYSADMIN устгана"
  on fixed_asset_types for delete
  using (is_supersysadmin());

-- Газар зэрэг ЭЛЭГДЭХГүй терелийг тэмдэглэх. Category биш type
-- түвшинд, учир нь "үл хөдлөх хөрөнгө" ангилалд элэгддэг (Барилга)
-- болон элэгддэггүй (Газар) терел хамт байна.
alter table fixed_asset_types add column if not exists is_depreciable boolean not null default true;
update fixed_asset_types set is_depreciable = false where name = 'Газар';

-- Хурдасгасан (бууралтын үлдэгдэл) элэгдлийн ГАРААР сонгосон жилийн
-- хувь — өмнөх код 2/ашиглах хугацаа гэсэн буруу таамаглалыг орлов.
alter table fixed_assets add column if not exists annual_depreciation_rate numeric;
