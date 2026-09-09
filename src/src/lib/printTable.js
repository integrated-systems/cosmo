// 2026-09-08 (12): Хэвлэх — CSV Экспорттой (exportCsv.js) ИЖИЛ
// columns тодорхойлолтыг ашиглаж, App-ийн Tailwind загвараас бүрэн
// тусгаарлагдсан ЦЭВЭР (clear format: өнгөгүй, зурас/сүдэргүй,
// зөвхөн хар/цагаан) HTML хүснэгэл үүсгэж, нуугдмал iframe-ээр
// хэвлэнэ — labelPrint.js-ийн iframe хэвлэх загварыг дахин ашигласан
// (Rule of two). А4 (landscape, 12мм margin)-т багтахаар тохируулав.
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printTable(title, rows, columns) {
  const headerHtml = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const rowsHtml = rows.map((r) => `<tr>${columns.map((c) => {
    let v = typeof c.value === 'function' ? c.value(r) : r[c.key];
    if (v == null) v = '';
    return `<td>${escapeHtml(v)}</td>`;
  }).join('')}</tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; margin: 0; }
    h1 { font-size: 13px; font-weight: bold; margin: 0 0 4mm; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: auto; }
    th, td { border: 0.25pt solid #000; padding: 2px 5px; text-align: left; }
    th { font-weight: bold; }
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
  </body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // хэвлэх цонх нээгдэхгүй бол чимээгүй орхино
    }
  };

  function cleanup() {
    setTimeout(() => iframe.remove(), 1000);
  }
  iframe.contentWindow?.addEventListener?.('afterprint', cleanup);
  setTimeout(cleanup, 15000);

  iframe.srcdoc = html;
}
