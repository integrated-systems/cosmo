import QRCode from 'qrcode';

// Шошго хэвлэх (Xprinter XP-P203A/XP-P32B, Bluetooth-оор л ажилладаг
// зөөврийн принтер) — 2026-09-07: эхний үе шат зөвхөн iPad/iPhone дээр
// турших зорилготой.
//
// iOS Safari Web Bluetooth-ыг ДЭМЖДЭГГүй тул шууд принтерт холбогдож
// чадахгүй. Тиймээс: (1) шошгыг PNG зураг болгож canvas дээр зурна,
// (2) Web Share API (navigator.share файлтай)-аар "Хуваалцах" цонх
// нээж, хэрэглэгч тэндээс өөрийн утсан дээр суулгасан "XPrinter" аппыг
// сонгоод, тэр апп өөрийн Bluetooth холболтоор бодит хэвлэлтийг хийнэ.
//
// 2026-09-07 (7): Хэрэглэгчийн зурган жишээгээр (4 мвр текст + жижиг
// QR) дахин зохиов:
//   1-р мвр: Байгууллагын нэр (org_report_info.org_name)
//   2-р мвр: Хeрeнгийн бүртгэлийн дугаар (СөХ рег.дугаар-дэс дугаар)
//   3-р мвр: Хeрeнгийн нэр, брэнд
//   4-р мвр: Марк, сериал
// QR-ийг ~16мм хэмжээтэй болгож (40x20мм шошгон дээр хэт том
// байсныг) багасгаж, текстэд илүү зай гарган зохион байгуулав.
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 20;
const PX_PER_MM = 20; // ойролцоогоор 500dpi орчмын нягтралтай тод зураг гаргана
const QR_SIZE_MM = 16;

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// HashRouter ашигладаг тул query param нь "#/..." хэсгийн дотор орно.
// Жиш: https://integrated-systems.github.io/cosmo/#/{hoaId}/fixedassets?asset={barcode}
export function buildAssetDeepLink(hoaId, barcode) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/${hoaId}/fixedassets?asset=${encodeURIComponent(barcode)}`;
}

export async function buildLabelPngBlob({ orgName, barcode, assetName, markSerial, deepLink }) {
  const width = LABEL_WIDTH_MM * PX_PER_MM;
  const height = LABEL_HEIGHT_MM * PX_PER_MM;
  const qrSize = QR_SIZE_MM * PX_PER_MM;

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, deepLink, { margin: 0, width: qrSize, color: { dark: '#000000', light: '#ffffff' } });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const qrX = 8;
  const qrY = Math.round((height - qrSize) / 2);
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  const textX = qrX + qrSize + 16;
  const textMaxWidth = width - textX - 6;
  ctx.textAlign = 'left';

  ctx.fillStyle = '#000000';
  ctx.font = '600 15px sans-serif';
  ctx.fillText(truncate(orgName || '', 24), textX, 46, textMaxWidth);

  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(truncate(barcode || '', 16), textX, 136, textMaxWidth);

  ctx.font = '500 15px sans-serif';
  ctx.fillText(truncate(assetName || '', 22), textX, 226, textMaxWidth);

  ctx.fillStyle = '#555555';
  ctx.font = '400 13px sans-serif';
  ctx.fillText(truncate(markSerial || '—', 24), textX, 316, textMaxWidth);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to build label PNG'))), 'image/png');
  });
}

// Хуваалцах цонх нээж (эсвэл дэмжихгүй бол татаж авахаар орлуулж)
// амжилттай үүссэн эсэхийг буцаана.
export async function shareOrDownloadLabel(blob, filename) {
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Хүрүнгийн шошго' });
      return true;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return false; // хэрэглэгч цуцалсан
    // бусад алдаа гарвал доорх татах горимд орлоно
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
