-- 2026-09-22 (62): Дансны нэгдсэн жагсаалтыг Монгол улсын Сангийн
-- сайдын 2017.12.28-ны 386 дугаар тушаалын 1 дүгээр хавсралт
-- (Төрийн бус байгууллагад мөрдөх дансны нэгдсэн жагсаалт)-тай
-- нийцүүлэв. Тушаалын 1.4-т "Улсын хэмжээнд дансны жагсаалтын
-- эхний хоёр орон НЭГ ИЖИЛ кодтой байна" гэсэн шаардлагын дагуу,
-- манай кодын эхний 2 орныг (10=Мөнгөн хөрэнгө, 12=Авлагын данс,
-- 14=Бараа материал, 18=Урьдчилж төлсөн зардал, 20=үндсэн хөрэнгө,
-- 31=Дансны өглөг, 32=Урьдчилж орсон орлого, 33=Бусад өглөг,
-- 41=Нөөц/Хуримтлалын сан, 54=Түрээсийн орлого, 56=Бусад орлого,
-- 70=Ерөнхий удирдлагын зардал) албан ёсны стандарттай тохируулав.
-- Кассад/Харилцах (10), үндсэн хөрөнгө (20), Зардал (70) аль хэдийн
-- зөв прификстэй байсан тул кодгүй хэвээр үлдэв.
--
-- АЮУЛГүй БАЙДЛЫН ЗАГВАР: шинэ код нь ХУУЧИН кодтой ДАВХЦАЖ
-- болзошгүй тул (жиш 1110→1210 хийхээс өмнө өөр мөр 1030→1110
-- болсон байвал 2 дахь UPDATE нь буруу мөрийг ч хамруулна), эхлээд
-- БүХ кодыг "TMP-" угтвартай ДАВХЦАШГүй түр кодод шилжүүлж, дараа
-- нь эцсийн кодод шилжүүлнэ (2 үетэй, ямар ч дараалал зөвшөөрнө).
update chart_of_accounts set code='TMP-1110' where code='1030';
update chart_of_accounts set code='TMP-1210' where code='1110';
update chart_of_accounts set code='TMP-1220' where code='1120';
update chart_of_accounts set code='TMP-1230' where code='1130';
update chart_of_accounts set code='TMP-1240' where code='1140';
update chart_of_accounts set code='TMP-1290' where code='1190';
update chart_of_accounts set code='TMP-1410' where code='1210';
update chart_of_accounts set code='TMP-1420' where code='1220';
update chart_of_accounts set code='TMP-1430' where code='1230';
update chart_of_accounts set code='TMP-1810' where code='1400';
update chart_of_accounts set code='TMP-3110' where code='3010';
update chart_of_accounts set code='TMP-3120' where code='3020';
update chart_of_accounts set code='TMP-3130' where code='3030';
update chart_of_accounts set code='TMP-3310' where code='3040';
update chart_of_accounts set code='TMP-3210' where code='3050';
update chart_of_accounts set code='TMP-4110' where code='4010';
update chart_of_accounts set code='TMP-5410' where code='5400';
update chart_of_accounts set code='TMP-5610' where code='5600';

update chart_of_accounts set code=replace(code, 'TMP-', '') where code like 'TMP-%';

-- journal_entry_lines-ийн ЯГ ИЖИЛ хүснэгэлийн бичилтүүдийг ч мөн
-- шинэ кодтой уялдуулна (ЯГ ИЖИЛ 2 үетэй аюулгүй загвар).
update journal_entry_lines set account_code='TMP-1110' where account_code='1030';
update journal_entry_lines set account_code='TMP-1210' where account_code='1110';
update journal_entry_lines set account_code='TMP-1220' where account_code='1120';
update journal_entry_lines set account_code='TMP-1230' where account_code='1130';
update journal_entry_lines set account_code='TMP-1240' where account_code='1140';
update journal_entry_lines set account_code='TMP-1290' where account_code='1190';
update journal_entry_lines set account_code='TMP-1410' where account_code='1210';
update journal_entry_lines set account_code='TMP-1420' where account_code='1220';
update journal_entry_lines set account_code='TMP-1430' where account_code='1230';
update journal_entry_lines set account_code='TMP-1810' where account_code='1400';
update journal_entry_lines set account_code='TMP-3110' where account_code='3010';
update journal_entry_lines set account_code='TMP-3120' where account_code='3020';
update journal_entry_lines set account_code='TMP-3130' where account_code='3030';
update journal_entry_lines set account_code='TMP-3310' where account_code='3040';
update journal_entry_lines set account_code='TMP-3210' where account_code='3050';
update journal_entry_lines set account_code='TMP-4110' where account_code='4010';
update journal_entry_lines set account_code='TMP-5410' where account_code='5400';
update journal_entry_lines set account_code='TMP-5610' where account_code='5600';

update journal_entry_lines set account_code=replace(account_code, 'TMP-', '') where account_code like 'TMP-%';
