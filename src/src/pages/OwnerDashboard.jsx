import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatMoney } from '../lib/format';

// 2026-08-27: Хуучин "suh" (userapp-react) төслийн Dashboard.jsx-ийн зах
// зээлийн үнэлгээний sparkline chart-ыг (Catmull-Rom smooth path,
// tooltip, ResizeObserver-оор бодит үргэнээ хэмждэг) Cosmo стандартад
// нийцүүлж шилжүүлэв. Хүснэгэл үнэн хэрэгтээ бодит "restmarket" (хуучин
// нэрээрээ "real_estate_market_prices") — Supabase дээр аль хэдийн
// бодит tenant-ийн датагаар дүүрсэн байсан тул шууд холбов.
//
// ⚠️ Хуучин код "get_dashboard_data()" RPC-ээр Нэхэмжилсэн/Орлого/Өр
// зэрэг санхүүгийн тоог үзүүлдэг байсан ч, Cosmo дээр ЭДГЭЭР тоог
// тооцоолох НЭХЭМЖЛЭХ/ТӨЛБӨРИЙН backend (payments/invoices/transactions)
// ОДООГООР ОГТ үүсээгүй (admin-ийн "Төлбөр төлөлт"/"Нэхэмжлэх" хуудсууд
// ч placeholder). Тиймээс ЭНД байхгүй тоог зохиомлоор ₮0 гэж үзүүлэхийн
// оронд шударгаар "Түн удахгүй" гэж тэмдэглэв — санхүүгийн модуль
// үүссэний дараа энэ хэсгийг бодит датагаар холбоно.
const MV_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_ASPECT_H = 150, CHART_ASPECT_W = 350;

function monthNumFromStr(m) {
  // "YYYY/MM" -> MM (тоо)
  const parts = String(m || '').split('/');
  return parts.length === 2 ? parseInt(parts[1], 10) : 1;
}

function computeCoords(values, w, h, pad = 4, padTop = 10, padBottom = 4) {
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

function smoothPath(coords) {
  if (!coords.length) return '';
  if (coords.length === 1) return `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  if (coords.length === 2) return `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} L${coords[1].x.toFixed(1)},${coords[1].y.toFixed(1)}`;
  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function MultiSparkline({ series, rows }) {
  const containerRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(CHART_ASPECT_W);
  const [tip, setTip] = useState(null);
  const allVals = series.flatMap((s) => s.values);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => { if (el.clientWidth) setMeasuredWidth(el.clientWidth); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!allVals.length) return null;

  const width = measuredWidth;
  const height = Math.round(width * CHART_ASPECT_H / CHART_ASPECT_W);
  const axisH = 16;
  const chartH = height - axisH;

  function showTip(e, text, color) {
    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text, color });
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
        <line x1="4" y1={chartH - 2} x2={width - 4} y2={chartH - 2} stroke="var(--border-card)" strokeWidth="1" />
        {series.map((s, si) => {
          const coords = computeCoords(s.values, width, chartH, 4, 10, 4);
          const d = smoothPath(coords);
          return (
            <g key={si}>
              {d && <path d={d} fill="none" stroke={s.color} strokeWidth={0.5} strokeLinecap="round" strokeLinejoin="round" />}
              {coords.map((c) => {
                const monthLabel = rows?.[c.i] ? MONTH_ABBR[monthNumFromStr(rows[c.i].month) - 1] : '';
                const text = `${monthLabel}: ${formatMoney(c.v)}₮`;
                return (
                  <g key={c.i}>
                    <circle cx={c.x} cy={c.y} r={1.5} fill={s.color} style={{ pointerEvents: 'none' }} />
                    <circle cx={c.x} cy={c.y} r={7} fill="transparent" style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => showTip(e, text, s.color)} onMouseMove={(e) => showTip(e, text, s.color)} onMouseLeave={() => setTip(null)}
                      onTouchStart={(e) => showTip(e.touches[0], text, s.color)} />
                  </g>
                );
              })}
            </g>
          );
        })}
        {rows && rows.length > 0 && rows.map((r, i) => {
          const n = rows.length;
          const x = 4 + (i / Math.max(n - 1, 1)) * (width - 8);
          return <text key={i} x={x} y={height - 3} fontSize="7" fill="var(--text-secondary)" textAnchor="middle">{MONTH_ABBR[monthNumFromStr(r.month) - 1]}</text>;
        })}
      </svg>
      {tip && (
        <div style={{
          position: 'absolute', left: Math.min(tip.x + 10, width - 90), top: Math.max(tip.y - 24, 0),
          background: tip.color + '80', border: `1px solid ${tip.color}`, borderRadius: 6,
          padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#fff',
          pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,.35)', zIndex: 10,
        }}>{tip.text}</div>
      )}
    </div>
  );
}

const MV_CARDS = [
  { title: 'Орон сууц (₮/м²)', fields: ['residential_sale_price'], labels: ['Орон сууц'] },
  { title: 'Түрээс, 1-6 өрөө (₮/сар)', fields: ['rental_1_room', 'rental_2_room', 'rental_3_room', 'rental_4_room', 'rental_5_room', 'rental_6_room'], labels: ['1 өрөө', '2 өрөө', '3 өрөө', '4 өрөө', '5 өрөө', '6 өрөө'] },
  { title: 'Агуулах, Зогсоол — Борлуулалт (₮)', fields: ['storage_sale_price', 'parking_sale_price'], labels: ['Агуулах', 'Зогсоол'] },
  { title: 'Агуулах, Зогсоол — Түрээс (₮/сар)', fields: ['storage_rental_price', 'parking_rental_price'], labels: ['Агуулах', 'Зогсоол'] },
];

export default function OwnerDashboard({ hoaId }) {
  const [mvRows, setMvRows] = useState([]);
  const [headcount, setHeadcount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    Promise.all([
      supabase.from('restmarket').select('*').eq('tenant_id', hoaId).order('month', { ascending: true }).limit(24),
      supabase.rpc('get_tenant_headcount', { p_tenant_id: hoaId }),
    ]).then(([mvRes, hcRes]) => {
      setMvRows(mvRes.data || []);
      setHeadcount(hcRes.data || null);
      setLoading(false);
    });
  }, [hoaId]);

  if (loading) return <div className="pool-empty">Ачаалж байна...</div>;

  const mvLast12 = mvRows.slice(-12);

  return (
    <div className="dashboard">
      <div className="mobile-stat-grid">
        <div className="mobile-stat-card">
          <div className="mobile-stat-value">{(headcount?.owner_count ?? 0).toLocaleString()}</div>
          <div className="mobile-stat-label">Нийт өмчлөгч</div>
        </div>
        <div className="mobile-stat-card">
          <div className="mobile-stat-value">{(headcount?.total_people ?? 0).toLocaleString()}</div>
          <div className="mobile-stat-label">Нийт оршин суугчид</div>
        </div>
      </div>

      <div className="mobile-list-item" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Санхүүгийн тайлан</div>
        <div className="pool-empty" style={{ padding: '10px 0' }}>Төлбөр/Нэхэмжлэхийн систем холбогдсоны дараа энд орлого/зарлагын мэдээлэл харагдана.</div>
      </div>

      {mvRows.length > 0 ? (
        <>
          <div className="section-title">Хотхоны зах зээлийн бодит үнэлгээ (Сүүлийн 12 сараар)</div>
          {MV_CARDS.map((c, ci) => {
            const series = c.fields.map((f, i) => ({ values: mvLast12.map((r) => +r[f] || 0), color: MV_COLORS[i] }));
            const isSingleField = c.fields.length === 1;
            return (
              <div className="mobile-list-item" key={ci} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{c.title}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {c.fields.map((f, i) => {
                    const vals = series[i].values;
                    const lastVal = vals[vals.length - 1] || 0;
                    const prevVal = vals.length > 1 ? vals[vals.length - 2] : null;
                    const change = (prevVal != null && prevVal !== 0) ? ((lastVal - prevVal) / prevVal * 100) : null;
                    const changeUp = change != null && change >= 0;
                    return (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-secondary)' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: MV_COLORS[i], display: 'inline-block' }} />
                        {!isSingleField && <>{c.labels[i]}: </>}
                        <b style={{ color: 'var(--text-primary)', fontSize: isSingleField ? 18 : undefined }}>{formatMoney(lastVal)}₮</b>
                        {change != null && (
                          <span style={{ color: changeUp ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontSize: 11 }}>
                            {changeUp ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <MultiSparkline series={series} rows={mvLast12} />
              </div>
            );
          })}
        </>
      ) : (
        <div className="mobile-list-item">
          <div className="pool-empty" style={{ padding: '10px 0' }}>Зах зээлийн үнэлгээний мэдээлэл одоогоор алга.</div>
        </div>
      )}
    </div>
  );
}
