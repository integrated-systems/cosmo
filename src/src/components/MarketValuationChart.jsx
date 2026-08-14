import { useEffect, useRef, useState } from 'react';
import { computeCoords, smoothPathFromCoords } from '../lib/chartMath';
import { formatMoney } from '../lib/format';

// Хотхоны зах зээлийн бодит үнэлгээний картуудад ашиглагдах "зөөлөн"
// (Catmull-Rom → cubic Bezier) SVG муруй чарт. Responsive: ResizeObserver-
// ээр эцэг container-ийн өргөнийг дагана (admin-react-той адил хандлага).
// props.series: [{ label, color, data: number[] }]
export default function MarketValuationChart({ series, height = 96 }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paths = width > 0
    ? series.map((s) => ({
        ...s,
        d: smoothPathFromCoords(computeCoords(s.data, width, height, 4, 6, 6)),
      }))
    : [];

  return (
    <div ref={wrapRef} className="w-full h-full">
      {width > 0 && (
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
          {paths.map((p) => (
            <path
              key={p.label}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      )}
    </div>
  );
}

// Өнгөт цэг+сүүлийн сарын утга легенд (жиш нь "● 1 өрөө: 2,500,000.00₮")
export function MarketValuationLegend({ series, unit = '₮' }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-mutedtext">
      {series.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
          {s.label}: {formatMoney(s.data[s.data.length - 1])}{unit}
        </span>
      ))}
    </div>
  );
}
