import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// Хуучин "suh" прототипийн БАРКОД баганын жинхэнэ бар-код зурган хэлбэрийг
// (зөвхөн placeholder текст биш) Cosmo дээр бодитоор үзүүлнэ. jsbarcode нь
// шууд <svg> элемент рүү зурдаг тул canvas хэрэггүй.
export default function BarcodeImage({ value, height = 28, width = 1.3 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height,
        width,
        background: 'transparent',
        lineColor: 'currentColor',
      });
    } catch {
      // Барcode-д тохирохгүй тэмдэгт орсон бол чимээгүй алгасна —
      // хайрцаг хоосон гарах нь хуудсыг эвдэхээс дээр.
    }
  }, [value, height, width]);

  if (!value) return <span className="text-mutedtext">—</span>;
  return <svg ref={ref} className="text-slate-900 dark:text-white" />;
}
