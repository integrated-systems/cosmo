-- 2026-08-27: Дэвшилтэт зүйл #6 — "Оролцооны админ dashboard". Админд
-- ХЭН санал ӨГӨӨГҮЙ байгааг (байр/тоотоор) харуулж, сануулга хүргэх
-- боломж олгоно — ГЭХДЭЭ тэдний АЛЬ сонголтыг хийсэн эсэхийг ХЭЗЭЭ Ч
-- ил гаргахгүй (нууц санал хураалтын зарчим бүрэн хэвээр).
create or replace function public.get_voting_turnout_detail(p_poll_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_poll voting_polls;
begin
  select * into v_poll from voting_polls where id = p_poll_id;
  if v_poll is null then
    raise exception 'Санал асуулга олдсонгүй';
  end if;

  if not (is_supersysadmin() or is_tenant_admin(v_poll.tenant_id)) then
    raise exception 'Зөвшөөргүй';
  end if;

  return coalesce(jsonb_agg(jsonb_build_object(
    'owner_id', o.id,
    'building_no', o.building_no,
    'floor', o.floor,
    'door_no', o.door_no,
    'fullname', trim(both ' ' from concat(o.firstname, ' ', o.lastname)),
    'has_voted', o.id in (select distinct owner_id from voting_responses where poll_id = p_poll_id and owner_id is not null)
  ) order by o.building_no, o.floor, o.door_no), '[]'::jsonb)
  from owners o where o.tenant_id = v_poll.tenant_id;
end;
$function$;

grant execute on function public.get_voting_turnout_detail(uuid) to authenticated;
