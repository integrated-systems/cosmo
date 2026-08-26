-- 2026-08-19 хэрэглэгчтэй тохиролцсоны дагуу шинээр үүсгэв: "Сонгууль,
-- санал асуулга" (/voting) — Санал асуулга/Үнэлгээ/Ээлжит сонгууль/
-- Хэлэлцүүлэг гэсэн 4 тврлийн контент үүсгэх боломжтой.
create table voting_polls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  type text not null check (type in ('poll','rating','election','discussion')),
  title text not null,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  is_secret boolean not null default true,
  show_live_results boolean not null default true,
  board_votes_allowed int default 1,
  supervisory_votes_allowed int default 1,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table voting_questions (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references voting_polls(id) on delete cascade,
  question_text text not null,
  options jsonb,
  order_index int not null default 0
);

create table voting_candidates (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references voting_polls(id) on delete cascade,
  council_type text not null check (council_type in ('board','supervisory_board')),
  fullname text not null,
  order_index int not null default 0
);

create index voting_polls_tenant_id_idx on voting_polls(tenant_id);
create index voting_questions_poll_id_idx on voting_questions(poll_id);
create index voting_candidates_poll_id_idx on voting_candidates(poll_id);

alter table voting_polls enable row level security;
alter table voting_questions enable row level security;
alter table voting_candidates enable row level security;

create policy "voting_polls_select_member" on voting_polls for select using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
create policy "voting_polls_write_admin" on voting_polls for insert with check (is_supersysadmin() or is_tenant_admin(tenant_id));
create policy "voting_polls_update_admin" on voting_polls for update using (is_supersysadmin() or is_tenant_admin(tenant_id));
create policy "voting_polls_delete_admin" on voting_polls for delete using (is_supersysadmin() or is_tenant_admin(tenant_id));

create policy "voting_questions_select_member" on voting_questions for select using (
  exists (select 1 from voting_polls p where p.id = poll_id and (is_supersysadmin() or p.tenant_id in (select my_tenant_ids())))
);
create policy "voting_questions_write_admin" on voting_questions for insert with check (
  exists (select 1 from voting_polls p where p.id = poll_id and (is_supersysadmin() or is_tenant_admin(p.tenant_id)))
);
create policy "voting_questions_update_admin" on voting_questions for update using (
  exists (select 1 from voting_polls p where p.id = poll_id and (is_supersysadmin() or is_tenant_admin(p.tenant_id)))
);
create policy "voting_questions_delete_admin" on voting_questions for delete using (
  exists (select 1 from voting_polls p where p.id = poll_id and (is_supersysadmin() or is_tenant_admin(p.tenant_id)))
);

create policy "voting_candidates_select_member" on voting_candidates for select using (
  exists (select 1 from voting_polls p where p.id = poll_id and (is_supersysadmin() or p.tenant_id in (select my_tenant_ids())))
);
create policy "voting_candidates_write_admin" on voting_candidates for insert with check (
  exists (select 1 from voting_polls p where p.id = poll_id and (is_supersysadmin() or is_tenant_admin(p.tenant_id)))
);
create policy "voting_candidates_update_admin" on voting_candidates for update using (
  exists (select 1 from voting_polls p where p.id = poll_id and (is_supersysadmin() or is_tenant_admin(p.tenant_id)))
);
create policy "voting_candidates_delete_admin" on voting_candidates for delete using (
  exists (select 1 from voting_polls p where p.id = poll_id and (is_supersysadmin() or is_tenant_admin(p.tenant_id)))
);
