-- 2026-09-20 (58): "Төлбөрийн хоцрогдол" тохиргоо (overdue_days,
-- at_risk_days) хүснэгэлд хадгалагддаг ч, ЯМАР Ч индикатор энэ утгыг
-- уншдаггүй байсныг хэрэглэгч олов (зөвхөн FinConfig.jsx-д
-- тодорхойлогдож, хадгалагддаг, гэхдээ бусад файлд ХАА Ч дуудагддаггүй
-- байв). Одоо PaymentBadges.jsx/UnitGridCard.jsx-ийн 3 төлөвийн
-- (paid/overdue/at_risk) өнгийг ч ЭНД тохируулдаг болгов.
alter table fin_settings add column if not exists overdue_color text not null default 'customYellow';
alter table fin_settings add column if not exists at_risk_color text not null default 'customRed';
