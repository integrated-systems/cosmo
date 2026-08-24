-- 2026-08-19: Trial дуусахад "Paused" (suspended) статустай болдог
-- автоматжуулалт. pg_cron ашиглан үдөр бүр шалгаж, Trial дуусаад
-- төлбөр төлөөгүй хэвээр байгаа tenant-үүдийг suspended болгоно.
-- "Stopped" (cancelled)-ыг зориудаар СОНГООГүй — Paused нь эргүүлж
-- болох (reversible), дата хадгалагдана, ХАМГИЙН эрсдэлгүй анхдагч.
create extension if not exists pg_cron;

create or replace function public.expire_trials()
returns void
language sql
security definer
as $function$
  update tenants
  set status = 'suspended'
  where plan_key = 'trial'
    and status = 'active'
    and approval_status = 'approved'
    and trial_ends_at is not null
    and trial_ends_at < now();
$function$;

select cron.schedule(
  'expire-trials-daily',
  '0 0 * * *',
  $$select public.expire_trials()$$
);
