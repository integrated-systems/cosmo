-- Integrated Systems (Cosmo) — хүснэгэлийн нэрийг богиносгох
-- 2026-08-15 хэрэглэгчийн заасны дагуу: "real_estate_market_prices" их
-- урт нэр байсныг "/restmarket" URL хаягтай яг тохирсон "restmarket"
-- гэсэн богино нэрээр сольсон. Одоогоор ЭНЭ хүснэгэлийг ямар ч frontend
-- код ашиглаагүй тул (RealEstateMarket.jsx хараахан session state-ээс л
-- уншдаг, DB рүү холбогдоогүй) rename аюулгүй.

alter table if exists real_estate_market_prices rename to restmarket;
