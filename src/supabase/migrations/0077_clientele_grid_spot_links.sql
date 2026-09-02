-- 2026-09-02: "Талбай үмчлвгч" (аж ахуйн нэгж) л Зогсоол/Агуулах/
-- Талбай (полигон) БүГДийг холбож болно (owners-тэй ижил 6 багана).
alter table clientele add column if not exists has_grid_parking boolean not null default false;
alter table clientele add column if not exists grid_parkings jsonb not null default '[]'::jsonb;
alter table clientele add column if not exists has_grid_storage boolean not null default false;
alter table clientele add column if not exists grid_storages jsonb not null default '[]'::jsonb;
alter table clientele add column if not exists has_grid_land boolean not null default false;
alter table clientele add column if not exists grid_land_plots jsonb not null default '[]'::jsonb;
