-- 2026-09-13 (49): БОДИТ АЛДАА ЗАСАВ — UserApp-ийн "Төлбөр" хуудсыг
-- (OwnerPayment.jsx) бодит invoices-тэй холбохоор бэлдэж байхад,
-- invoices_select RLS policy зөвхөн АЖИЛТНЫ эрхийг (my_tenant_ids())
-- шалгадаг бөгөөд, msgr_list-ийн адил РЕЗИДЕНТ (owner)-ийн шууд
-- хандалт огт байгаагүй байсныг олов — резидент хэрэглэгч өөрийн
-- нэхэмжлэхээ уншиж чадахгүй байх байв. Invoice.jsx (admin)-ийн
-- target_id тооцооллын 3 үеийн fallback-тай (unit_layouts.id ->
-- grid_parkings/grid_storages-ийн 1-р UUID -> owner.id) яг ижил
-- логикоор тухайн auth.uid()-ийн ЯГ ХАРАХ ёстой target_id-г тодорхойлж
-- өгөх функц үүсгэж, invoices_select policy-д нэмнэ.
create or replace function public.my_owner_invoice_target_id()
returns uuid
language sql
security definer
stable
as $$
  select
    coalesce(
      (select ul.id from unit_layouts ul where ul.tenant_id = o.tenant_id and ul.building_no = o.building_no and ul.floor = o.floor and ul.door_no = o.door_no),
      case when o.building_no is null and o.has_grid_parking and jsonb_array_length(coalesce(o.grid_parkings, '[]'::jsonb)) > 0
           then nullif(split_part(o.grid_parkings->0->>'id', ':', 2), '')::uuid end,
      case when o.building_no is null and o.has_grid_storage and jsonb_array_length(coalesce(o.grid_storages, '[]'::jsonb)) > 0
           then nullif(split_part(o.grid_storages->0->>'id', ':', 2), '')::uuid end,
      o.id
    )
  from owners o
  where o.user_id = auth.uid()
  limit 1;
$$;

drop policy if exists "invoices_select" on invoices;
create policy "invoices_select" on invoices for select
  using (
    is_supersysadmin()
    or (tenant_id in (select my_tenant_ids()))
    or (target_type = 'owner' and target_id = public.my_owner_invoice_target_id())
  );
