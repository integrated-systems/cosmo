-- 2026-09-08: "Программын тухай" (Топбар -> Тохиргоо -> Программын
-- тухай) хуудас — Ашиглах заавар + Хeгжүүлсэн лог гэсэн 2 таб.
-- Ангилал/Терел-тэй ижил зарчим: ГЛОБАЛ (tenant_id үгүй) — SUPERSYSADMIN
-- нэг л удаа бичихэд бүх tenant үзнэ.
create table if not exists program_docs (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('guide', 'changelog')),
  title text not null,
  version_label text,
  content text not null default '',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists program_docs_doc_type_idx on program_docs(doc_type);

alter table program_docs enable row level security;

-- Бүгд (нийтлэгдсэн зүйлийг) харна, эсвэл SUPERSYSADMIN бүгдийг
-- (ноорог хамт) харна.
create policy "program_docs: бүгд нийтлэгдсэнийг, SUPERSYSADMIN бүгдийг харна"
  on program_docs for select
  using (is_published = true or is_supersysadmin());

create policy "program_docs: SUPERSYSADMIN бичнэ"
  on program_docs for insert
  with check (is_supersysadmin());

create policy "program_docs: SUPERSYSADMIN шинэчилнэ"
  on program_docs for update
  using (is_supersysadmin())
  with check (is_supersysadmin());

create policy "program_docs: SUPERSYSADMIN устгана"
  on program_docs for delete
  using (is_supersysadmin());
