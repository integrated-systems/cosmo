-- Integrated Systems (Cosmo) — "Мэдээ, мэдээлэл" (/news) хуудасны Supabase
-- хvснэгэл. Clientele/Owners-ийн бvтэц/RLS загварыг дахин ашигласан.
--
-- images: jsonb массив (зурагны URL-vvд, Supabase Storage холбоо хараахан
-- хийгдээгvй тул одоогоор энгийн текст URL хадгална — TODO).
-- status: 'draft' | 'published' — Мэдээний агрегат таблицын Нуух/Нийтлэх
-- toggle товч энэ баганыг шууд сэлгэнэ.

create table if not exists news (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  category text not null default 'Мэдээ',
  body_text text default '',
  video_url text,
  images jsonb default '[]',
  pdf_url text,
  is_public boolean not null default false,
  featured boolean not null default false,
  urgent boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists news_tenant_id_idx on news(tenant_id);

alter table news enable row level security;

create policy "news: tenant-аараа хязгаарлана"
  on news for all
  using (is_supersysadmin() or tenant_id in (select my_tenant_ids()))
  with check (is_supersysadmin() or tenant_id in (select my_tenant_ids()));
