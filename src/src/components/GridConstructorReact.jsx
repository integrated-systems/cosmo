import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 2026-08-31: Хэрэглэгчийн хүсэлт — "__parking_grid_drawer_v5.html"
// (standalone, imperative DOM-той хэрэгсэл)-ийг React-т зохимжтой
// (idiomatic) архитектураар дахин бичив. Үвр кодтой ХАРЬЦУУЛБАЛ:
//
//   1) Imperative DOM (document.createElement/appendChild) БүРЭН
//      арилж, slots/polygons-ыг declarative JSX .map()-ээр render
//      хийнэ — React-ийн өврийн diffing engine-д даалгана.
//   2) Continuous drag төлвийг (pointermove бүрд ажилладаг) useRef-д
//      хадгална (React state биш!) — эс үгүй бол хулгана хөдлвх
//      бүрд re-render үүсгэж, гүйцэтгэлд муугаар нөлөөлнэ. State
//      зөвхөн DISCRETE үйлдэл (слот үүсгэх/зөөх, undo/redo) үед л
//      шинэчлэгдэнэ.
//   3) Undo/redo snapshot-ыг useRef stack-д хадгалж, зөвхөн
//      "canUndo/canRedo" boolean-ыг state болгоно (товчны disabled
//      төлввнд л render хэрэгтэй тул).
//
// ХАМРАХ ХүРЭЭ (энэ туршилтын шатанд): Слот (2:1/1:2), Агуулах (1:1),
// Полигон зурах, зөөх, устгах, undo/redo, JSON export, zoom. Чөлөөт
// текст элементийг үүнэ шатанд ОРХИСОН (хэрэглэгчийн дахин
// тайлбарласан "гол даалгавар"-т ороогүй).

const CELL = 24; // px, үвр кодтой ижил "24х24 нүд" техникийн үзүүлэлт
const MIN_COLS = 10;
const MIN_ROWS = 10;
const MAX_HISTORY = 60;
const PALETTE = ['#e2e8f0', '#5fe0d0', '#3b82f6', '#10b981', '#f59e0b', '#ef5555', '#8b5cf6', '#ec4899'];

// үвр кодтой ижил occupancy/footprint шалгах логик (2:1/1:2 слот,
// 1:1 агуулах давхцахгүй байхыг баталгаажуулна).
function cellsOf(s) {
  if (s.kind === 'warehouse') return [[s.col, s.row]];
  return s.horizontal ? [[s.col, s.row], [s.col + 1, s.row]] : [[s.col, s.row], [s.col, s.row + 1]];
}
function occupancy(slots, excludeIds) {
  const excl = new Set(excludeIds || []);
  const set = new Set();
  slots.forEach((s) => { if (!excl.has(s.id)) cellsOf(s).forEach(([c, r]) => set.add(`${c},${r}`)); });
  return set;
}
function inBounds(c, r, cols, rows) { return c >= 0 && r >= 0 && c < cols && r < rows; }
function isFreeFootprint(slots, col, row, horizontal, cols, rows, excludeIds) {
  const occ = occupancy(slots, excludeIds);
  const cells = horizontal ? [[col, row], [col + 1, row]] : [[col, row], [col, row + 1]];
  return cells.every(([c, r]) => inBounds(c, r, cols, rows) && !occ.has(`${c},${r}`));
}
function isGroupFootprintFree(slots, candidates, cols, rows) {
  const ids = candidates.map((c) => c.id);
  const occ = occupancy(slots, ids);
  return candidates.every((cand) =>
    cellsOf(cand).every(([c, r]) => inBounds(c, r, cols, rows) && !occ.has(`${c},${r}`))
  );
}

export default function GridConstructorReact() {
  const [cols, setCols] = useState(40);
  const [rows, setRows] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState('slot'); // 'slot' | 'warehouse' | 'polygon'
  const [slots, setSlots] = useState(() => []);
  const [polygons, setPolygons] = useState(() => []);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [strokeColor, setStrokeColor] = useState('#3b82f6');
  const [borderColor, setBorderColor] = useState('#e2e8f0');

  const nextIdRef = useRef(1);
  const nextPolyIdRef = useRef(1);
  const gridRef = useRef(null);

  // ---------------- undo/redo (snapshot-based, refs — React state биш) ----------------
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [, forceHistoryRender] = useState(0);

  const snapshot = useCallback(() => JSON.stringify({ cols, rows, slots, polygons }), [cols, rows, slots, polygons]);
  const pushHistory = useCallback(() => {
    undoStackRef.current.push(snapshot());
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    redoStackRef.current = [];
    forceHistoryRender((t) => t + 1);
  }, [snapshot]);
  const restoreSnapshot = (json) => {
    const s = JSON.parse(json);
    setCols(s.cols); setRows(s.rows); setSlots(s.slots); setPolygons(s.polygons);
    setSelectedIds(new Set());
  };
  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current.push(snapshot());
    restoreSnapshot(undoStackRef.current.pop());
    forceHistoryRender((t) => t + 1);
  }, [snapshot]);
  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current.push(snapshot());
    restoreSnapshot(redoStackRef.current.pop());
    forceHistoryRender((t) => t + 1);
  }, [snapshot]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const ec = CELL * zoom; // тухайн zoom-ийн бодит нүдний хэмжээ (px)

  // ---------------- координат хайрвалт ----------------
  function clientToCell(clientX, clientY) {
    const rect = gridRef.current.getBoundingClientRect();
    return { col: Math.floor((clientX - rect.left) / ec), row: Math.floor((clientY - rect.top) / ec) };
  }

  // ---------------- "undecided → draw/marquee" зангилааны механизм ----------------
  // үвр кодтой ижил санаа: хоосон нүднээс эхэлсэн чирэлт эхний
  // хөдвөлгөөнөөрөө ("1 нүд зэргэлдээ" эсвэл "хол хөдлвх") шийдэгдэнэ.
  const dragRef = useRef(null); // continuous drag төлвв — re-render үүсгэхгүй
  const [ghost, setGhost] = useState(null); // зөөхөн ЗУРАХ үед л үзүүлэх урьдчилсан харагдац

  function handleGridPointerDown(e) {
    if (e.target.closest('[data-slot-id]')) return; // одоо буй слот өврийн listener-тэй
    if (tool === 'polygon') return; // полигон өврийн listener-тэй
    const { col, row } = clientToCell(e.clientX, e.clientY);
    if (!inBounds(col, row, cols, rows)) return;
    dragRef.current = { startCol: col, startRow: row, startClientX: e.clientX, startClientY: e.clientY, mode: 'undecided' };
  }

  function handleGridPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const { col, row } = clientToCell(e.clientX, e.clientY);
    const dx = col - d.startCol, dy = row - d.startRow;
    const movedPx = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);

    if (d.mode === 'undecided') {
      if (tool === 'slot') {
        const isAdjacent = (Math.abs(dx) === 1 && dy === 0) || (dx === 0 && Math.abs(dy) === 1);
        if (isAdjacent) d.mode = 'draw';
        else if (movedPx > ec * 1.4) d.mode = 'marquee';
        else return;
      } else if (movedPx > ec * 1.4) d.mode = 'marquee';
      else return;
    }

    if (d.mode === 'draw') {
      let horizontal = null, baseCol = d.startCol, baseRow = d.startRow;
      if (dx === 1 && dy === 0) horizontal = true;
      else if (dx === -1 && dy === 0) { horizontal = true; baseCol = col; }
      else if (dx === 0 && dy === 1) horizontal = false;
      else if (dx === 0 && dy === -1) { horizontal = false; baseRow = row; }
      if (horizontal === null) { setGhost(null); d.pending = null; return; }
      const ok = isFreeFootprint(slots, baseCol, baseRow, horizontal, cols, rows, null);
      setGhost({ col: baseCol, row: baseRow, horizontal, ok });
      d.pending = ok ? { col: baseCol, row: baseRow, horizontal } : null;
    }
    // marquee горим: энэ туршилтын хувилбарт зөвхөн "слот зурах"-ыг
    // л хамгийн чухал гэж үзэж, олноор сонгох UI-ийг дараагийн
    // ялгарлаар нэмнэ (одоогоор алгасав).
  }

  function handleGridPointerUp() {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === 'draw' && d.pending) {
      pushHistory();
      setSlots((prev) => [...prev, {
        id: nextIdRef.current++, col: d.pending.col, row: d.pending.row, horizontal: d.pending.horizontal,
        kind: 'slot', borderColor, fillColor: null, label: '',
      }]);
    } else if (d.mode === 'undecided' && tool === 'warehouse') {
      if (!occupancy(slots).has(`${d.startCol},${d.startRow}`)) {
        pushHistory();
        setSlots((prev) => [...prev, {
          id: nextIdRef.current++, col: d.startCol, row: d.startRow, horizontal: false,
          kind: 'warehouse', borderColor, fillColor: null, label: '',
        }]);
      }
    }
    setGhost(null);
    dragRef.current = null;
  }

  // ---------------- одоо буй слот зөөх / дарж засах (5px "click" босго) ----------------
  const moveRef = useRef(null);

  function handleSlotPointerDown(e, slot) {
    e.stopPropagation();
    const ids = selectedIds.has(slot.id) ? Array.from(selectedIds) : [slot.id];
    if (!selectedIds.has(slot.id)) setSelectedIds(new Set([slot.id]));
    moveRef.current = {
      ids, clickedId: slot.id, startClientX: e.clientX, startClientY: e.clientY,
      startPositions: ids.map((id) => { const s = slots.find((x) => x.id === id); return { id, col: s.col, row: s.row }; }),
    };
  }
  function handleSlotPointerMove(e) {
    const m = moveRef.current;
    if (!m) return;
    const dCols = Math.round((e.clientX - m.startClientX) / ec);
    const dRows = Math.round((e.clientY - m.startClientY) / ec);
    m.candidates = m.startPositions.map((p) => {
      const s = slots.find((x) => x.id === p.id);
      return { id: p.id, horizontal: s.horizontal, kind: s.kind, col: Math.max(0, p.col + dCols), row: Math.max(0, p.row + dRows) };
    });
    setGhost({ moving: true }); // force re-render хийхийн тулд (доор inline style-ээр шууд харуулна)
  }
  function handleSlotPointerUp(e) {
    const m = moveRef.current;
    if (!m) return;
    const movedPx = Math.hypot((e.clientX || 0) - m.startClientX, (e.clientY || 0) - m.startClientY);
    if (movedPx < 5) {
      setEditingSlotId(m.clickedId);
    } else if (m.candidates && isGroupFootprintFree(slots, m.candidates, cols, rows)) {
      pushHistory();
      setSlots((prev) => prev.map((s) => {
        const c = m.candidates.find((x) => x.id === s.id);
        return c ? { ...s, col: c.col, row: c.row } : s;
      }));
    }
    moveRef.current = null;
    setGhost(null);
  }

  useEffect(() => {
    function onMove(e) { handleGridPointerMove(e); handleSlotPointerMove(e); }
    function onUp(e) { handleGridPointerUp(); handleSlotPointerUp(e); }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, cols, rows, tool, ec, borderColor]);

  function deleteSlot(id) {
    pushHistory();
    setSlots((prev) => prev.filter((s) => s.id !== id));
    setEditingSlotId(null);
  }
  function updateSlot(id, patch) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  // ---------------- полигон зурах FSM ----------------
  const [polyPoints, setPolyPoints] = useState([]);
  const polySnap = 12; // px, торны нарийвчлал

  function polyLocalPoint(e) {
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / zoom) / polySnap) * polySnap;
    const y = Math.round(((e.clientY - rect.top) / zoom) / polySnap) * polySnap;
    return { x, y };
  }
  function finishPolygon(points) {
    if (points.length < 3) { setPolyPoints([]); return; }
    pushHistory();
    setPolygons((prev) => [...prev, { id: nextPolyIdRef.current++, points, strokeColor, strokeWidth: 2, fillColor: null }]);
    setPolyPoints([]);
  }
  function handlePolyClick(e) {
    if (tool !== 'polygon') return;
    const pt = polyLocalPoint(e);
    if (polyPoints.length >= 3) {
      const first = polyPoints[0];
      const dist = Math.hypot((pt.x - first.x) * zoom, (pt.y - first.y) * zoom);
      if (dist < 10) { finishPolygon(polyPoints); return; }
    }
    setPolyPoints((prev) => [...prev, pt]);
  }
  useEffect(() => {
    function onKeyDown(e) {
      if (tool !== 'polygon') return;
      if (e.key === 'Enter' && polyPoints.length >= 3) finishPolygon(polyPoints);
      else if (e.key === 'Escape') setPolyPoints([]);
      else if (e.key === 'Backspace') setPolyPoints((prev) => prev.slice(0, -1));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, polyPoints, strokeColor]);

  // ---------------- JSON export (үвр кодтой ижил схем — ирээдүйн Supabase холболтод бэлэн) ----------------
  function exportJson() {
    const data = {
      cellSize: CELL, cols, rows,
      slots: slots.map((s) => ({ col: s.col, row: s.row, horizontal: s.horizontal, kind: s.kind, borderColor: s.borderColor, fillColor: s.fillColor, label: s.label || '' })),
      polygons: polygons.map((p) => ({ points: p.points, strokeColor: p.strokeColor, strokeWidth: p.strokeWidth, fillColor: p.fillColor })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'floor-slots-react.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const editingSlot = useMemo(() => slots.find((s) => s.id === editingSlotId), [slots, editingSlotId]);

  return (
    <div className="ds-card p-3" style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* ---------------- toolbar ---------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded border border-bordercol overflow-hidden">
          {[['slot', 'Зогсоол зурах'], ['warehouse', 'Агуулах зурах'], ['polygon', 'Полигон зурах']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTool(key); setPolyPoints([]); }}
              className={`px-3 py-1.5 text-[12px] font-medium ${tool === key ? 'bg-customBlue text-white' : 'bg-transparent text-mutedtext hover:text-slate-900 dark:hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="ds-btn-secondary" onClick={undo} disabled={undoStackRef.current.length === 0}>↶ Undo</button>
        <button className="ds-btn-secondary" onClick={redo} disabled={redoStackRef.current.length === 0}>↷ Redo</button>
        <div className="flex items-center gap-1 ml-2">
          <label className="text-[11px] text-mutedtext">Багана</label>
          <input type="number" min={MIN_COLS} className="ds-input w-16" value={cols} onChange={(e) => setCols(Math.max(MIN_COLS, +e.target.value || MIN_COLS))} />
          <label className="text-[11px] text-mutedtext">Мвр</label>
          <input type="number" min={MIN_ROWS} className="ds-input w-16" value={rows} onChange={(e) => setRows(Math.max(MIN_ROWS, +e.target.value || MIN_ROWS))} />
        </div>
        {tool === 'polygon' ? (
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-mutedtext">Зураасны өнгө</label>
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setStrokeColor(c)} style={{ background: c }} className={`w-5 h-5 rounded ${strokeColor === c ? 'ring-2 ring-customBlue' : ''}`} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-mutedtext">Хүрээний өнгө</label>
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setBorderColor(c)} style={{ background: c }} className={`w-5 h-5 rounded ${borderColor === c ? 'ring-2 ring-customBlue' : ''}`} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button className="ds-btn-secondary" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}>−</button>
          <span className="text-[11px] text-customBlue w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button className="ds-btn-secondary" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>+</button>
        </div>
        <button className="ds-btn-primary" onClick={exportJson}>JSON export</button>
      </div>

      <div className="text-[10.5px] text-mutedtext">
        Зогсоол: хоосон нүднээс зэргэлдээ нүд рүү чирж 2 нүд холбоход слот үүснэ · Агуулах: хоосон нүд дээр дарахад 1 нүдэд слот үүснэ ·
        Слот дээр дарж чирвэл байрлал өөрчлвгднв, дарахад (чиргэлгүй) засах цонх нээгдэнэ · Полигон: тор дээр дарж оройнуудаа байрлуулж, эхний цэг дээр дарах эсвэл Enter дарахад хаагдана, Backspace сүүлийн цэгийг арилгана, Escape цуцална.
      </div>

      {/* ---------------- canvas ---------------- */}
      <div className="flex-1 overflow-auto rounded border border-bordercol" style={{ background: '#101b29' }}>
        <div
          ref={gridRef}
          onPointerDown={handleGridPointerDown}
          onClick={handlePolyClick}
          style={{
            position: 'relative', width: cols * ec, height: rows * ec, cursor: 'crosshair',
            backgroundImage: `repeating-linear-gradient(180deg, rgba(143,168,192,0.16) 0, rgba(143,168,192,0.16) 1px, transparent 1px, transparent ${ec}px),`
              + `repeating-linear-gradient(90deg, rgba(143,168,192,0.16) 0, rgba(143,168,192,0.16) 1px, transparent 1px, transparent ${ec}px)`,
          }}
        >
          {/* слот/агуулах */}
          {slots.map((s) => {
            const w = s.kind === 'warehouse' ? ec : (s.horizontal ? ec * 2 : ec);
            const h = s.kind === 'warehouse' ? ec : (s.horizontal ? ec : ec * 2);
            const mCand = moveRef.current?.candidates?.find((c) => c.id === s.id);
            const left = (mCand ? mCand.col : s.col) * ec;
            const top = (mCand ? mCand.row : s.row) * ec;
            return (
              <div
                key={s.id}
                data-slot-id={s.id}
                onPointerDown={(e) => handleSlotPointerDown(e, s)}
                style={{ position: 'absolute', left, top, width: w, height: h, cursor: 'grab', zIndex: mCand ? 50 : 1 }}
              >
                <div style={{
                  position: 'absolute', inset: 1, border: `1px solid ${s.borderColor || '#e2e8f0'}`, borderRadius: 1,
                  background: s.fillColor || (selectedIds.has(s.id) ? 'rgba(95,224,208,0.18)' : 'rgba(232,237,242,0.03)'),
                }} />
                {s.label && (
                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 10 * zoom, fontWeight: 700, color: '#f1f5f9', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </div>
                )}
              </div>
            );
          })}

          {/* зурж буй "ghost" урьдчилсан харагдац */}
          {ghost && !ghost.moving && (
            <div style={{
              position: 'absolute', left: ghost.col * ec, top: ghost.row * ec,
              width: ghost.horizontal ? ec * 2 : ec, height: ghost.horizontal ? ec : ec * 2,
              background: ghost.ok ? 'rgba(95,224,208,0.35)' : 'rgba(242,84,91,0.35)',
              border: `1px dashed ${ghost.ok ? '#5fe0d0' : '#f2545b'}`, pointerEvents: 'none', zIndex: 40,
            }} />
          )}

          {/* полигон давхарга (SVG) */}
          <svg style={{ position: 'absolute', left: 0, top: 0, width: cols * ec, height: rows * ec, pointerEvents: 'none' }}>
            {polygons.map((p) => (
              <polygon
                key={p.id}
                points={p.points.map((pt) => `${pt.x * zoom},${pt.y * zoom}`).join(' ')}
                fill={p.fillColor || 'none'} fillOpacity={p.fillColor ? 0.35 : 0}
                stroke={p.strokeColor} strokeWidth={p.strokeWidth} strokeLinejoin="round"
              />
            ))}
            {tool === 'polygon' && polyPoints.length > 0 && (
              <polyline
                points={polyPoints.map((pt) => `${pt.x * zoom},${pt.y * zoom}`).join(' ')}
                fill="none" stroke={strokeColor} strokeWidth={2} strokeDasharray="4,3"
              />
            )}
            {tool === 'polygon' && polyPoints.map((pt, i) => (
              <circle key={i} cx={pt.x * zoom} cy={pt.y * zoom} r={4} fill={i === 0 ? '#5fe0d0' : strokeColor} />
            ))}
          </svg>
        </div>
      </div>

      {/* ---------------- слот засах модал ---------------- */}
      {editingSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,15,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditingSlotId(null)}>
          <div className="ds-card p-4" style={{ width: 300 }} onClick={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Слот засах</div>
            <label className="block text-[10.5px] text-mutedtext mb-1">Дугаар / бичвэр</label>
            <input className="ds-input w-full mb-3" maxLength={8} value={editingSlot.label} onChange={(e) => updateSlot(editingSlot.id, { label: e.target.value })} />
            <label className="block text-[10.5px] text-mutedtext mb-1">Дүүргэх өнгө</label>
            <div className="flex gap-1.5 mb-4">
              <button onClick={() => updateSlot(editingSlot.id, { fillColor: null })} className={`w-6 h-6 rounded border ${!editingSlot.fillColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updateSlot(editingSlot.id, { fillColor: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingSlot.fillColor === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <button className="ds-btn-secondary text-customRed" onClick={() => deleteSlot(editingSlot.id)}>Слот устгах</button>
              <button className="ds-btn-primary" onClick={() => setEditingSlotId(null)}>Дуусгах</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
