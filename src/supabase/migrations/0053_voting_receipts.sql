-- 2026-08-27: Дэвшилтэт зүйл #8 — "Санал өгсний баталгаажуулах баримт
-- (QR)". Owner санал өгөх бүрд (poll_id, user_id)-д ганцхан удаа
-- үүсэх санамсаргүй receipt_code үүсгэж, дараа нь ХЭН Ч (тэр receipt
-- код мэдэж байгаа хүн) "энэ баримт бүртгэлд бий эсэх"-ийг шалгаж
-- чадна — ГЭХДЭЭ АЛЬ сонголтыг хийсэн нь хэзээ ч ил гарахгүй.
create table voting_receipts (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references voting_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_code text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

alter table voting_receipts enable row level security;

create policy "voting_receipts_select_own" on voting_receipts
  for select using (user_id = auth.uid());
create policy "voting_receipts_insert_own" on voting_receipts
  for insert with check (user_id = auth.uid());

-- Санал бүр амжилттай бүртгэгдэхэд frontend-ээс дуудна (байхгүй бол
-- үүсгэж, байгаа бол хуучин кодоо буцаана — нэг poll-д нэг л баримт).
create or replace function public.get_or_create_voting_receipt(p_poll_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_code text;
begin
  select receipt_code into v_code from voting_receipts where poll_id = p_poll_id and user_id = auth.uid();
  if v_code is not null then
    return v_code;
  end if;
  insert into voting_receipts (poll_id, user_id) values (p_poll_id, auth.uid())
  returning receipt_code into v_code;
  return v_code;
end;
$function$;

grant execute on function public.get_or_create_voting_receipt(uuid) to authenticated;

-- Баталгаажуулах хайлт — receipt_code мэдэж байгаа ХЭН Ч (зөвхөн
-- нэвтэрсэн хэрэглэгч) дуудаж болно, АЛЬ сонголтыг хийснийг ХЭЗЭЭ Ч
-- буцаахгүй, зөвхөн "энэ баримт үнэн бий эсэх" + ерөнхий мэдээллийг.
create or replace function public.verify_voting_receipt(p_receipt_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_row record;
begin
  select vr.created_at, vp.title, vp.status into v_row
  from voting_receipts vr join voting_polls vp on vp.id = vr.poll_id
  where vr.receipt_code = p_receipt_code;

  if v_row is null then
    return jsonb_build_object('valid', false);
  end if;

  return jsonb_build_object(
    'valid', true,
    'poll_title', v_row.title,
    'poll_status', v_row.status,
    'recorded_at', v_row.created_at
  );
end;
$function$;

grant execute on function public.verify_voting_receipt(text) to authenticated;
