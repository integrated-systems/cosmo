-- 2026-08-19 хэрэглэгчтэй тохиролцсон засвар: "Багц" баганы dropdown-ийн
-- дор давхар мөр (Дуусах: YYYY.MM.DD) үзүүлдэг байсныг арилгаж, оронд
-- нь "Багц идэвхжсэн" (plan_activated_at) БОЛОН "Багц дуусах"
-- (trial_ends_at) гэсэн 2 тусдаа багана үүсгэв — хүснэгэлийн мөр
-- үндүр болж, төвөгтэй харагдаж байсныг зассан. Тохиролцсон YYYY/MM/DD
-- формат бүх багцад үйлчилнэ (зөвхөн Trial биш).
alter table tenants add column if not exists plan_activated_at timestamptz;

update tenants set plan_activated_at = trial_ends_at - interval '14 days' where plan_activated_at is null and trial_ends_at is not null;
