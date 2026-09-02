-- 2026-08-31: Хэрэглэгчийн хүсэлт — "Шуурхай"/"Сэрэмжлүүлэг"/"Ноцтой"
-- ангилалтай мэдээ нийтлэгдэхэд push notification (дуут дохио,
-- баннер) илгээнэ. Энгийн (яаралтай биш) мэдээ зүгөөр silent badge-
-- тэй үлдэнэ (өөрчлөлт үгүй). Санал асуулга/Мессенжерийн push-той
-- ижил Web Push протокол ашиглана.
create or replace function public.trg_notify_urgent_news()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_base_url text;
  v_was_published boolean;
begin
  v_was_published := (TG_OP = 'UPDATE' and OLD.status = 'published');
  if new.status = 'published' and (new.urgent or new.warning or new.critical) and not v_was_published then
    begin
      select decrypted_secret into v_base_url from vault.decrypted_secrets where name = 'EDGE_FUNCTION_BASE_URL' limit 1;
      if v_base_url is not null then
        perform net.http_post(
          url := v_base_url || '/send-news-push',
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body := jsonb_build_object('news_id', new.id)
        );
      end if;
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_urgent_news_push on news;
create trigger trg_urgent_news_push
  after insert or update on news
  for each row execute function trg_notify_urgent_news();
