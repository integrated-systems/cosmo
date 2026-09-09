-- 2026-09-08 (22): Хандалт хаах хамгаалалтыг client-side (React)
-- шалгалтаас гадна СЕРВЕР ТАЛД (RLS) бодитоор хэрэгжүүлэв.
-- my_tenant_ids() бол Ангилал/Терел, Үндсэн хөрөнгө, Тооллого,
-- Мессенжер зэрэг үнэндээ БүХ RLS policy-ийн "tenant_id in (select
-- my_tenant_ids())" шалгалтын үндэс (нэг л газраас, Rule of two) тул
-- ЭНД tenants.status='suspended' үед тухайн tenant-ийг жагсаалтаас
-- хасахад хүрэлцэнэ — 40 гаруй хүснэгэл тус бүрийн policy-г
-- нэг нэгээр өөрчлөх шаардлагагүй. SUPERSYSADMIN-ийн is_supersysadmin()
-- OR салаа үүнээс тусдаа үлдэх тул нөлөөлөхгүй (тэд үргэлж хандана).
create or replace function public.my_tenant_ids()
returns setof uuid
language sql
stable
security definer
as $function$
  select ur.tenant_id
  from user_roles ur
  join tenants t on t.id = ur.tenant_id
  where ur.user_id = auth.uid()
    and ur.tenant_id is not null
    and t.status <> 'suspended';
$function$;
