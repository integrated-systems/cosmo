import JsBarcode from 'jsbarcode';

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
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 20;
const PX_PER_MM = 20; // ойролцоогоор 500dpi орчмын нягтралтай тод зураг гаргана

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function buildLabelPngBlob({ barcode, name }) {
  return new Promise((resolve, reject) => {
    const width = LABEL_WIDTH_MM * PX_PER_MM;
    const height = LABEL_HEIGHT_MM * PX_PER_MM;

    const barcodeCanvas = document.createElement('canvas');
    try {
      JsBarcode(barcodeCanvas, barcode, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 26,
        height: 90,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch (err) {
      reject(err);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const nameAreaHeight = name ? 60 : 8;
    if (name) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(truncate(name, 26), width / 2, 38);
    }

    const bcMaxWidth = width - 20;
    const bcMaxHeight = height - nameAreaHeight - 10;
    const scale = Math.min(bcMaxWidth / barcodeCanvas.width, bcMaxHeight / barcodeCanvas.height);
    const bcW = barcodeCanvas.width * scale;
    const bcH = barcodeCanvas.height * scale;
    const bcX = (width - bcW) / 2;
    const bcY = nameAreaHeight + (height - nameAreaHeight - bcH) / 2;
    ctx.drawImage(barcodeCanvas, bcX, bcY, bcW, bcH);

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
