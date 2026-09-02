-- 2026-08-31: Хэрэглэгчийн хүсэлт — "Түр зогсоол бүртгэл" (admin) /
-- "Зочин урих" (OwnerApp) — мвн адил хэзээ ч бодитоор бүтээгдээгүй
-- placeholder цэс байсныг бүрэн ажилладаг болгов. Owner зочны машины
-- дугаарыг (4 орон + 3 үсэг, Монголын дугаарын формат) бүртгүүлж,
-- хотхоны хаалт үүнийг уншиж нэвтрүүлдэг, 60 минут үнэгүй, дараа нь
-- тариф тооцно.
create table if not exists guest_parking_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  car_number text not null,
  requested_at timestamptz not null default now(),
  entered_at timestamptz,
  exited_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'entered', 'finished')),
  amount_due numeric,
  created_at timestamptz not null default now()
);

alter table guest_parking_requests enable row level security;

create policy "guest_parking: staff бүгдийг харна/удирдана"
on guest_parking_requests for all
using (is_supersysadmin() or is_staff_member(tenant_id))
with check (is_supersysadmin() or is_staff_member(tenant_id));

create policy "guest_parking: owner өврийн хүсэлтийг харна"
on guest_parking_requests for select
using (owner_id in (select id from owners where user_id = auth.uid()));

create policy "guest_parking: owner өврийн нэрээр үүсгэнэ"
on guest_parking_requests for insert
with check (
  tenant_id in (select my_tenant_ids())
  and owner_id in (select id from owners where user_id = auth.uid())
);

-- Admin-ийн жагсаалтад үРЬСАН СУУЦ ВМЧЛВГЧ-ийн нэр+тоот-той хамт
-- нэг дуудлагаар татах RPC.
create or replace function public.get_guest_parking_requests(p_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'requested_at', g.requested_at,
    'entered_at', g.entered_at,
    'exited_at', g.exited_at,
    'status', g.status,
    'amount_due', g.amount_due,
    'car_number', g.car_number,
    'owner_name', coalesce(nullif(trim(both ' ' from concat(o.firstname, ' ', o.lastname)), ''), 'Тодорхойгүй'),
    'owner_unit', coalesce(o.door_no::text, ''),
    'exceeded_minutes', case
        when g.entered_at is null then null
        else greatest(0, floor(extract(epoch from (coalesce(g.exited_at, now()) - g.entered_at)) / 60 - 60))
      end
  ) order by g.requested_at desc), '[]'::jsonb) into v_result
  from guest_parking_requests g
  left join owners o on o.id = g.owner_id
  where g.tenant_id = p_tenant_id
    and (is_supersysadmin() or is_staff_member(p_tenant_id));

  return v_result;
end;
$function$;

grant execute on function public.get_guest_parking_requests(uuid) to authenticated;
