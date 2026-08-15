import { useEffect, useRef, useState } from 'react';
import { computeCoords, smoothPathFromCoords } from '../lib/chartMath';
import { formatMoney } from '../lib/format';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthAbbr(monthStr) {
  const mm = parseInt(monthStr.split('/')[1], 10);
  return MONTH_ABBR[mm - 1] || '';
}

const STROKE_WIDTH = 1;
const MARKER_RADIUS = (STROKE_WIDTH * 3) / 2; // диаметр = зузаан(өргөн)-аас 3 дахин их, 1:1 харьцаатай тойрог — STROKE_WIDTH-аас уялдуулан тооцдог тул зузаан багасахад маркер ч автоматаар багасна
const AXIS_HEIGHT = 16;

// Хотхоны зах зээлийн бодит үнэлгээний картуудад ашиглагдах "зөөлөн"
// (Catmull-Rom → cubic Bezier) SVG муруй чарт. ResizeObserver-ээр эцэг
// container-ийн ӨРГӨН БОЛОН ӨНДРИЙГ хоёуланг нь дагана.
//
// props.series: [{ label, color, data: number[] }]
// props.months: series[i].data-той АДИЛ УРТТАЙ 'YYYY/MM' мөрийн массив —
//   зөвхөн showAxis=true үед шаардлагатай (2026-08-15 хэрэглэгчийн заасан
//   Агуулах/Зогсоол чартын хэвтээ тэнхлэг+дугуй маркер+hover попап засвар)
export default function MarketValuationChart({ series, months, showAxis = false }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height } = size;
  const axisHeight = showAxis ? AXIS_HEIGHT : 0;
  const chartHeight = Math.max(height - axisHeight, 0);

  const seriesCoords = width > 0 && chartHeight > 0
    ? series.map((s) => ({ ...s, coords: computeCoords(s.data, width, chartHeight, 4, 8, 8) }))
    : [];

  return (
    <div ref={wrapRef} className="w-full h-full relative">
      {width > 0 && chartHeight > 0 && (
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
          {seriesCoords.map((s) => (
            <path
              key={s.label}
              d={smoothPathFromCoords(s.coords)}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {showAxis && seriesCoords.map((s) => s.coords.map((c) => (
            <g key={`${s.label}-${c.i}`}>
              {/* Hover-д барихад амархан том, харагдахгүй hit-area + жинхэнэ 1:1 тойрог маркер */}
              <circle
                cx={c.x} cy={c.y} r={MARKER_RADIUS + 5}
                fill="transparent"
                onMouseEnter={() => setHover({ x: c.x, y: c.y, label: s.label, value: c.v, month: months?.[c.i] })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              />
              <circle cx={c.x} cy={c.y} r={MARKER_RADIUS} fill={s.color} pointerEvents="none" />
            </g>
          )))}

          {showAxis && months && seriesCoords[0]?.coords.map((c) => (
            <text
              key={`axis-${c.i}`}
              x={c.x} y={chartHeight + 12}
              textAnchor="middle"
              className="fill-slate-400 dark:fill-darktext"
              style={{ fontSize: '9px' }}
            >
              {monthAbbr(months[c.i])}
            </text>
          ))}
        </svg>
      )}

      {hover && (
        <div
          className="absolute z-10 pointer-events-none rounded-md bg-white dark:bg-sidebg border border-slate-200 dark:border-bordercol px-2 py-1 text-[11px] whitespace-nowrap shadow-lg"
          style={{ left: hover.x, top: hover.y, transform: 'translate(-50%, -130%)' }}
        >
          <div className="font-medium text-slate-900 dark:text-white">{hover.label}</div>
          <div className="text-slate-500 dark:text-mutedtext">{formatMoney(hover.value)}₮{hover.month ? ` · ${hover.month}` : ''}</div>
        </div>
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
