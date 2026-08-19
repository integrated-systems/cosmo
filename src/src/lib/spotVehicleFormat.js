// Зогсоол/Агуулах ({id,floorLevel,code}[]) болон Машин ({digits,letters}[])
// jsonb массивыг богино текст болгож харуулах — Owners.jsx БОЛОН
// Clientele.jsx хоёуланд ижилхэн ашиглагддаг тул 2026-08-16 тусдаа
// файл болгов (Rule of two). 2026-08-19: Зогсоол/Агуулах-ыг unit_parking/
// unit_storage-аас сонгодог dropdown болгосны дагуу {floor,no} хуучин
// чөлөөт бичвэрийн бvтцээс {id,floorLevel,code} snapshot бvтэц рvv шилжив.
export function summarizeSpots(items) {
  if (!items || items.length === 0) return '—';
  return items.filter((it) => it.code).map((it) => `${it.floorLevel} ${it.code}`).join(', ') || '—';
}

export function summarizeVehicles(items) {
  if (!items || items.length === 0) return '—';
  return items.map((it) => `${it.digits} ${it.letters}`).join(', ');
}
