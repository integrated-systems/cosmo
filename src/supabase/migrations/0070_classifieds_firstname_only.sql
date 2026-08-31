-- 2026-08-31: Хэрэглэгчийн хүсэлт — зар/коммент бичигчийн БүТЭН
-- (нэр+овог) биш, зүгээр НЭРИЙГ л (firstname) харуулна.
create or replace function public.get_classifieds_feed(p_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_my_owner_id uuid;
  v_result jsonb;
begin
  select id into v_my_owner_id from owners where tenant_id = p_tenant_id and user_id = auth.uid();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'body', p.body,
    'created_at', p.created_at,
    'author', coalesce(nullif(trim(o.firstname), ''), 'Сууц өмчлөгч'),
    'is_mine', p.owner_id = v_my_owner_id,
    'reaction_count', (select count(*) from classifieds_reactions r where r.post_id = p.id),
    'my_reaction', v_my_owner_id is not null and exists (select 1 from classifieds_reactions r where r.post_id = p.id and r.owner_id = v_my_owner_id),
    'comment_count', (select count(*) from classifieds_comments c where c.post_id = p.id)
  ) order by p.created_at desc), '[]'::jsonb) into v_result
  from classifieds_posts p
  left join owners o on o.id = p.owner_id
  where p.tenant_id = p_tenant_id;

  return v_result;
end;
$function$;

create or replace function public.get_classifieds_comments(p_post_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'body', c.body,
    'created_at', c.created_at,
    'author', coalesce(nullif(trim(o.firstname), ''), 'Сууц өмчлөгч')
  ) order by c.created_at asc), '[]'::jsonb) into v_result
  from classifieds_comments c
  left join owners o on o.id = c.owner_id
  where c.post_id = p_post_id;

  return v_result;
end;
$function$;
