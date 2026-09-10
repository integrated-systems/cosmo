-- 2026-09-08 (27): Төлбөрийн мөчлөгийн бүрэн автоматжуулалт —
-- хэрэглэгчийн заасан дараалал: Pending (1 сар) -> Overdue (нэмэлт
-- 1 хоног) -> Paused (нэмэлт 1 сар) -> Устгахад бэлэн (Paused-с
-- хойш Trial=14 хоног, Төлбөртэй=6 сар). "Stopped" статус бүрмөсөн
-- арилав (хүнд гар аргаар үйлчилгээ зогсоох шаардлагагүй болсон).

alter table tenants add column if not exists billing_period_start timestamptz;
alter table tenants add column if not exists paused_at timestamptz;

-- Одоо байгаа мөрүүдийг үнэн зөв анхны утгаар дүүргэв.
update tenants set billing_period_start = coalesce(plan_activated_at, created_at) where billing_period_start is null;
update tenants set paused_at = coalesce(trial_ends_at, now()) where status = 'suspended' and paused_at is null;

-- Хадгалалтын хугацааны тохиргоо (Billing хуудаснаас SUPERSYSADMIN
-- гараар өөрчилдөг) — app_settings хүснэгэлийг дахин ашиглав.
insert into app_settings (key, value) values ('trial_retention_days', '14') on conflict (key) do nothing;
insert into app_settings (key, value) values ('paid_retention_months', '6') on conflict (key) do nothing;

-- Сар бүрийн төлбөрийн мөчлөгийг ажиллуулах цорын ганц функц.
-- ЗААВАЛ trial-ыг оролцуулахгүй (trial-ийг expire_trials() тусад
-- нь удирддаг).
create or replace function public.process_billing_cycles()
returns void
language plpgsql
security definer
as $function$
begin
  -- 1) "Төлөгдсөн" үе дуусаад шинэ мөчлөг эхлэхэд "Хүлээгдэж буй"
  --    рүү автоматаар буцаана (billing_period_start-ыг яг 1 сараар
  --    урагшлуулж, тогтмол "мөчлөгийн өдөр"-ээ хадгална).
  update tenants
  set billing_status = 'pending', billing_period_start = billing_period_start + interval '1 month'
  where billing_status = 'paid' and plan_key <> 'trial' and status = 'active'
    and billing_period_start + interval '1 month' <= now();

  -- 2) "Хүлээгдэж буй" -> "Хугацаа хэтэрсэн" (1 сар + 1 хоног
  --    төлбөргүй үнгэрвэл).
  update tenants
  set billing_status = 'overdue'
  where billing_status = 'pending' and plan_key <> 'trial' and status = 'active'
    and now() > billing_period_start + interval '1 month 1 day';

  -- 3) "Хугацаа хэтэрсэн" -> "Paused" (нэмэлт 1 сар үнгэрвэл, буюу
  --    нийт 2 сар 1 хоног төлбөргүй байвал).
  update tenants
  set status = 'suspended', paused_at = now()
  where billing_status = 'overdue' and plan_key <> 'trial' and status = 'active'
    and now() > billing_period_start + interval '2 months 1 day';
end;
$function$;

select cron.unschedule(jobid) from cron.job where jobname = 'process-billing-cycles-daily';
select cron.schedule(
  'process-billing-cycles-daily',
  '30 1 * * *',
  $$select public.process_billing_cycles();$$
);

-- expire_trials()-ыг ч мөн paused_at тэмдэглэдэг болгов (Rule of
-- two — устгахад бэлэн эсэхийг тооцоход paused_at цорын ганц эх
-- сурвалж болно, Trial vs төлбөртэй tenant аль алинд нь ижил).
create or replace function public.expire_trials()
returns void
language sql
security definer
as $function$
  update tenants
  set status = 'suspended', paused_at = now()
  where plan_key = 'trial'
    and status = 'active'
    and approval_status = 'approved'
    and trial_ends_at is not null
    and trial_ends_at < now();
$function$;
