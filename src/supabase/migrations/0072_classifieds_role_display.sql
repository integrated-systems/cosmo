-- 2026-08-31: Хэрэглэгчийн хүсэлт — staff (СӨХ-ийн ажилтан) зар/
-- коммент бичихэд тэдний НЭР биш, ТУХАЙН РОЛИЙГ (жиш "Менежер",
-- "Сисадмин") зар нийтлэгчээр дурьдана.
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
    'author', coalesce(
      nullif(trim(o.firstname), ''),
      (select case
          when ur.role = 'tenant_admin' then 'Сисадмин'
          when ur.role = 'board' then 'Удирдах зөвлөл'
          when ur.role = 'supervisory_board' then 'Хяналтын зөвлөл'
          when ur.role = 'executive_director' then 'Гүйцэтгэх захирал'
          when ur.role = 'accountant' then 'Нягтлан бодогч'
          when ur.role = 'manager' then 'Менежер'
          else 'СӨХ-ийн ажилтан'
        end
        from user_roles ur
        where ur.user_id = p.author_user_id and ur.tenant_id = p_tenant_id and ur.role <> 'owner'
        order by (ur.role = 'tenant_admin') desc
        limit 1
      ),
      'СӨХ-ийн ажилтан'
    ),
    'is_staff_post', p.owner_id is null,
    'is_mine', p.author_user_id = auth.uid(),
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
  v_tenant_id uuid;
  v_result jsonb;
begin
  select tenant_id into v_tenant_id from classifieds_posts where id = p_post_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'body', c.body,
    'created_at', c.created_at,
    'author', coalesce(
      nullif(trim(o.firstname), ''),
      (select case
          when ur.role = 'tenant_admin' then 'Сисадмин'
          when ur.role = 'board' then 'Удирдах зөвлөл'
          when ur.role = 'supervisory_board' then 'Хяналтын зөвлөл'
          when ur.role = 'executive_director' then 'Гүйцэтгэх захирал'
          when ur.role = 'accountant' then 'Нягтлан бодогч'
          when ur.role = 'manager' then 'Менежер'
          else 'СӨХ-ийн ажилтан'
        end
        from user_roles ur
        where ur.user_id = c.author_user_id and ur.tenant_id = v_tenant_id and ur.role <> 'owner'
        order by (ur.role = 'tenant_admin') desc
        limit 1
      ),
      'СӨХ-ийн ажилтан'
    ),
    'is_staff_comment', c.owner_id is null
  ) order by c.created_at asc), '[]'::jsonb) into v_result
  from classifieds_comments c
  left join owners o on o.id = c.owner_id
  where c.post_id = p_post_id;

  return v_result;
end;
$function$;
