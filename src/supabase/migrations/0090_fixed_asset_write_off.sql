-- 2026-09-07 (9): "Хөрөнгө актлах" модаль (AssetInfoModal-аас дуудагдана)
-- — status='written_off' болгохын хамт актласан огноо/шалтгаан/үнийг
-- хадгална.
alter table fixed_assets add column if not exists write_off_date date;
alter table fixed_assets add column if not exists write_off_reason text check (write_off_reason in ('Эвдэрсэн', 'Худалдсан', 'Хандивласан', 'Хуучирсан', 'Бусад'));
alter table fixed_assets add column if not exists write_off_amount numeric not null default 0;
