-- 2026-08-31: "Конструктор (React)" туршилтын хэрэгсэлд зориулсан
-- хадгалалт — НЭГ ДАВХАРГА = НЭГ JSON blob (тусдаа мвр биш), учир нь
-- слот/полигон устгах үед orphan мвр үлдэхээс сэргийлнэ (хэрэглэгчийн
-- заасны дагуу). "Хадгалах" (ноорог) үед status өөрчлвгддэггүй,
-- "Нийтлэх" үед л published болно.
create table if not exists basement_floors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  floor_key text not null,
  layout_json jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now(),
  unique(tenant_id, floor_key)
);

alter table basement_floors enable row level security;

create policy "basement_floors: staff бүгдийг харж удирдана"
on basement_floors for all
using (is_supersysadmin() or is_staff_member(tenant_id))
with check (is_supersysadmin() or is_staff_member(tenant_id));

-- upsert үед updated_at автоматаар шинэчлэгдэнэ.
create or replace function public.trg_basement_floors_touch()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists trg_touch_basement_floors on basement_floors;
create trigger trg_touch_basement_floors
  before update on basement_floors
  for each row execute function trg_basement_floors_touch();
