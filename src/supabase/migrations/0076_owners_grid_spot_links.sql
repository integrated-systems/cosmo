-- 2026-09-02: Хэрэглэгчийн хүсэлт — "Конструктор (React)"-ээр зурсан
-- слот/агуулах/талбай (label)-ийг owners-той холбох боломж (аль
-- хэдийн байгаа parkings/storages-той ижил jsonb массив хэлбэр,
-- has_parking/has_storage-той ижил зарчмаар checkbox-той).
alter table owners add column if not exists has_grid_parking boolean not null default false;
alter table owners add column if not exists grid_parkings jsonb not null default '[]'::jsonb;
alter table owners add column if not exists has_grid_storage boolean not null default false;
alter table owners add column if not exists grid_storages jsonb not null default '[]'::jsonb;
alter table owners add column if not exists has_grid_land boolean not null default false;
alter table owners add column if not exists grid_land_plots jsonb not null default '[]'::jsonb;
