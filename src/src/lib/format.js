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

export function formatMoney(amount) {
  const num = Number(amount) || 0;
  const [intPart, decPart] = num.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${decPart}`;
}
