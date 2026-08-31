-- 2026-08-31: Хэрэглэгчийн хүсэлт — "Зарын самбар" (Facebook-ийн пост
-- шиг) — сууц өмчлөгч зар нийтэлж, хотхоны бусад сууц өмчлөгч нар
-- харж, иможи (like) дарж, коммент бичиж болно. Нийтэд (тухайн
-- tenant-ийн БүХ гишүүнд) харагдана, зөвхөн өврийн зарыг л үүсгэж/
-- устгаж болно (staff модератор эрхтэй).

create table if not exists classifieds_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists classifieds_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references classifieds_posts(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, owner_id)
);

create table if not exists classifieds_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references classifieds_posts(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table classifieds_posts enable row level security;
alter table classifieds_reactions enable row level security;
alter table classifieds_comments enable row level security;

-- Посты: тухайн tenant-ийн БүХ гишүүн (staff+owner) харна.
create policy "classifieds_posts: гишүүд бүгд харна"
on classifieds_posts for select
using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

-- Owner зөвхөн ВВРИЙН нэрээр (өврийн owner_id) л шинэ пост үүсгэнэ.
create policy "classifieds_posts: owner өврийн нэрээр үүсгэнэ"
on classifieds_posts for insert
with check (
  is_supersysadmin()
  or (tenant_id in (select my_tenant_ids()) and owner_id in (select id from owners where user_id = auth.uid()))
);

-- Owner зөвхөн ВВРИЙН постоо, эсвэл staff аль ч постыг устгаж болно
-- (модератор эрх).
create policy "classifieds_posts: owner өврийгөө, staff бүгдийг устгана"
on classifieds_posts for delete
using (
  is_supersysadmin()
  or is_staff_member(tenant_id)
  or owner_id in (select id from owners where user_id = auth.uid())
);

-- Реакц (like): бүгд харна, owner зөвхөн өврийн нэрээр нэмнэ/хасна.
create policy "classifieds_reactions: гишүүд бүгд харна"
on classifieds_reactions for select
using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "classifieds_reactions: owner өврийн нэрээр нэмнэ"
on classifieds_reactions for insert
with check (
  is_supersysadmin()
  or (tenant_id in (select my_tenant_ids()) and owner_id in (select id from owners where user_id = auth.uid()))
);

create policy "classifieds_reactions: owner өврийгөө хасна"
on classifieds_reactions for delete
using (
  is_supersysadmin()
  or owner_id in (select id from owners where user_id = auth.uid())
);

-- Коммент: бүгд харна, owner өврийн нэрээр бичнэ, owner өврийгөө
-- эсвэл staff бүгдийг устгана.
create policy "classifieds_comments: гишүүд бүгд харна"
on classifieds_comments for select
using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "classifieds_comments: owner өврийн нэрээр бичнэ"
on classifieds_comments for insert
with check (
  is_supersysadmin()
  or (tenant_id in (select my_tenant_ids()) and owner_id in (select id from owners where user_id = auth.uid()))
);

create policy "classifieds_comments: owner өврийгөө, staff бүгдийг устгана"
on classifieds_comments for delete
using (
  is_supersysadmin()
  or is_staff_member(tenant_id)
  or owner_id in (select id from owners where user_id = auth.uid())
);
