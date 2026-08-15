-- Integrated Systems (Cosmo) — Төлбөрийн 3-р алхам: "Гараар (invoice)"
-- горим. SUPERSYSADMIN "Tenant Status" хуудаснаас СӨХ-үүдийн статусыг
-- (trial→active г.м) гараар өөрчилдөг. tenants хүснэгэлд SELECT policy
-- аль хэдийн байсан, UPDATE policy одоо нэмж өгөв.

create policy "supersysadmin tenants статус өөрчилж чадна"
  on tenants for update
  using (is_supersysadmin())
  with check (is_supersysadmin());
