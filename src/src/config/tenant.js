// 2026-08-15: HoaSwitcher одоо useTenants()-ээр бодит "tenants" хүснэгэлээс
// уншдаг болсон тул :hoaId нь URL дээр бодит tenant UUID байдаг. Энэ
// тогтмол зөвхөн (1) "/" root route-ийн анхны redirect, (2) :hoaId
// параметр ямар нэг шалтгаанаар алга байх нөхцөлийн нөөц утга — 2 газарт
// л ашиглагдана. Хэрэглэгчийн үүсгэсэн анхны tenant ("Хүннү 2222").
export const DEFAULT_TENANT_ID = '1a8623e2-7fcf-47a1-b90c-43a1fb761aa2';
