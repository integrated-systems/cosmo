// 2026-09-08 (11): CSV экспорт — IAS 16.73 disclosure/тайлангийн
// үндэс үүсгэдэг гарц. Үндсэн хөрөнгийн жагсаалт, Хуримтлагдсан
// элэгдэл, Засвар үйлчилгээ, Тооллого таб бүр энэ функцийг дундаа
// ашиглана (Rule of two) — "Экспортлох" товч тус бүрт логик
// давтахгүй.
export function exportToCsv(filename, rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((r) => columns.map((c) => {
    let v = typeof c.value === 'function' ? c.value(r) : r[c.key];
    if (v == null) v = '';
    v = String(v).replace(/"/g, '""');
    return `"${v}"`;
  }).join(','));
  const csv = [header, ...lines].join('\r\n');
  // \uFEFF (BOM) — Excel дээр кирилл үсэг зөв (UTF-8) харагдахад шаардлагатай.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
