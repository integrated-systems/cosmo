-- 2026-09-08 (15): SUPERSYSADMIN "Plan" хуудас — Багц
-- (Basic/Standard/Premium/Premium+) бүр ямар модультой үү гэдгийг
-- тодорхойлдог глобал матриц (Ангилал/Терел, program_docs-той ижил
-- зарчим — tenant_id үгүй, SUPERSYSADMIN л бичнэ).
create table if not exists package_features (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  feature_label text not null,
  is_done boolean not null default false,
  basic boolean not null default false,
  standard boolean not null default false,
  premium boolean not null default false,
  premium_plus boolean not null default false,
  sort_order integer not null default 0
);

alter table package_features enable row level security;
create policy "package_features: SUPERSYSADMIN л"
  on package_features for all
  using (is_supersysadmin())
  with check (is_supersysadmin());

-- Seed — Claude-ийн санал болгосон анхны хуваарилалт (SUPERSYSADMIN
-- дараа нь чекбокс дээр дарж чөлөөтэй засварлана).
insert into package_features (section, feature_label, is_done, basic, standard, premium, premium_plus, sort_order) values
('ҮНДСЭН', 'Хянах самбар', true, true, true, true, true, 1),
('ҮНДСЭН', 'Мэдээ, мэдээлэл', true, true, true, true, true, 2),
('ҮНДСЭН', 'Мэдэгдэл', false, false, true, true, true, 3),
('ҮНДСЭН', 'Мессенжер', true, false, true, true, true, 4),
('ҮНДСЭН', 'Зарын самбар', true, false, true, true, true, 5),

('БҮРТГЭЛ', 'Сууц өмчлөгч бүртгэл', true, true, true, true, true, 10),
('БҮРТГЭЛ', 'Талбай өмчлөгч бүртгэл', true, true, true, true, true, 11),
('БҮРТГЭЛ', 'Тоот, Зогсоол, Агуулах', true, true, true, true, true, 12),
('БҮРТГЭЛ', 'Түр зогсоол бүртгэл', true, false, true, true, true, 13),
('БҮРТГЭЛ', 'Хаалт удирдлага', false, false, false, false, true, 14),
('БҮРТГЭЛ', 'Чип удирдлага', false, false, false, false, true, 15),
('БҮРТГЭЛ', 'Лифт удирдлага', false, false, false, false, true, 16),

('ДОТООД ҮЙЛ АЖИЛЛАГАА', 'Хүний нөөцийн удирдлага', false, false, false, false, true, 20),
('ДОТООД ҮЙЛ АЖИЛЛАГАА', 'Цаг бүртгэл', false, false, false, false, true, 21),
('ДОТООД ҮЙЛ АЖИЛЛАГАА', 'Засвар үйлчилгээ', false, false, false, false, true, 22),
('ДОТООД ҮЙЛ АЖИЛЛАГАА', 'Тохижилт үйлчилгээ', false, false, false, false, true, 23),
('ДОТООД ҮЙЛ АЖИЛЛАГАА', 'Цэвэрлэгээ үйлчилгээ', false, false, false, false, true, 24),
('ДОТООД ҮЙЛ АЖИЛЛАГАА', 'Худалдан авалт', false, false, false, false, true, 25),
('ДОТООД ҮЙЛ АЖИЛЛАГАА', 'Харилцагчийн бүртгэл', false, false, false, false, true, 26),

('САНХҮҮ', 'Нягтлан бодох бүртгэл', false, false, false, false, true, 30),
('САНХҮҮ', 'Санхүү, татварын тайлан', false, false, false, false, true, 31),
('САНХҮҮ', 'Дотоод тайлан', false, false, false, true, true, 32),
('САНХҮҮ', 'Цалин бодолт', false, false, false, false, true, 33),
('САНХҮҮ', 'Нэхэмжлэх', true, true, true, true, true, 34),
('САНХҮҮ', 'Харилцахын гүйлгээ', false, false, false, false, true, 35),

('УДИРДАХ ЗӨВЛӨЛ ПОРТАЛ', 'Үндсэн хөрөнгө бүртгэл', true, false, false, true, true, 40),
('УДИРДАХ ЗӨВЛӨЛ ПОРТАЛ', 'Сонгууль, санал асуулга', true, false, false, true, true, 41),

('СИСАДМИН', 'Хандах эрхийн тохиргоо', true, true, true, true, true, 50),
('СИСАДМИН', 'Хэрэглэгчийн удирдлага', true, true, true, true, true, 51),
('СИСАДМИН', 'UserApp тохиргоо', true, true, true, true, true, 52),
('СИСАДМИН', 'Хаягжилт тохиргоо', true, true, true, true, true, 53),
('СИСАДМИН', 'Санхүүгийн тохиргоо', true, false, false, false, true, 54),
('СИСАДМИН', 'Үндсэн хөрөнгө тохиргоо', true, false, false, true, true, 55),
('СИСАДМИН', 'Real Estate market', true, false, false, false, true, 56),
('СИСАДМИН', 'Logs', false, false, false, false, true, 57);
