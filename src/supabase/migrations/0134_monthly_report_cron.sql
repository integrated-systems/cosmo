-- 2026-09-20 (57): "Өмнөх сарын тайлан мэдээ" автомат нийтлэлт —
-- pg_cron өдөр бүр дуудаж, send-monthly-report-news Edge Function-ыг
-- ажиллуулна (trg_notify_official_notice-тэй ЯГ ИЖИЛ загвар:
-- vault.decrypted_secrets-ийн EDGE_FUNCTION_BASE_URL ашиглаж, алдаа
-- гарвал л үл тоож дараагийн өдөр дахин оролдоно).
create or replace function public.cron_send_monthly_report_news()
returns void
language plpgsql
security definer
as $$
declare
  v_base_url text;
begin
  begin
    select decrypted_secret into v_base_url from vault.decrypted_secrets where name = 'EDGE_FUNCTION_BASE_URL' limit 1;
    if v_base_url is not null then
      perform net.http_post(
        url := v_base_url || '/send-monthly-report-news',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    end if;
  exception when others then
    null;
  end;
end;
$$;

select cron.schedule('send-monthly-report-news-daily', '0 0 * * *', 'select public.cron_send_monthly_report_news();');
