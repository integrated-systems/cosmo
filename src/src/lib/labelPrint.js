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
// Web Share дэмждэггүй орчинд (ихэвчлэн desktop) зурган файлыг татаж
// авахаар орлуулна (завсрын арга — desktop-ийн window.print() зам
// хожим тусад нь нэмэгдэнэ).
//
// 2026-09-07 (5): Формат CODE128 barcode-с QR код руу шилжив — ердийн
// камер апп (iOS/Android built-in) шууд уншдаг цорын ганц формат
// (CODE128-ыг энгийн камер уншиж чаддаггүй). QR-ийн агуулга бол Cosmo
// дахь тухайн хөрөнгийн мэдээллийн карт руу шууд орох URL
// (buildAssetDeepLink харна уу) — тооллого хийхэд утсаараа scan хийхэд
// шууд бодит цаг үеийн бүртгэл нээгдэнэ.
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 20;
const PX_PER_MM = 20; // ойролцоогоор 500dpi орчмын нягтралтай тод зураг гаргана

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

export async function buildLabelPngBlob({ tenantName, barcode, markSerial, deepLink }) {
  const width = LABEL_WIDTH_MM * PX_PER_MM;
  const height = LABEL_HEIGHT_MM * PX_PER_MM;

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, deepLink, { margin: 0, width: height - 8, color: { dark: '#000000', light: '#ffffff' } });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const qrSize = height - 8;
  ctx.drawImage(qrCanvas, 4, 4, qrSize, qrSize);

  const textX = qrSize + 16;
  const textMaxWidth = width - textX - 6;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';

  ctx.font = '600 15px sans-serif';
  ctx.fillText(truncate(tenantName || '', 22), textX, 42, textMaxWidth);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(truncate(barcode || '', 16), textX, 78, textMaxWidth);

  ctx.font = '400 15px sans-serif';
  ctx.fillText(truncate(markSerial || '—', 22), textX, 112, textMaxWidth);

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
      await navigator.share({ files: [file], title: 'Хөрөнгийн шошго' });
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
