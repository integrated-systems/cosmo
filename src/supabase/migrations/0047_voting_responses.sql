-- 2026-08-20 хэрэглэгчтэй тохиролцсоны дагуу: "Сонгууль, санал асуулга"
-- (/voting) модулийн хамгийн том дутуу хэсгийг (бодит санал/хариулт
-- хадгалах) нөхөв. Одоог хүртэл voting_polls/questions/candidates нь
-- зөвхөн БүТЦИЙГ (админ талын үүсгэх/засах) хадгалдаг байсан, харин
-- Сууц өмчлөгч (owner) OwnerApp-аар дамжуулан БОДИТООР санал өгөх,
-- үнэлгээ тавих, сонгуульд саналаа өгөх, хэлэлцүүлэгт бичих боломж
-- ОГТ байгаагүй байв (VotingResultsPage.jsx зүгээр бүтцийг харуулаад
-- "Үр дүнг удахгүй энд харуулна" гэсэн тогтмол мессеж үзүүлдэг байсан).

-- ===================================================================
-- 1. voting_responses — Owner бүр өгсөн бодит хариулт/санал/үнэлгээ/
--    сонгуулийн санал/хэлэлцүүлгийн сэтгэгдэл
-- ===================================================================
create table voting_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references voting_polls(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid references owners(id) on delete set null,
  -- poll/rating төрөлд: тухайн асуултын хариулт
  question_id uuid references voting_questions(id) on delete cascade,
  option_text text,        -- poll: сонгосон сонголт (нэг асуултад нэг мөр)
  rating_value int check (rating_value between 1 and 5),  -- rating: 1-5 од
  -- election төрөлд: нэр дэвшигчид өгсөн санал (candidate_id=null → "Аль нь ч биш")
  candidate_id uuid references voting_candidates(id) on delete cascade,
  council_type text check (council_type in ('board', 'supervisory_board')),
  -- discussion төрөлд: owner-ийн бичсэн сэтгэгдэл (нэг удаа, 220 тэмдэгт)
  comment_text text,
  created_at timestamptz not null default now()
);

create index voting_responses_poll_id_idx on voting_responses(poll_id);
create index voting_responses_user_id_idx on voting_responses(user_id);
create index voting_responses_tenant_id_idx on voting_responses(tenant_id);

-- Нэг удаа л саналаа өгнө — давхар санал өгөхөөс db түвшинд хамгаална.
create unique index voting_responses_poll_question_user_uidx
  on voting_responses(poll_id, question_id, user_id) where question_id is not null;
create unique index voting_responses_poll_candidate_user_uidx
  on voting_responses(poll_id, candidate_id, user_id) where candidate_id is not null;
-- "Аль нь ч биш" (candidate_id=null боловч council_type-тай мөр) — зөвлөл
-- бүрд НЭГ л удаа сонгож болно.
create unique index voting_responses_poll_none_user_uidx
  on voting_responses(poll_id, user_id, council_type) where candidate_id is null and council_type is not null;
create unique index voting_responses_poll_discussion_user_uidx
  on voting_responses(poll_id, user_id) where comment_text is not null;

-- ===================================================================
-- 2. Сонгуулийн санал өгөх дээд хязгаар (board_votes_allowed/
--    supervisory_votes_allowed) — trigger-ээр хэрэгжүүлнэ, учир нь
--    RLS with check нь мөр тус бүрд ажилладаг тул НИЙТ тоог шалгах
--    боломжгүй.
-- ===================================================================
create or replace function public.enforce_election_vote_limit()
returns trigger
language plpgsql
as $function$
declare
  v_council text;
  v_limit int;
  v_count int;
begin
  if new.candidate_id is null then
    -- "Аль нь ч биш" мөр — council_type-ыг client-ээс шууд авна, доод
    -- тоо шалгалт хамаарахгүй (ганц мөр, unique index-ээр хамгаалагдсан).
    return new;
  end if;

  select c.council_type into v_council
  from voting_candidates c
  where c.id = new.candidate_id;

  if v_council is null then
    raise exception 'Нэр дэвшигч олдсонгүй';
  end if;

  select case when v_council = 'board' then p.board_votes_allowed else p.supervisory_votes_allowed end
    into v_limit
  from voting_polls p
  where p.id = new.poll_id;

  select count(*) into v_count
  from voting_responses r
  join voting_candidates c2 on c2.id = r.candidate_id
  where r.poll_id = new.poll_id and r.user_id = new.user_id and c2.council_type = v_council;

  if v_count >= coalesce(v_limit, 1) then
    raise exception 'Саналын тооны хязгаараас (%) хэтэрсэн байна', coalesce(v_limit, 1);
  end if;

  new.council_type := v_council;
  return new;
end;
$function$;

create trigger trg_election_vote_limit
  before insert on voting_responses
  for each row execute function public.enforce_election_vote_limit();

-- ===================================================================
-- 3. RLS — санал өгсөн owner зөвхөн ӨӨРИЙН мөрөө уншина (Нууц санал
--    хураалт үргэлж бодитоор хамгаалагдана — is_secret флаг үл
--    хамааран ХЭН Ч (admin ч гэсэн) хэн ямар сонголт хийснийг шууд
--    хүснэглээс уншиж чадахгүй, зөвхөн доорх get_voting_results()
--    нэгтгэсэн тоогоор л үзнэ).
-- ===================================================================
alter table voting_responses enable row level security;

create policy "voting_responses_select_own" on voting_responses
  for select using (user_id = auth.uid());

create policy "voting_responses_insert_own" on voting_responses
  for insert with check (
    user_id = auth.uid()
    and tenant_id in (select my_tenant_ids())
    and (owner_id is null or owner_id in (
      select id from owners where user_id = auth.uid() and tenant_id = voting_responses.tenant_id
    ))
    and exists (
      select 1 from voting_polls p
      where p.id = poll_id
        and p.tenant_id = voting_responses.tenant_id
        and p.status = 'active'
        and (p.start_at is null or now() >= p.start_at)
        and (p.end_at is null or now() <= p.end_at)
    )
    and (question_id is null or exists (
      select 1 from voting_questions q where q.id = voting_responses.question_id and q.poll_id = voting_responses.poll_id
    ))
    and (candidate_id is null or exists (
      select 1 from voting_candidates c where c.id = voting_responses.candidate_id and c.poll_id = voting_responses.poll_id
    ))
  );

-- Санал өгсний дараа засварлах/устгах боломжгүй (бодит саналын хураалтын
-- зарчим) — UPDATE/DELETE policy ЗОРИУДААР нэмэгдээгүй.

-- ===================================================================
-- 4. get_voting_results — нэгтгэсэн үр дүн, ХЭЗЭЭ Ч хүн тус бүрийн
--    сонголтыг задлахгүй (SECURITY DEFINER, зөвхөн counts буцаана).
-- ===================================================================
create or replace function public.get_voting_results(p_poll_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_poll voting_polls;
  v_is_admin boolean;
  v_is_member boolean;
  v_can_view boolean;
  v_result jsonb;
begin
  select * into v_poll from voting_polls where id = p_poll_id;
  if v_poll is null then
    raise exception 'Санал асуулга олдсонгүй';
  end if;

  v_is_admin := is_supersysadmin() or is_tenant_admin(v_poll.tenant_id);
  v_is_member := v_poll.tenant_id in (select my_tenant_ids());

  if not (v_is_admin or v_is_member) then
    raise exception 'Зөвшөөргүй';
  end if;

  v_can_view := v_is_admin or v_poll.status = 'closed' or v_poll.show_live_results;
  if not v_can_view then
    return jsonb_build_object('visible', false);
  end if;

  if v_poll.type in ('poll', 'rating') then
    select jsonb_build_object(
      'visible', true,
      'questions', coalesce(jsonb_agg(
        jsonb_build_object(
          'question_id', q.id,
          'question_text', q.question_text,
          'total_responses', (select count(*) from voting_responses r where r.question_id = q.id),
          'options', case when v_poll.type = 'poll' then (
              select coalesce(jsonb_agg(jsonb_build_object(
                'option', opt,
                'count', (select count(*) from voting_responses r where r.question_id = q.id and r.option_text = opt)
              )), '[]'::jsonb)
              from jsonb_array_elements_text(q.options) as opt
            ) else null end,
          'avg_rating', case when v_poll.type = 'rating' then
              (select round(avg(rating_value)::numeric, 2) from voting_responses r where r.question_id = q.id)
            else null end
        ) order by q.order_index
      ), '[]'::jsonb)
    ) into v_result
    from voting_questions q where q.poll_id = p_poll_id;

  elsif v_poll.type = 'election' then
    select jsonb_build_object(
      'visible', true,
      'councils', coalesce(jsonb_agg(council_row), '[]'::jsonb)
    ) into v_result
    from (
      select jsonb_build_object(
        'council_type', ct.council_type,
        'candidates', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'candidate_id', c.id,
            'fullname', c.fullname,
            'votes', (select count(*) from voting_responses r where r.candidate_id = c.id)
          ) order by (select count(*) from voting_responses r where r.candidate_id = c.id) desc, c.order_index), '[]'::jsonb)
          from voting_candidates c where c.poll_id = p_poll_id and c.council_type = ct.council_type
        ),
        'none_votes', (
          select count(*) from voting_responses r
          where r.poll_id = p_poll_id and r.candidate_id is null and r.council_type = ct.council_type
        )
      ) as council_row
      from (select distinct council_type from voting_candidates where poll_id = p_poll_id) ct
    ) sub;

  elsif v_poll.type = 'discussion' then
    select jsonb_build_object(
      'visible', true,
      'comments', coalesce(jsonb_agg(jsonb_build_object(
        'comment_text', r.comment_text,
        'author', case when v_poll.is_secret then 'Сууц өмчлөгч' else coalesce(nullif(trim(both ' ' from concat(o.firstname, ' ', o.lastname)), ''), 'Сууц өмчлөгч') end,
        'created_at', r.created_at
      ) order by r.created_at), '[]'::jsonb)
    ) into v_result
    from voting_responses r left join owners o on o.id = r.owner_id
    where r.poll_id = p_poll_id and r.comment_text is not null;
  end if;

  return coalesce(v_result, jsonb_build_object('visible', true));
end;
$function$;

grant execute on function public.get_voting_results(uuid) to authenticated;
