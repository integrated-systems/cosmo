-- 2026-08-28: Хэрэглэгчийн хүсэлт — Мессенжерийн badge (админ Sidebar
-- дээр БОЛОН OwnerApp-ийн tile дээр) хуудас дахин ачаалахгүйгээр
-- ШУУД (Supabase Realtime) шинэчлэгдэх ёстой. "msgr_list"/"msgr_messages"
-- хүснэгэл өмнө нь "supabase_realtime" publication-д ОГТ ороогүй
-- байсан тул postgres_changes subscribe хийсэн ч ямар ч event ирдэггүй
-- байв.
alter publication supabase_realtime add table msgr_list;
alter publication supabase_realtime add table msgr_messages;
