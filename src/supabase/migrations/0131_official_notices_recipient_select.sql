-- 2026-09-13 (54): БОДИТ АЛДАА ЗАСАВ — резидентийн эрхээр
-- OfficialNoticeInbox.jsx-ийн query-г session simulation-ээр
-- шалгаж байхад олов: official_notices_select policy зөвхөн staff-
-- д (is_staff_member) зөвшөөрдэг байсан тул, official_notice_
-- recipients-тэй JOIN хийхэд, резидент eeрийн хvлээн авсан мэдэгдлийн
-- ТОЛГОЙ мөрийг (title/content/notice_type) харж чадахгүй байв
-- (мврийг officialnotice_recipients талаас нь харсан ч, JOIN хийсэн
-- official_notices талаас нь RLS хааж, хоосон үр дүн буцаадаг байсан).
-- Одоо резидент өөрийг нь хүлээн авагчаар нь бүртгэсэн мэдэгдлийн
-- толгойг ч харах эрхтэй болгов.
drop policy if exists "official_notices_select" on official_notices;
create policy "official_notices_select" on official_notices for select
  using (
    is_supersysadmin()
    or is_staff_member(tenant_id)
    or (id in (select notice_id from official_notice_recipients where owner_id in (select id from owners where user_id = auth.uid())))
  );
