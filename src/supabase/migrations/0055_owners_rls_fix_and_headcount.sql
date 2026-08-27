-- 2026-08-27: OwnerApp Дашбоард (хуучин "suh" төслөөс шилжүүлэх) хийх
-- явцад ОЛСОН 2 бодит РЛС ЦООРХОЙГ засав:
--
-- 1) "owners" хүснэгэл өмнө нь "for all ... tenant-аараа хязгаарлана"
--    гэсэн НЭГ л policy-тэй байсан — үүний учир ямар ч role (тэр
--    тоонд ердийн 'owner' role-той резидент ч) тухайн tenant-ийн БүХ
--    бусад өмчлөгчийн БүХ хувийн мэдээллийг (регистр, утас, и-мэйл)
--    шууд REST API-аар уншиж, бүр ЗАСАХ/УСТГАХ ч чадах эрсдэлтэй
--    байсан (миний UserAppProfile.jsx client талдаа .eq('user_id',...)
--    гэж шүүдэг ч, энэ бол зүгээр КЛИЕНТ талын шүүлт — RLS биш тул
--    мэргэжлийн хэрэглэгч шууд Supabase REST дуудаж тойрч болно байсан).
--    Одоо: staff (owner БИШ role) бүгдийг харна/бичнэ, харин 'owner'
--    role-той хүн ЗӨВХӨН ӨӨРИЙН мврийг л харна, бичих боломжгүй.
--
-- 2) "restmarket" мөн адил "for all" нэг policy-тэй
--    байсан — Дашбоардаар дамжуулан owner-үүдэд унших эрх нээхийн
--    өмнө, тэднийг БИЧИХ боломжтой байснаас урьдчилан сэргийлэв.
--
-- ⚠️ 2026-08-27 ОЛСОН НЭМЭЛТ ЗӨРЧИЛ: 0001_init.sql файлын policy нэр
-- Кирилл ("tenant-аараа хязгаарлана") байсан ч, БОДИТООР Supabase дээр
-- ажилласан policy-ийн нэр Latin transliteration ("tenant-aaraa
-- hyazgaarlana") байсан — өөрөөр хэлбэл АЛЬ НЭГ үе шатанд репод байгаа
-- .sql файл БОДИТ deploy хийсэн хувилбараас ЗӨРСӨН байна. Иймд ЭНЭ
-- migration-ий policy нэрсийг ч мөн Latin-аар бичиж, бодит DB-тэй
-- нийцүүлэв (ирээдүйд DROP POLICY хийх үед дахин ийм зөрчилд өртөхгүй
-- байхын тулд; гэхдээ энэ нь зөвхөн policy НЭР (identifier)-д хамаарна,
-- comment/logic бүгд Кирилл хэвээрээ).
create or replace function public.is_staff_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
as $function$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and tenant_id = p_tenant_id and role <> 'owner'
  );
$function$;

drop policy if exists "owners: tenant-aaraa hyazgaarlana" on owners;

create policy "owners: staff bugdiig harna, owner zovhon ooriigoo" on owners
  for select using (
    is_supersysadmin() or is_staff_member(tenant_id) or user_id = auth.uid()
  );
create policy "owners: staff l burtgene" on owners
  for insert with check (is_supersysadmin() or is_staff_member(tenant_id));
create policy "owners: staff l shinechilne" on owners
  for update using (is_supersysadmin() or is_staff_member(tenant_id))
  with check (is_supersysadmin() or is_staff_member(tenant_id));
create policy "owners: staff l ustgana" on owners
  for delete using (is_supersysadmin() or is_staff_member(tenant_id));

drop policy if exists "real_estate_market_prices: tenant-aaraa hyazgaarlana" on restmarket;

create policy "restmarket: gishuun bur unshina" on restmarket
  for select using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "restmarket: zovhon staff bichne" on restmarket
  for insert with check (is_supersysadmin() or is_staff_member(tenant_id));
create policy "restmarket: zovhon staff shinechilne" on restmarket
  for update using (is_supersysadmin() or is_staff_member(tenant_id))
  with check (is_supersysadmin() or is_staff_member(tenant_id));
create policy "restmarket: zovhon staff ustgana" on restmarket
  for delete using (is_supersysadmin() or is_staff_member(tenant_id));

-- Дашбоардын "Нийт оршин суугчид/сууц" статистик (бодит тоо) — owner
-- эрхтэй хүн ч гэсэн ХАМТ НИЙЛБЭРийг л харна, бусдын хувийн мврийг
-- шууд харахгүй (дээрх RLS-ээр аль хэдийн хамгаалагдсан ч, энэ RPC
-- нэмэлт давхар баталгаа болгон зориулж үүсгэв).
create or replace function public.get_tenant_headcount(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not (is_supersysadmin() or p_tenant_id in (select my_tenant_ids())) then
    raise exception 'Zovshoorgui'; -- deploy хийсэн бодит хувилбартай тохируулав
  end if;
  return (
    select jsonb_build_object('owner_count', count(*), 'total_people', coalesce(sum(people_count), 0))
    from owners where tenant_id = p_tenant_id
  );
end;
$function$;

grant execute on function public.get_tenant_headcount(uuid) to authenticated;
