// Owners.jsx-ийн хүснэгэл БОЛОН Инфо модаль хоёуланд ижилхэн ашиглагддаг
// формат хийх туслах функцүүд. summarizeSpots/summarizeVehicles нь ерүнхий
// (Clientele.jsx-д ч ашиглагддаг) тул spotVehicleFormat.js-ээс дахин
// экспортолно (Rule of two, 2026-08-16).

export { summarizeSpots, summarizeVehicles } from './spotVehicleFormat';

export function formatDoorNo(n) {
  if (n == null) return '—';
  return String(n).padStart(3, '0');
}
