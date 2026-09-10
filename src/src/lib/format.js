// Глобал формат дүрэм - бүх SaaS хэмжээнд ижил байх ёстой. Огноо
// YYYY/MM/DD, цаг HH:MM:SS, мөнгө 1,000.00 (таслал бүлэглэлт, 2 орны
// бүтэн хувиар - 2026-09-04 хэрэглэгчийн тодорхой заасны дагуу
// апостроф ('000'000.00)-оос энэ форматад шилжив).

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

// 2026-09-08 (25): Багцын сарын мөчлөгийн дуусах огноо — plan_activated_at
// + 1 сар. Topbar.jsx болон TenantStatus.jsx хоёулаа ашигладаг тул
// нэг л газраас гаргав (Rule of two).
export function planPeriodEnd(planActivatedAt) {
  if (!planActivatedAt) return null;
  const d = new Date(planActivatedAt);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  return `${formatDate(d)} ${formatTime(d)}`;
}

// Секундгүй богино хувилбар ("YYYY/MM/DD HH:MM") — Тооллогын түүх
// зэрэг секунд шаардлагагүй огноо+цагийн харагдацад ашиглана.
export function formatDateTimeMinutes(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${formatDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatMoney(amount) {
  const num = Number(amount) || 0;
  const [intPart, decPart] = num.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${decPart}`;
}
