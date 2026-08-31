-- 2026-08-30: Хэрэглэгчийн хүсэлт — үндсэн программ болон OwnerApp
-- хоёрын хооронд Мессенжерээр зурвас солилцоход ЯМАР Ч realtime push
-- notification, badge үзүүлэлт ажилладаггүй байсныг засав. Badge
-- талыг (Sidebar/OwnerApp tile) 0062-т Realtime publication-аар аль
-- хэдийн шийдсэн — үүнд ДУТУУ байсан зүйл нь бодит PUSH notification
-- (аппаа хааж орхисон үед ч мэдэгддэг) байв.
create or replace function public.trg_notify_msgr_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_base_url text;
begin
  begin
    select decrypted_secret into v_base_url from vault.decrypted_secrets where name = 'EDGE_FUNCTION_BASE_URL' limit 1;
    if v_base_url is not null then
      perform net.http_post(
        url := v_base_url || '/send-msgr-push',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('message_id', new.id)
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$function$;

drop trigger if exists trg_msgr_message_push on msgr_messages;
create trigger trg_msgr_message_push
  after insert on msgr_messages
  for each row execute function trg_notify_msgr_message();
