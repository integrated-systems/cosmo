-- 2026-09-07: "Удирдах зөвлөл портал" бүлгийн "Үндсэн хөрөнгө бүртгэл"
-- (/fixedassets) хуудас — хэрэглэгчийн хуучин "suh" прототипийн адил
-- баганын бүтэцтэй (БАРКОД/НЭР,БРЕНД/МАРК-СЕРИАЛ/ТӨРӨЛ/Т.ХЭМЖЭЭ/
-- АВСАН ОГНОО/ХУДАЛДАН АВСАН ҮНЭ/ХУРИМТЛАГДСАН ЭЛЭГДЭЛ/ДАНСНЫ ҮЛДЭГДЭЛ
-- ҮНЭ/БАЙРШИЛ/ХАРИУЦАГЧ/ТӨЛӨВ), гэхдээ Cosmo-ийн бодит Supabase
-- backend-тэй холбогдсон, RLS-ээр хамгаалагдсан хувилбар. Clientele.jsx-
-- ийн RLS/индекс загварыг дахин ашигласан (Rule of two).
--
-- ДАНСНЫ үЛДЭГДЭЛ үНЭ нь "generated always" багана — худалдан авсан
-- үнэ/хуримтлагдсан элэгдлээс ЦОРЫН ГАНЦ эх сурвалжаас тооцоологдоно,
-- клиент тал дахин тооцоолохгүй (Rule of two - логик давхардуулахгүй).
create table if not exists fixed_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  barcode text not null,
  name text not null,
  mark_serial text,
  category text,
  qty numeric not null default 1,
  unit text not null default 'ширхэг',
  acquired_date date,
  purchase_price numeric not null default 0,
  accumulated_depreciation numeric not null default 0,
  book_value numeric generated always as (purchase_price - accumulated_depreciation) stored,
  location text,
  responsible_person text,
  status text not null default 'in_use' check (status in ('in_use', 'not_in_use', 'sold', 'written_off')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fixed_assets_tenant_id_idx on fixed_assets(tenant_id);
create unique index if not exists fixed_assets_tenant_barcode_idx on fixed_assets(tenant_id, barcode);

alter table fixed_assets enable row level security;

create policy "fixed_assets: tenant-аараа хязгаарлана"
  on fixed_assets for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

-- Тухайн tenant-д дараагийн боломжит цуваа дугаар (barcode) буцаах туслах
-- функц — фронт талд "0001", "0002" гэх мэт дэс дугаар автоматаар санал
-- болгоход ашиглана (хэрэглэгч бичихийг хүсвэл дарж болно).
create or replace function public.next_fixed_asset_barcode(p_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $function$
  select lpad((coalesce(max(nullif(regexp_replace(barcode, '\D', '', 'g'), '')::int), 0) + 1)::text, 4, '0')
  from fixed_assets
  where tenant_id = p_tenant_id;
$function$;

grant execute on function public.next_fixed_asset_barcode(uuid) to authenticated;
