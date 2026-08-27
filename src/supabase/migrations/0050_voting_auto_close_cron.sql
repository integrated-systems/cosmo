-- 2026-08-27: Дэвшилтэт зүйл #5 — "Автомат хаах cron". expire_trials()
-- cron-той яг ижил загвараар: end_at хугацаа дууссан ч гэсэн статус
-- нь "active" хэвээр үлдсэн санал асуулгуудыг тогтмол хугацаанд
-- "closed" болгож шинэчилнэ.

create or replace function public.close_expired_polls()
returns void
language plpgsql
security definer
as $function$
begin
  update voting_polls
  set status = 'closed'
  where status = 'active' and end_at is not null and end_at < now();
end;
$function$;

select cron.schedule(
  'close-expired-polls-every-15min',
  '*/15 * * * *',
  $$select public.close_expired_polls()$$
);
