// Owners.jsx-ийн хүснэгэл БОЛОН Инфо модаль хоёуланд ижилхэн ашиглагддаг
// формат хийх туслах функцүүд — 2026-08-15 хэрэглэгчийн заасны дагуу
// тусдаа файл болгов (Rule of two).

export function summarizeSpots(items) {
  if (!items || items.length === 0) return '—';
  return items.map((it) => `${it.floor}-${it.no}`).join(', ');
}

export function summarizeVehicles(items) {
  if (!items || items.length === 0) return '—';
  return items.map((it) => `${it.digits} ${it.letters}`).join(', ');
}

export function formatDoorNo(n) {
  if (n == null) return '—';
  return String(n).padStart(3, '0');
}
