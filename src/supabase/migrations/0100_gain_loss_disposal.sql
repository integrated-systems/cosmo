-- 2026-09-08 (11): Актлахад үүсэх Ашиг/Алдагдал (IAS 16.71) —
-- generated багана. Postgres нь generated багана дотор ӨӨР generated
-- баганыг (book_value) ашиглахыг зөвшөөрдэггүй тул томьёог бүтэн
-- дэлгэрэнгүй бичив — book_value-той ЯГ ИЖИЛ (Rule of two, зөвхөн
-- нэг илэрхийлэл 2 газарт давхардсан ч эх сурвалж нь ижил байна).
-- Зөвхөн status=written_off үед л утгатай (бусад үед NULL).
alter table fixed_assets drop column if exists gain_loss;
alter table fixed_assets add column gain_loss numeric generated always as (
  case when status = 'written_off'
    then write_off_amount - (purchase_price + capitalized_amount - accumulated_depreciation)
    else null
  end
) stored;
