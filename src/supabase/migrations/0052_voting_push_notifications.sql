-- 2026-08-27: Дэвшилтэт зүйл #7 — Push notification. Санал асуулга
-- "идэвхжих" (draft/closed → active) үед тухайн СӨХ-ийн бүх бүртгэлтэй
-- push-subscription-той хэрэглэгчид мэдэгдэл илгээнэ.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on push_subscriptions
  for select using (user_id = auth.uid());
create policy "push_subscriptions_insert_own" on push_subscriptions
  for insert with check (user_id = auth.uid());
create policy "push_subscriptions_delete_own" on push_subscriptions
  for delete using (user_id = auth.uid());

-- push notification trigger-д зориулж pg_net extension шаардлагатай
-- (HTTP дуудлага хийхэд ашиглана).
create extension if not exists pg_net with schema extensions;

-- Edge Function-г дуудах trigger — poll "active" болмогц (шинээр
-- үүсгэсэн ч бай, "Нийтлэх" дарж шинэчилсэн ч бай) л ажиллана.
-- EDGE_FUNCTION_BASE_URL нэртэй vault secret-ийг Supabase dashboard →
-- Vault-аас нэг удаа гараар тохируулна (жиш нь:
-- https://xcklljptitpvkvnifdxu.supabase.co/functions/v1). Тохируулаагүй
-- бол push илгээгдэхгүй ч, санал асуулга үүсгэх үйлдэлд НҮЛВВЛЭХГҮЙ
-- (exception барьж алгасна).
create or replace function public.notify_voting_poll_opened()
returns trigger
language plpgsql
security definer
as $function$
declare
  v_base_url text;
begin
  if new.status = 'active' and (old is null or old.status is distinct from 'active') then
    begin
      select decrypted_secret into v_base_url from vault.decrypted_secrets where name = 'EDGE_FUNCTION_BASE_URL' limit 1;
      if v_base_url is not null then
        perform net.http_post(
          url := v_base_url || '/send-voting-push',
          headers := jsonb_build_object('Content-Type', 'application/json'),
          body := jsonb_build_object('poll_id', new.id, 'tenant_id', new.tenant_id, 'title', new.title)
        );
      end if;
    exception when others then
      null; -- Push илгээх нь үндсэн санал асуулга үүсгэх үйлдлийг блоклохгүй
    end;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_notify_voting_poll_opened on voting_polls;
create trigger trg_notify_voting_poll_opened
  after insert or update on voting_polls
  for each row execute function public.notify_voting_poll_opened();
