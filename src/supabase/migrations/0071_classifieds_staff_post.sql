-- 2026-08-31: Хэрэглэгчийн хүсэлт — СӨХ-ийн БүХ роль (board,
-- supervisory_board, executive_director, accountant, manager,
-- tenant_admin) мвн адил НИЙТ сууц өмчлөгчид хандан "Зарын самбар"-т
-- зар нийтлэх эрхтэй болгоё. Үмнв нь INSERT policy зөвхөн
-- "owner_id in (select id from owners where user_id=auth.uid())"
-- гэсэн нүхцэлтэй байсан тул staff (owners мвргүй) зар нийтэлж
-- ЧАДДАГГүй байв.

-- owner_id-г NULLABLE болгож, author_user_id (auth.users.id) нэмж
-- ЯМАР Ч тохиолдолд (owner эсвэл staff) бодит зохиогчийг тодорхой
-- хадгална.
alter table classifieds_posts alter column owner_id drop not null;
alter table classifieds_posts add column if not exists author_user_id uuid not null default auth.uid();

alter table classifieds_comments alter column owner_id drop not null;
alter table classifieds_comments add column if not exists author_user_id uuid not null default auth.uid();

drop policy if exists "classifieds_posts: owner өврийн нэрээр үүсгэнэ" on classifieds_posts;
create policy "classifieds_posts: owner эсвэл staff үүсгэнэ"
on classifieds_posts for insert
with check (
  is_supersysadmin()
  or (tenant_id in (select my_tenant_ids()) and author_user_id = auth.uid() and (
    owner_id in (select id from owners where user_id = auth.uid())
    or is_staff_member(tenant_id)
  ))
);

drop policy if exists "classifieds_comments: owner өврийн нэрээр бичнэ" on classifieds_comments;
create policy "classifieds_comments: owner эсвэл staff бичнэ"
on classifieds_comments for insert
with check (
  is_supersysadmin()
  or (tenant_id in (select my_tenant_ids()) and author_user_id = auth.uid() and (
    owner_id in (select id from owners where user_id = auth.uid())
    or is_staff_member(tenant_id)
  ))
);

-- Feed/comments RPC-г шинэчилж, owner_id null үед tenant_users-ээс
-- (staff) нэр+role харуулна.
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
      nullif(trim(tu.fullname), ''),
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
  left join tenant_users tu on tu.user_id = p.author_user_id and tu.tenant_id = p_tenant_id
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
      nullif(trim(tu.fullname), ''),
      'СӨХ-ийн ажилтан'
    ),
    'is_staff_comment', c.owner_id is null
  ) order by c.created_at asc), '[]'::jsonb) into v_result
  from classifieds_comments c
  left join owners o on o.id = c.owner_id
  left join tenant_users tu on tu.user_id = c.author_user_id and tu.tenant_id = v_tenant_id
  where c.post_id = p_post_id;

  return v_result;
end;
$function$;
