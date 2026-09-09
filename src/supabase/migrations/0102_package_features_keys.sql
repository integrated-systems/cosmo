-- 2026-09-08 (16): package_features-д menu.js-ийн тогтвортой "key"-
-- тэй тохирох feature_key багана нэмж, аль хэдийн байгаа 35 мврийг
-- тэдгээр key-ээр холбов (текст label-аар тохируулах эмзэг байдлыг
-- арилгав). Мөн menu.js-д байгаа ч package_features-д огт байгаагүй
-- 5 модулийг (Имэйл, Дуудлага бүртгэл, Гүйцэтгэл, Төлөвлөгөө, Тайлан)
-- нэмэв. "Худалдан авалт" мөрийн feature_key-г NULL үлдээв — учир нь
-- menu.js-д үүнд тохирох модуль (route) одоогоор огт үүсээгүй.
alter table package_features add column if not exists feature_key text;

update package_features set feature_key = 'dashboard' where feature_label = 'Хянах самбар';
update package_features set feature_key = 'news' where feature_label = 'Мэдээ, мэдээлэл';
update package_features set feature_key = 'anndunn' where feature_label = 'Мэдэгдэл';
update package_features set feature_key = 'msgr' where feature_label = 'Мессенжер';
update package_features set feature_key = 'classifieds' where feature_label = 'Зарын самбар';

update package_features set feature_key = 'owners' where feature_label = 'Сууц өмчлөгч бүртгэл';
update package_features set feature_key = 'clientele' where feature_label = 'Талбай өмчлөгч бүртгэл';
update package_features set feature_key = 'property' where feature_label = 'Тоот, Зогсоол, Агуулах';
update package_features set feature_key = 'parking' where feature_label = 'Түр зогсоол бүртгэл';
update package_features set feature_key = 'nfcgate' where feature_label = 'Хаалт удирдлага';
update package_features set feature_key = 'nfcent' where feature_label = 'Чип удирдлага';
update package_features set feature_key = 'lift' where feature_label = 'Лифт удирдлага';

update package_features set feature_key = 'hrm' where feature_label = 'Хүний нөөцийн удирдлага';
update package_features set feature_key = 't&a' where feature_label = 'Цаг бүртгэл';
update package_features set feature_key = 'repairs' where feature_label = 'Засвар үйлчилгээ';
update package_features set feature_key = 'maintenances' where feature_label = 'Тохижилт үйлчилгээ';
update package_features set feature_key = 'sanitations' where feature_label = 'Цэвэрлэгээ үйлчилгээ';
update package_features set feature_key = 'providers' where feature_label = 'Харилцагчийн бүртгэл';

update package_features set feature_key = 'accounting' where feature_label = 'Нягтлан бодох бүртгэл';
update package_features set feature_key = 'repfintax' where feature_label = 'Санхүү, татварын тайлан';
update package_features set feature_key = 'repinner' where feature_label = 'Дотоод тайлан';
update package_features set feature_key = 'payrollacc' where feature_label = 'Цалин бодолт';
update package_features set feature_key = 'invoice' where feature_label = 'Нэхэмжлэх';
update package_features set feature_key = 'transactions' where feature_label = 'Харилцахын гүйлгээ';

update package_features set feature_key = 'fixedassets' where feature_label = 'Үндсэн хөрөнгө бүртгэл';
update package_features set feature_key = 'voting' where feature_label = 'Сонгууль, санал асуулга';

update package_features set feature_key = 'rolesrules' where feature_label = 'Хандах эрхийн тохиргоо';
update package_features set feature_key = 'accounts' where feature_label = 'Хэрэглэгчийн удирдлага';
update package_features set feature_key = 'uappconfig' where feature_label = 'UserApp тохиргоо';
update package_features set feature_key = 'addressing' where feature_label = 'Хаягжилт тохиргоо';
update package_features set feature_key = 'finconfig' where feature_label = 'Санхүүгийн тохиргоо';
update package_features set feature_key = 'fixedassconfig' where feature_label = 'Үндсэн хөрөнгө тохиргоо';
update package_features set feature_key = 'restmarket' where feature_label = 'Real Estate market';
update package_features set feature_key = 'logs' where feature_label = 'Logs';

-- menu.js-д байгаа ч энэ хүснэгэлд огт байгаагүй 5 модулийг нэмэв.
insert into package_features (section, feature_label, feature_key, is_done, basic, standard, premium, premium_plus, sort_order) values
('ҮНДСЭН', 'Имэйл', 'emails', false, false, true, true, true, 4),
('БҮРТГЭЛ', 'Дуудлага бүртгэл', 'dispatcher', false, false, true, true, true, 13),
('ДОТООД ҮЙЛ АЖИЛЛАГАА', 'Гүйцэтгэл', 'performance', false, false, false, false, true, 27),
('УДИРДАХ ЗӨВЛӨЛ ПОРТАЛ', 'Төлөвлөгөө', 'planing', false, false, false, true, true, 42),
('УДИРДАХ ЗӨВЛӨЛ ПОРТАЛ', 'Тайлан', 'repboard', false, false, false, true, true, 43);
