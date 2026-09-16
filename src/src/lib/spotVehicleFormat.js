// Зогсоол/Агуулах ({id,floorLevel,code}[]) болон Машин ({digits,letters}[])
// jsonb массивыг богино текст болгож харуулах — Owners.jsx БОЛОН
// Clientele.jsx хоёуланд ижилхэн ашиглагддаг тул 2026-08-16 тусдаа
// файл болгов (Rule of two). 2026-08-19: Зогсоол/Агуулах-ыг unit_parking/
// unit_storage-аас сонгодог dropdown болгосны дагуу {floor,no} хуучин
// чөлөөт бичвэрийн бүтцээс {id,floorLevel,code} snapshot бүтэц рүү шилжив.
export function summarizeSpots(items) {
  if (!items || items.length === 0) return '—';
  return items.filter((it) => it.code).map((it) => `${it.floorLevel} ${it.code}`).join(', ') || '—';
}

// 2026-09-03: Грид (Конструктор)-оос сонгосон слот/талбайн "code"
// (дэлгэцэнд харагдах текст) нь СОНГОСОН үеийн snapshot тул слотыг
// хожим "Хаягжилт тохиргоо"-с дахин нэрлэвэл хуучин нэр хэвээр
// харагдана (холбоос ХЭВЭЭР үлдэнэ ч, текст сэргээгдэхгүй). ҮҮнийг
// LIVE (useGridSpots-ийн одоогийн жагсаалт) харьцуулж, олдвол шинэ
// нэрийг, олдохгүй бол (устсан слот) хуучин snapshot-ыг үзүүлнэ.
export function summarizeGridSpots(items, liveList) {
  if (!items || items.length === 0) return '—';
  const liveMap = new Map((liveList || []).map((l) => [l.id, l]));
  return items
    .map((it) => {
      const live = liveMap.get(it.id);
      const floorLevel = live?.floorLevel || it.floorLevel;
      const code = live?.code || it.code;
      return code ? `${floorLevel} ${code}` : null;
    })
    .filter(Boolean)
    .join(', ') || '—';
}

export function summarizeVehicles(items) {
  if (!items || items.length === 0) return '—';
  return items.map((it) => `${it.digits} ${it.letters}`).join(', ');
}

// 2026-09-13: Зогсоол/Агуулах мвр бүр eeрийн ганц ӨУБД (property_no)-
// той байдаг тул, хүснэгэлийн ганц баганад бүгдийг нь (,-аар зааглан)
// харуулна.
export function summarizePropertyNos(items) {
  if (!items || items.length === 0) return '—';
  const nos = items.map((it) => it.propertyNo).filter(Boolean);
  return nos.length > 0 ? nos.join(', ') : '—';
}

// 2026-09-13: Грид (Конструктор)-ийн слот/талбайн "id" нь үргэлж
// "floorLevel:uuid" (жиш "F1:f69a41e3-...") гэсэн нийлмэл формат
// ашигладаг — цэвэр UUID БИШ. invoices.target_id (uuid багана) шиг
// цэвэр UUID шаардсан газарт шууд ашиглаж болохгүй тул, доторх бодит
// UUID хэсгийг задлан авна. Формат буруу бол null буцаана (дуудагч
// тал fallback ашиглана).
export function extractGridItemUuid(gridId) {
  if (!gridId || typeof gridId !== 'string') return null;
  const parts = gridId.split(':');
  const uuid = parts.length > 1 ? parts[1] : parts[0];
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid) ? uuid : null;
}
