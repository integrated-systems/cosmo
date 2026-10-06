-- 2026-09-30: Нэхэмжлэх автоматжуулалт — cron_send_monthly_report_news()-тэй
-- яг ижил загвар (Rule of two).
create or replace function public.cron_auto_register_invoices()
returns void
language plpgsql
security definer
as $function$
declare
  v_base_url text;
begin
  begin
    select decrypted_secret into v_base_url from vault.decrypted_secrets where name = 'EDGE_FUNCTION_BASE_URL' limit 1;
    if v_base_url is not null then
      perform net.http_post(
        url := v_base_url || '/auto-register-invoices',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    end if;
  exception when others then
    null;
  end;
end;
$function$;

create or replace function public.cron_send_invoice_notifications()
returns void
language plpgsql
security definer
as $function$
declare
  v_base_url text;
begin
  begin
    select decrypted_secret into v_base_url from vault.decrypted_secrets where name = 'EDGE_FUNCTION_BASE_URL' limit 1;
    if v_base_url is not null then
      perform net.http_post(
        url := v_base_url || '/send-invoice-notifications',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    end if;
  exception when others then
    null;
  end;
end;
$function$;

select cron.schedule('auto-register-invoices-daily', '0 0 * * *', $$select public.cron_auto_register_invoices();$$);
select cron.schedule('send-invoice-notifications-daily', '15 0 * * *', $$select public.cron_send_invoice_notifications();$$);
