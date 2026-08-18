// "Мэдээ, мэдээлэл" (/news) хуудасны мэдээний карт зvvн дээд буланд
// байрлах динамик мвр — [YYYY.MM.DD][Гарагийн нэр],[HH:MM:SS] — 2026-08-19
// screenshot-оор vзvvлсэн формат (lib/format.js-ийн глобал YYYY/MM/DD-ээс
// ЗОРИУДААР ялгаатай, зvвхvн энэ мэдээний карт дээр ашиглагдана).
const WEEKDAYS_MN = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пvрэв', 'Баасан', 'Бямба'];

export function formatNewsDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  const weekday = `${WEEKDAYS_MN[d.getDay()]} гариг`;
  const timeStr = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return `${dateStr} ${weekday}, ${timeStr}`;
}

export function formatViewCount(count) {
  return String(count ?? 0).padStart(3, '0');
}
