-- 2026-08-31: Хэрэглэгчийн хүсэлт — OwnerApp-д 2 шинэ модуль:
--   1) "Утасны жагсаалт" (phonebook) — Гал түймэр/эмнэлэг/цагдаа зэрэг
--      онцгой дугаараас эхлээд лифтчин/сантехник/цахилгаанчин зэрэг
--      үйлчилгээний дугаар хүртэл, тенант СӨХ-ийн сисадминий бүрдүүлдэг
--      жагсаалт. Owner тоо дээр дарахад "tel:" линк (үүрэн утасны
--      оператор руу шиддэг) л хангалттай.
--   2) "СӨХ-ны тухай" (about) — СӨХ-ийн хаяг/дансны мэдээлэл/танилцуулга
--      текст, тенант бүрт ГАНЦ мвр.

create table if not exists tenant_phonebook (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  label text not null,
  phone text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table tenant_phonebook enable row level security;

create policy "tenant_phonebook: гишүүд бүгд харна"
on tenant_phonebook for select
using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "tenant_phonebook: staff л удирдана"
on tenant_phonebook for all
using (is_supersysadmin() or is_staff_member(tenant_id))
with check (is_supersysadmin() or is_staff_member(tenant_id));

create table if not exists tenant_about (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  address text,
  bank_name text,
  bank_account text,
  phone text,
  email text,
  intro_text text,
  updated_at timestamptz not null default now()
);

alter table tenant_about enable row level security;

create policy "tenant_about: гишүүд бүгд харна"
on tenant_about for select
using (is_supersysadmin() or tenant_id in (select my_tenant_ids()));

create policy "tenant_about: staff л удирдана"
on tenant_about for all
using (is_supersysadmin() or is_staff_member(tenant_id))
with check (is_supersysadmin() or is_staff_member(tenant_id));
