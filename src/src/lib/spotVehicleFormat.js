// Зогсоол/Агуулах ({floor,no}[]) болон Машин ({digits,letters}[])
// jsonb массивыг богино текст болгож харуулах — Owners.jsx БОЛОН
// Clientele.jsx хоёуланд ижилхэн ашиглагддаг тул 2026-08-16 тусдаа
// файл болгов (Rule of two).

export function summarizeSpots(items) {
  if (!items || items.length === 0) return '—';
  return items.map((it) => `${it.floor}-${it.no}`).join(', ');
}

export function summarizeVehicles(items) {
  if (!items || items.length === 0) return '—';
  return items.map((it) => `${it.digits} ${it.letters}`).join(', ');
}
