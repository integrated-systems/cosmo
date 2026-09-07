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
// 2026-09-07 (12): QR-ийг хэвлэсний дараа камер уншихгүй байсныг
// засав — 2 үндсэн шалтгаан: (1) margin:0 нь QR-ийн стандарт "quiet
// zone" (хоосон хүрээ)-г бүрэн арилгаж, finder pattern-ыг таних
// боломжгүй болгосон, (2) URL хэт урт (tenant UUID орсон, ~120
// тэмдэгт) тул QR 45x45 орчим модультай болж, 203dpi thermal
// принтерт модуль тус бүр 2-3 dot орчим болж (dot gain-аас) холилдож
// байсан. Одоо:
//   - URL-ийг богиносгов: tenant UUID-г ХАСАЖ, зөвхөн /a/{barcode}
//     (~65 тэмдэгт) — AssetShortLink.jsx tenant-ыг баркодны рег.
//     дугаараас олж дараа нь бүтэн route руу шилжүүлнэ.
//   - margin-ыг QR-ийн стандарт анхдагч руу буцаав (quiet zone
//     заавал байх ёстой).
//   - errorCorrectionLevel-ийг 'M' (тэнцүүржүүлсэн) руу буцаав.
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 20;
const PX_PER_MM = 20; // ойролцоогоор 500dpi орчмын нягтралтай тод зураг гаргана
const QR_SIZE_MM = 18;
const PADDING_MM = 1;
const LINE_FONT_PX = 38;

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// HashRouter ашигладаг тул query param нь "#/..." хэсгийн дотор орно.
// Богино хэлбэр: https://integrated-systems.github.io/cosmo/#/a/{barcode}
export function buildAssetDeepLink(barcode) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/a/${encodeURIComponent(barcode)}`;
}

export async function buildLabelPngBlob({ orgName, barcode, assetName, markSerial, deepLink }) {
  const width = LABEL_WIDTH_MM * PX_PER_MM;
  const height = LABEL_HEIGHT_MM * PX_PER_MM;
  const qrSize = QR_SIZE_MM * PX_PER_MM;
  const padding = PADDING_MM * PX_PER_MM;
  const gap = padding; // QR ба текстийн хоорондох зай — padding-тай ижил пропорц

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, deepLink, { width: qrSize, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Зүүн/дээд/доод ирмэгийн зай бүгд ИЖИЛ (padding) — QR босоогоор
  // яг төвд байрлана (дээд/доод padding автоматаар тэнцүү болно).
  const qrX = padding;
  const qrY = Math.round((height - qrSize) / 2);
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Текстийн блок QR-тэй яг АДИЛ өндөртэй (qrY..qrY+qrSize), 4 мврийг
  // тэр зайд тэнцүү хуваана. 2026-09-07 (11): хэрэглэгчийн заасны
  // дагуу бүх 4 мвр ИЖИЛ хэмжээ (34px), ИЖИЛ жин (normal), ИЖИЛ өнгө
  // (хар/default) — ямар ч визуал ялгаа үгүй, цэвэр текст.
  const textX = qrX + qrSize + gap;
  const textMaxWidth = width - textX - padding;
  const lineGap = qrSize / 4;
  const baseY = qrY + lineGap * 0.68;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#000000';
  ctx.font = `normal ${LINE_FONT_PX}px sans-serif`;

  ctx.fillText(truncate(orgName || '', 16), textX, baseY, textMaxWidth);
  ctx.fillText(truncate(barcode || '', 16), textX, baseY + lineGap, textMaxWidth);
  ctx.fillText(truncate(assetName || '', 16), textX, baseY + lineGap * 2, textMaxWidth);

  ctx.fillText(truncate(markSerial || '—', 16), textX, baseY + lineGap * 3, textMaxWidth);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to build label PNG'))), 'image/png');
  });
}

// Desktop дээр browser-ийн стандарт хэвлэх цонхыг (@page 40mm x 20mm)
// нээнэ — хуучин "зурган файл татах" fallback-ыг орлов.
function printLabelInBrowser(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
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
      URL.revokeObjectURL(url);
      setTimeout(() => iframe.remove(), 1000);
      resolve(true);
    }
    iframe.contentWindow?.addEventListener?.('afterprint', cleanup);
    // afterprint дуудагдахгүй хуучин browser-т зориулсан нөөц цэвэрлэгээ.
    setTimeout(cleanup, 15000);

    iframe.srcdoc = `<!DOCTYPE html><html><head><style>
      @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
      html, body { margin: 0; padding: 0; }
      img { width: ${LABEL_WIDTH_MM}mm; height: ${LABEL_HEIGHT_MM}mm; display: block; }
    </style></head><body><img src="${url}" /></body></html>`;
  });
}

// Гар утас (Web Share, файлтай) дэмжигддэг үед Хуваалцах цонх нээнэ.
// Дэмждэггүй орчинд (ихэвчлэн desktop) browser-ийн хэвлэх цонхыг нээнэ.
export async function shareOrDownloadLabel(blob, filename) {
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Хeрeнгийн шошго' });
      return true;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return false; // хэрэглэгч цуцалсан
    // бусад алдаа гарвал доорх хэвлэх горимд орлоно
  }

  return printLabelInBrowser(blob);
}
