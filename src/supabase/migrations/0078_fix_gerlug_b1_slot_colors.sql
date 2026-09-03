-- 2026-09-04: Хэрэглэгчийн хүсэлт - "Гэрлүг Виста" B1 давхаргын
-- слотуудын хатуу кодлогдсон borderColor/labelColor (#e2e8f0/#f1f5f9)-
-- ыг null (Автомат, Тоот шиг theme-aware) болгож шинэчилэв.
update basement_floors
set layout_json = jsonb_set(
  layout_json,
  '{slots}',
  (
    select jsonb_agg(
      (slot - 'borderColor' - 'labelColor') || jsonb_build_object('borderColor', null, 'labelColor', null)
    )
    from jsonb_array_elements(layout_json->'slots') as slot
  )
)
where tenant_id='48413dde-247b-420f-badc-5d09e492b8f1' and floor_key='B1';
