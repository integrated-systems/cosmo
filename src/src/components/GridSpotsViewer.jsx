import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-09-02: "Тоот, Зогсоол, Агуулах" хуудасны шинэ "Зогсоол,
// Агуулах, Талбай" таб — "Хаягжилт тохиргоо -> Зогсоол, Агуулах,
// Талбай" табаас "Нийтлэх" дарсан (status='published') грид зургийг
// зөвхөн УНШИХ (READ-ONLY) горимоор харуулж, слот/агуулах/талбай дээр
// дарахад parent-руу callback дуудна ("Тоот" табтай ижил интерактив
// зарчим).
//
// 2026-09-03: Хэрэглэгчийн хүсэлт - staff зориудаар хүрээ/дүүргэлтийн
// внгв вгввгүй л бол, default харагдац "Тоот" таб (UnitGridCard.jsx)-
// тай ЯГ ИЖИЛ (саарал, theme-aware) байх ёстой - Dark/Light mode
// хоёуланд адилхан үйлчилнэ. ҮҮнийг Tailwind-ийн className-аар
// (border-slate-500/30, bg-slate-500/[0.10], text-slate-400
// dark:text-mutedtext) хэрэгжүүлж, зөвхөн ЗОРИУДААР сонгосон внгвг
// л inline style-аар дарж бичнэ. SVG-д "currentColor" trick ашиглаж,
// Tailwind-ийн text-* классаар stroke/fill-ийг theme-aware болгов.
//
// 2026-09-04 (2): Хэрэглэгчийн тодруулга - "link" (эзэмшигчтэй эсэх)
// үвр нь слот/полигоныг хагас тунгалаг УЛААНААР үзүүлдэг байсныг
// АРИЛГАВ. Эзэмшигчтэй байх нь ТОГТМОЛ (урт хугацаат) байдал тул
// визуал ялгаа үүсгэх ёсгүй - зөвхөн CLICK-ийн үр дүнд (Инфо модаль
// vv, Нэмэх модаль vv) л ялгаатай үйлдэл хийнэ. Богино хугацаат
// (төлбөр, мессеж, сонгуулийн санал өнгөлөлт гэх мэт) ДИНАМИК дохио
// л ирээдүйд слот/полигон/тоотын хүрээ-фон внгвгүүр илэрхийлэгдэнэ.
const CELL = 24;

function cellsRange(slots, lines, texts, compasses, cellSize) {
  let maxCol = 20, maxRow = 15;
  slots.forEach((s) => {
    const w = s.kind === 'warehouse' ? 1 : (s.horizontal ? 2 : 1);
    const h = s.kind === 'warehouse' ? 1 : (s.horizontal ? 1 : 2);
    maxCol = Math.max(maxCol, s.col + w);
    maxRow = Math.max(maxRow, s.row + h);
  });
  // 2026-09-04: шулуун зураас/текст/компасс слотоос хол байрлаж
  // болзошгүй тул canvas-ийн хэмжээг тэдгээрийг ч тооцож үүсгэнэ
  // (эс үгүй бол canvas-ийн ирмэгээс гадуур таслагдаж үзэгдэхгүй
  // болно).
  lines.forEach((l) => {
    maxCol = Math.max(maxCol, Math.ceil(l.x1 / cellSize), Math.ceil(l.x2 / cellSize));
    maxRow = Math.max(maxRow, Math.ceil(l.y1 / cellSize), Math.ceil(l.y2 / cellSize));
  });
  texts.forEach((t) => {
    maxCol = Math.max(maxCol, Math.ceil(t.x / cellSize) + 2);
    maxRow = Math.max(maxRow, Math.ceil(t.y / cellSize) + 1);
  });
  compasses.forEach((c) => {
    maxCol = Math.max(maxCol, c.col + 1);
    maxRow = Math.max(maxRow, c.row + 1);
  });
  return { cols: maxCol + 2, rows: maxRow + 2 };
}

export default function GridSpotsViewer({ hoaId, resolveSlot, resolvePolygon, onSlotClick, onPolygonClick }) {
  const [floors, setFloors] = useState([]);
  const [activeFloor, setActiveFloor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [hoveredPolyIdx, setHoveredPolyIdx] = useState(null);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    setLoading(true);
    fetchAllRows(() => supabase.from('basement_floors').select('floor_key, layout_json').eq('tenant_id', hoaId).eq('status', 'published')).then(({ data }) => {
      if (cancelled) return;
      setFloors(data || []);
      setActiveFloor((prev) => prev || data?.[0]?.floor_key || null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hoaId]);

  if (loading) return <div className="ds-card p-8 text-center text-darktext text-sm">Ачаалж байна...</div>;
  if (floors.length === 0) return <div className="ds-card p-8 text-center text-darktext text-sm">Нийтлэгдсэн грид зураг олдсонгүй - "Хаягжилт тохиргоо -&gt; Зогсоол, Агуулах, Талбай" табаас зурж, "Нийтлэх" дарна уу.</div>;

  const floor = floors.find((f) => f.floor_key === activeFloor) || floors[0];
  const slots = floor.layout_json?.slots || [];
  const polygons = floor.layout_json?.polygons || [];
  const texts = floor.layout_json?.texts || [];
  const lines = floor.layout_json?.lines || [];
  const compasses = floor.layout_json?.compasses || [];
  const { cols, rows } = cellsRange(slots, lines, texts, compasses, CELL);
  const ec = CELL * zoom;

  return (
    <div className="ds-card p-3" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex items-center gap-2">
        <div className="flex rounded border border-bordercol overflow-hidden">
          {floors.map((f) => (
            <button
              key={f.floor_key}
              onClick={() => setActiveFloor(f.floor_key)}
              className={`px-3 py-1.5 text-[12px] font-medium ${activeFloor === f.floor_key ? 'bg-customBlue text-white' : 'bg-transparent text-mutedtext hover:text-slate-900 dark:hover:text-white'}`}
            >
              {f.floor_key}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button className="ds-btn-secondary" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}>−</button>
          <span className="text-[11px] text-customBlue w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button className="ds-btn-secondary" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>+</button>
        </div>
      </div>
      <div className="text-[10.5px] text-mutedtext">Слот, агуулах, талбай дээр дарж дэлгэрэнгүй харах эсвэл шинээр бүртгэх</div>
      <div className="overflow-auto overscroll-contain" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        <div style={{ position: 'relative', width: cols * ec, height: rows * ec }}>
          {slots.map((s, i) => {
            const w = s.kind === 'warehouse' ? ec : (s.horizontal ? ec * 2 : ec);
            const h = s.kind === 'warehouse' ? ec : (s.horizontal ? ec : ec * 2);
            const link = s.label ? resolveSlot?.(floor.floor_key, s.id, s.kind) : null;
            const hasCustomBorder = !!s.borderColor;
            const hasCustomFill = !!s.fillColor;
            const hasCustomLabel = !!s.labelColor;
            return (
              <button
                key={i}
                onClick={() => onSlotClick?.(floor.floor_key, s, link)}
                className="group"
                style={{ position: 'absolute', left: s.col * ec, top: s.row * ec, width: w, height: h, cursor: 'pointer' }}
                title={s.label || ''}
              >
                <div
                  className={`absolute inset-[1px] rounded-[1px] border transition-colors ${!hasCustomBorder ? 'border-slate-500/30 group-hover:border-slate-400' : ''} ${!hasCustomFill ? 'bg-slate-500/[0.10]' : ''}`}
                  style={{
                    ...(hasCustomBorder ? { borderColor: s.borderColor } : {}),
                    ...(hasCustomFill ? { background: s.fillColor } : {}),
                  }}
                />
                {s.label && (
                  <div
                    className={!hasCustomLabel ? 'text-slate-400 dark:text-mutedtext' : ''}
                    style={{
                      position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) rotate(${s.labelRotation || 0}deg)`,
                      fontSize: 10 * zoom, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap',
                      ...(hasCustomLabel ? { color: s.labelColor } : {}),
                    }}
                  >
                    {s.label}
                  </div>
                )}
              </button>
            );
          })}
          <svg style={{ position: 'absolute', left: 0, top: 0, width: cols * ec, height: rows * ec, pointerEvents: 'none' }}>
            {polygons.map((p, i) => {
              const cx = (p.points.reduce((sum, pt) => sum + pt.x, 0) / p.points.length) * zoom;
              const cy = (p.points.reduce((sum, pt) => sum + pt.y, 0) / p.points.length) * zoom;
              const link = p.label ? resolvePolygon?.(floor.floor_key, p.id) : null;
              const hasCustomStroke = !!p.strokeColor;
              const hasCustomFill = !!p.fillColor;
              const hasCustomLabel = !!p.labelColor;
              return (
                <g
                  key={i}
                  className={!hasCustomStroke || !hasCustomLabel ? 'text-slate-400 dark:text-mutedtext' : ''}
                  style={{ pointerEvents: p.label ? 'auto' : 'none', cursor: p.label ? 'pointer' : 'default' }}
                  onClick={() => onPolygonClick?.(floor.floor_key, p, link)}
                  onMouseEnter={() => setHoveredPolyIdx(i)}
                  onMouseLeave={() => setHoveredPolyIdx((prev) => (prev === i ? null : prev))}
                >
                  <polygon
                    points={p.points.map((pt) => `${pt.x * zoom},${pt.y * zoom}`).join(' ')}
                    fill={hasCustomFill ? p.fillColor : 'currentColor'}
                    fillOpacity={hasCustomFill ? 1 : 0.10}
                    stroke={hasCustomStroke ? p.strokeColor : 'currentColor'}
                    strokeOpacity={hasCustomStroke ? 1 : (hoveredPolyIdx === i ? 0.7 : 0.3)}
                    strokeWidth={p.strokeWidth}
                    strokeLinejoin="round"
                    style={{ transition: 'stroke-opacity 0.15s' }}
                  />
                  {p.label && (
                    <text
                      x={cx} y={cy} fill={hasCustomLabel ? p.labelColor : 'currentColor'}
                      fontSize={12 * zoom} fontWeight={600} textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${p.labelRotation || 0} ${cx} ${cy})`}
                    >
                      {p.label}
                    </text>
                  )}
                </g>
              );
            })}
            {/* 2026-09-04 ОЛСОН БОДИТ АЛДАА - Конструктороос нийтэлсэн
                шулуун зураас/текст/компасс энд огт харагдаагүй байсныг
                засав (GridSpotsViewer.jsx-д эдгээрийг render хийх код
                огт байгаагүй). */}
            {lines.map((l, i) => (
              <line
                key={i} x1={l.x1 * zoom} y1={l.y1 * zoom} x2={l.x2 * zoom} y2={l.y2 * zoom}
                stroke={l.color || '#94a3b8'} strokeWidth={(l.strokeWidth || 2) * zoom} strokeLinecap="round"
              />
            ))}
          </svg>
          {texts.map((t, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', left: t.x * zoom, top: t.y * zoom, pointerEvents: 'none',
                fontSize: (t.fontSize || 14) * zoom, fontWeight: 600, whiteSpace: 'nowrap',
                color: t.color || undefined,
              }}
              className={!t.color ? 'text-slate-400 dark:text-mutedtext' : ''}
            >
              {t.text}
            </div>
          ))}
          {compasses.map((c, i) => (
            <svg
              key={i}
              version="1.0" xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 326.000000 335.000000"
              preserveAspectRatio="xMidYMid meet"
              width={48 * zoom} height={48 * zoom}
              style={{
                position: 'absolute', left: c.col * ec - 24 * zoom, top: c.row * ec - 24 * zoom,
                transform: `rotate(${c.rotation || 0}deg)`, transformOrigin: '50% 50%', pointerEvents: 'none',
              }}
              className="text-slate-600 dark:text-slate-300"
            >
              <g transform="translate(0.000000,335.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                <path d="M1450 3000 l0 -231 43 3 42 3 2 133 c1 74 4 136 6 138 3 3 42 -57 89 -133 l84 -138 47 -3 47 -3 0 231 0 231 -42 -3 -43 -3 -5 -142 -5 -141 -86 141 -85 142 -47 3 -47 3 0 -231z" />
                <path d="M1144 2966 c-473 -172 -814 -565 -926 -1067 -30 -137 -33 -414 -5 -554 89 -451 371 -823 782 -1028 184 -92 360 -136 580 -144 319 -12 612 72 875 251 86 59 240 203 310 291 139 174 236 387 287 625 27 128 24 419 -5 557 -76 353 -267 652 -554 868 -105 79 -271 167 -397 210 -107 36 -111 35 -111 -24 l0 -49 46 -11 c82 -21 242 -98 343 -165 621 -413 788 -1242 376 -1861 -72 -108 -222 -265 -322 -338 -168 -120 -377 -208 -572 -241 -121 -20 -321 -20 -442 0 -487 82 -901 438 -1054 908 -51 159 -60 221 -60 426 1 166 4 196 27 291 66 261 174 454 358 640 152 153 340 271 523 329 l77 24 0 48 c0 43 -2 48 -22 48 -13 -1 -64 -16 -114 -34z" />
                <path d="M1617 2578 c-3 -7 -85 -204 -182 -438 -98 -234 -188 -450 -200 -480 -12 -30 -84 -203 -159 -384 -76 -180 -135 -330 -132 -333 2 -2 158 72 346 166 l342 170 340 -170 c187 -94 342 -168 345 -165 3 2 -31 89 -75 193 -87 206 -259 619 -432 1038 -62 149 -125 303 -142 343 -29 71 -41 84 -51 60z m13 -716 l0 -477 -246 -123 c-136 -68 -249 -121 -251 -118 -3 3 35 103 85 223 50 120 143 344 207 498 154 373 198 475 202 475 1 0 3 -215 3 -478z" />
              </g>
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}
