-- 2026-09-24 (82): "Төлбөрийн хоцрогдол" тохиргоонд "Хугацаандаа"
-- (paid) мврийг ЗАСВАРЛАХ БОЛОМЖГүй (disabled) байсныг хэрэглэгчийн
-- шинэ, тодорхой хүсэлтээр (өмнөх шийдвэрийг эргүүлэн) идэвхжүүлнэ —
-- fin_settings-д paid_color багана нэмж, анхдагч утгыг Dashboard-ийн
-- одоо хэрэглэж байсан хатуу кодлогдсон "customGreen"-тэй адилхан
-- болгов (хүнд гэнэт eөрчлөлт мэдрэгдэхгүйгээр).
alter table fin_settings add column if not exists paid_color text not null default 'customGreen';
