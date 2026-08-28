-- 2026-08-28: ОЛСОН БОДИТ ГүЙЦЭТГЭЛИЙН АСУУДАЛ — OwnerApp удаан
-- ачаалагдаж байсны нэг үндсэн шалтгаан нь "хос алхамт" (waterfall)
-- Supabase дуудлагууд байв: useAccessRules эхлээд user_roles татаад,
-- ДАРАА нь access_rules татдаг (2 дараалсан round-trip); HeroQuorumCard
-- эхлээд идэвхтэй poll хайгаад, ДАРАА нь get_voting_results дуудна
-- (мвн 2 дараалсан round-trip). Эдгээрийг НЭГ RPC болгож нэгтгэж,
-- round-trip тоог хоёуланд нь 2-оос 1 болгож бууруулав.

create or replace function public.get_my_matrix_access(p_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_is_bypass boolean;
  v_my_role text;
  v_rules jsonb;
begin
  v_is_bypass := is_supersysadmin() or exists (
    select 1 from user_roles where user_id = auth.uid() and tenant_id = p_tenant_id and role = 'tenant_admin'
  );
  if v_is_bypass then
    return jsonb_build_object('bypass', true, 'my_role', null, 'rules', '{}'::jsonb);
  end if;

  select role into v_my_role from user_roles
  where user_id = auth.uid() and tenant_id = p_tenant_id
    and role = any(array['board','supervisory_board','executive_director','accountant','manager','owner'])
  limit 1;

  if v_my_role is null then
    return jsonb_build_object('bypass', false, 'my_role', null, 'rules', '{}'::jsonb);
  end if;

  select coalesce(jsonb_object_agg(page_key, page_actions), '{}'::jsonb) into v_rules
  from (
    select page_key, jsonb_object_agg(action, allowed) as page_actions
    from access_rules
    where tenant_id = p_tenant_id and role = v_my_role
    group by page_key
  ) grouped;

  return jsonb_build_object('bypass', false, 'my_role', v_my_role, 'rules', v_rules);
end;
$function$;

grant execute on function public.get_my_matrix_access(uuid) to authenticated;

-- OwnerApp-ийн Hero (лайв кворум) карт — 2 алхмыг НЭГ болгов.
create or replace function public.get_home_hero(p_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_poll voting_polls;
  v_result jsonb;
begin
  select * into v_poll from voting_polls
  where tenant_id = p_tenant_id and status = 'active'
  order by end_at asc nulls last
  limit 1;

  if v_poll is null then
    return jsonb_build_object('poll', null);
  end if;

  select jsonb_build_object(
    'id', v_poll.id, 'title', v_poll.title, 'end_at', v_poll.end_at
  ) into v_result;

  return jsonb_build_object('poll', v_result, 'turnout', (get_voting_results(v_poll.id)->'turnout'));
end;
$function$;

grant execute on function public.get_home_hero(uuid) to authenticated;
