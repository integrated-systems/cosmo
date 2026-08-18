-- Integrated Systems (Cosmo) — "Дугаарын бүтэц" сонголт: "Байр+Давхар+Тоот"
-- (structure_type='floor') эсвэл "Байр+Орц+Тоот" (structure_type='entrance').
-- Байр тус бүрд (мөр бүрт давхардуулан) хадгална — spacer-ийн адил зарчим.

alter table unit_layouts add column if not exists structure_type text not null default 'floor';
