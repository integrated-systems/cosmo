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
