-- 2026-09-07 (4): Баркодын бүтцийг хэрэглэгчийн шийдвэрийн дагуу
-- "{СӨХ-ны регистрийн дугаар}-{дэс дугаар}" болгов (жиш: 1234567-0001).
-- Регистрийн дугаар нь org_report_info.reg_no-с ирнэ (Санхүүгийн
-- тохиргоо → НББ → Тайланд дуудагдах мэдээлэл → Байгууллагын мэдээлэл
-- картны талбар). Уникаль байдлыг бодитоор ЦОРЫН ГАНЦ дэс дугаар
-- баталгаажуулна (регистрийн дугаар бүх хөрөнгөд ижил тул өөрөө
-- уникаль биш, зөвхөн танигдах префикс).
--
-- Дэс дугаарыг тооцоолохдоо ХАМГИЙН СүүЛИЙН "-" тэмдэгтийн ард байгаа
-- хэсгээс л цифр гаргаж авна (регистрийн дугаар өөрөө тоо агуулж
-- болзошгүй тул бүх мврийн цифрүүдийг холихгүй байхын тулд).
create or replace function public.next_fixed_asset_barcode(p_tenant_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_reg_no text;
  v_max_seq int;
begin
  select nullif(trim(reg_no), '') into v_reg_no
  from org_report_info
  where tenant_id = p_tenant_id;

  select coalesce(max(nullif(regexp_replace(regexp_replace(barcode, '^.*-', ''), '\D', '', 'g'), '')::int), 0)
  into v_max_seq
  from fixed_assets
  where tenant_id = p_tenant_id;

  return coalesce(v_reg_no, 'HOA') || '-' || lpad((v_max_seq + 1)::text, 4, '0');
end;
$function$;
