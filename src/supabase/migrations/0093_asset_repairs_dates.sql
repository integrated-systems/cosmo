-- 2026-09-08 (2): "Засвар үйлчилгээ" эхэлсэн/дууссан огнооны хугацаа
-- хадгалдаг болов (repair_date -> start_date, end_date шинээр).
-- Энэ хугацаанд байгаа хөрөнгийг "Үндсэн хөрөнгийн жагсаалт"
-- хүснэгэлд автоматаар "Засварт" (custom оранж) гэж тэмдэглэнэ
-- (клиент талд өнөөдрийн огноог start_date/end_date-тэй харьцуулж
-- тооцоологдоно — тусад нь баганагүй, runtime тооцоолол).
alter table asset_repairs rename column repair_date to start_date;
alter table asset_repairs add column if not exists end_date date;
