// Чартын координат тооцоолол + Catmull-Rom → cubic Bezier "зөөлөн" муруй.
// admin-react/src/lib/marketValuationHelpers.js-ээс ЯГ хуулбарласан
// (tension=1, стандарт /6 хуваагч) — Cosmo болон admin-react хоёуланд
// ижил төрлийн муруй харагдана. "Rule of two" зарчмаар дахин ашиглагдах
// учир тусдаа модуль болгов.

// Координатыг chart хэмжээнд (width/height/padding) тааруулан байрлуулах
export function computeCoords(values, w, h, pad = 4, padTop = 4, padBottom = null) {
  padBottom = padBottom != null ? padBottom : padTop;
  const pts = [];
  const n = values.length;
  values.forEach((v, i) => { if (v != null && !isNaN(v)) pts.push({ i, v }); });
  if (!pts.length) return [];
  const valid = pts.map((p) => p.v);
  const min = Math.min(...valid), max = Math.max(...valid);
  const range = (max - min) || 1;
  return pts.map((p) => ({
    i: p.i, v: p.v,
    x: pad + (p.i / Math.max(n - 1, 1)) * (w - 2 * pad),
    y: h - padBottom - ((p.v - min) / range) * (h - padTop - padBottom),
  }));
}

// Catmull-Rom → cubic Bezier SVG path (жинхэнэ "зөөлөн муруй" тооцоолол)
export function smoothPathFromCoords(coords) {
  if (!coords.length) return '';
  if (coords.length === 1) return `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  if (coords.length === 2) return `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} L${coords[1].x.toFixed(1)},${coords[1].y.toFixed(1)}`;
  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;
    // Catmull-Rom control point-уудыг cubic Bezier control point болгож хөрвүүлэх
    // (tension=1, стандарт /6 хуваагч)
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}
