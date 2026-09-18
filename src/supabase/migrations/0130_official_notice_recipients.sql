-- 2026-09-13 (53): "Мессенжер" гэж буруу нэрлэсэн сувгийг "In-app"
-- болгож, тусдаа (msgr_list/msgr_messages-ээс БүРЭН тусгаарлагдсан)
-- "Албан мэдэгдэл хvлээн авах" inbox болгов. Vvний давуу тал:
-- Талбай өмчлөгч (client) ч мөн бодит In-app мэдэгдэл хүлээн авах
-- боломжтой болно (msgr_list зөвхөн owner_id-тэй тул өмнө нь client
-- Мессенжерээр огт мэдэгдэл авдаггүй байсан цоорхойг ч засна).
create table official_notice_recipients (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references official_notices(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid references owners(id) on delete cascade,
  client_id uuid references clientele(id) on delete cascade,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table official_notice_recipients enable row level security;

create policy "official_notice_recipients_select" on official_notice_recipients for select
  using (
    is_supersysadmin()
    or is_staff_member(tenant_id)
    or (owner_id in (select id from owners where user_id = auth.uid()))
  );

create policy "official_notice_recipients_insert" on official_notice_recipients for insert
  with check (is_supersysadmin() or is_staff_member(tenant_id));

-- Резидент eeрийн мэдэгдлийг "уншсан" гэж тэмдэглэх боломжтой байх
-- ёстой тул, UPDATE эрхэд ч owner_id тохирлыг оруулав.
create policy "official_notice_recipients_update" on official_notice_recipients for update
  using (
    is_supersysadmin()
    or is_staff_member(tenant_id)
    or (owner_id in (select id from owners where user_id = auth.uid()))
  );

-- send-msgr-push-тэй ЯГ ИЖИЛ Web Push (VAPID) протоколоор шинэ Албан
-- мэдэгдэл ирэхэд push notification илгээнэ.
create or replace function public.trg_notify_official_notice()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_base_url text;
begin
  begin
    select decrypted_secret into v_base_url from vault.decrypted_secrets where name = 'EDGE_FUNCTION_BASE_URL' limit 1;
    if v_base_url is not null then
      perform net.http_post(
        url := v_base_url || '/send-official-notice-push',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('recipient_id', new.id)
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger trg_official_notice_push
after insert on official_notice_recipients
for each row execute function trg_notify_official_notice();
