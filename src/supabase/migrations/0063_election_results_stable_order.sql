-- 2026-08-30: ОЛСОН БОДИТ АЛДАА — get_voting_results() нь "election"
-- (Ээлжит сонгууль)-ийн нэр дэвшигчдийг САНАЛЫН ТООГООР буурахаар
-- (order by votes desc) эрэмбэлдэг байсан тул хэн саналаа тоолуулах
-- бүрд жагсаалт "дээш доош хөдөлдөг" байв. Хэрэглэгчийн тодорхой
-- заасны дагуу: нэр дэвшигчийн жагсаалт үргэлж АНХ ДУГААРЛАСАН
-- дарааллаараа (c.order_index) тогтвортой байх ёстой.
create or replace function public.get_voting_results(p_poll_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_poll voting_polls;
  v_is_admin boolean;
  v_is_member boolean;
  v_can_view boolean;
  v_result jsonb;
  v_eligible_count numeric;
  v_responded_count numeric;
  v_turnout_percent numeric;
  v_turnout jsonb;
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

  if v_poll.use_weighted_voting then
    v_eligible_count := coalesce((select sum(sqm) from owners where tenant_id = v_poll.tenant_id and sqm is not null), 0);
    v_responded_count := coalesce((
      select sum(o.sqm) from owners o
      where o.tenant_id = v_poll.tenant_id and o.sqm is not null
        and o.id in (select distinct owner_id from voting_responses where poll_id = p_poll_id and owner_id is not null)
    ), 0);
  else
    v_eligible_count := (select count(*) from owners where tenant_id = v_poll.tenant_id);
    v_responded_count := (select count(distinct user_id) from voting_responses where poll_id = p_poll_id);
  end if;
  v_turnout_percent := case when v_eligible_count > 0 then round((v_responded_count / v_eligible_count) * 100, 1) else 0 end;
  v_turnout := jsonb_build_object(
    'eligible_count', v_eligible_count,
    'responded_count', v_responded_count,
    'turnout_percent', v_turnout_percent,
    'quorum_percent', v_poll.quorum_percent,
    'quorum_met', v_turnout_percent >= v_poll.quorum_percent,
    'weighted', v_poll.use_weighted_voting
  );

  v_can_view := v_is_admin or v_poll.status = 'closed' or v_poll.show_live_results;
  if not v_can_view then
    return jsonb_build_object('visible', false, 'turnout', v_turnout);
  end if;

  if v_poll.type in ('poll', 'rating') then
    select jsonb_build_object(
      'visible', true,
      'questions', coalesce(jsonb_agg(
        jsonb_build_object(
          'question_id', q.id,
          'question_text', q.question_text,
          'total_responses', case when v_poll.use_weighted_voting then
              coalesce((select sum(o.sqm) from voting_responses r join owners o on o.id = r.owner_id where r.question_id = q.id and o.sqm is not null), 0)
            else (select count(*) from voting_responses r where r.question_id = q.id) end,
          'options', case when v_poll.type = 'poll' then (
              select coalesce(jsonb_agg(jsonb_build_object(
                'option', opt,
                'count', case when v_poll.use_weighted_voting then
                    coalesce((select sum(o.sqm) from voting_responses r join owners o on o.id = r.owner_id where r.question_id = q.id and r.option_text = opt and o.sqm is not null), 0)
                  else (select count(*) from voting_responses r where r.question_id = q.id and r.option_text = opt) end
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
            -- 2026-08-30 ЗАСАВ: "Аль нь ч биш" мвр үнэн хэрэгтээ
            -- ХЭЗЭЭ Ч ӨӨРИЙН candidate_id-гаар үнэлэгддэггүй байсан
            -- (тэдгээр санал candidate_id=NULL-ээр бүртгэгддэг тул) —
            -- үүнийг тухайн зөвлөлийн none_votes-той шууд холбов.
            'votes', case when c.fullname = 'Аль нь ч биш' then
                (case when v_poll.use_weighted_voting then
                    coalesce((select sum(o.sqm) from voting_responses r join owners o on o.id = r.owner_id where r.poll_id = p_poll_id and r.candidate_id is null and r.council_type = ct.council_type and o.sqm is not null), 0)
                  else (select count(*) from voting_responses r where r.poll_id = p_poll_id and r.candidate_id is null and r.council_type = ct.council_type) end)
              else
                (case when v_poll.use_weighted_voting then
                    coalesce((select sum(o.sqm) from voting_responses r join owners o on o.id = r.owner_id where r.candidate_id = c.id and o.sqm is not null), 0)
                  else (select count(*) from voting_responses r where r.candidate_id = c.id) end)
              end
          ) order by c.order_index), '[]'::jsonb)
          from voting_candidates c where c.poll_id = p_poll_id and c.council_type = ct.council_type
        ),
        'none_votes', case when v_poll.use_weighted_voting then
            coalesce((select sum(o.sqm) from voting_responses r join owners o on o.id = r.owner_id where r.poll_id = p_poll_id and r.candidate_id is null and r.council_type = ct.council_type and o.sqm is not null), 0)
          else (select count(*) from voting_responses r where r.poll_id = p_poll_id and r.candidate_id is null and r.council_type = ct.council_type) end
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

  return coalesce(v_result, jsonb_build_object('visible', true)) || jsonb_build_object('turnout', v_turnout);
end;
$function$;
