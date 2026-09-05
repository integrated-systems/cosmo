import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sortFloors } from '../lib/floorSort';
import { friendlyErrorMessage } from '../lib/lockErrorMessage';
import { useAlert } from '../hooks/useAlert';

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
//      төлөөнд л render хэрэгтэй тул).
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

export default function GridConstructorReact({ hoaId }) {
  // 2026-08-31 (2): Хэрэглэгчийн хүсэлт — талбайн ажилтан таблет/iPad-
  // аар зогсоол/агуулах дотор явж байгаад НЭГ дор бүрэн зурж дуусгах
  // боломж бага тул: (а) "Хадгалах" (ноорог) товч үе бүрд Supabase
  // руу бичнэ, (б) "Нийтлэх" товч зөвхөн зураг бэлэн болсон үед
  // status='published' болгоно, (в) localStorage-д өөрчлөлт бүрд
  // автоматаар хадгалж, сүлжээгүй үед ч алдахгүй байх аюулгүйн сүлжээ
  // болгоно, (г) JSON импорт/экспорт (архивлах, устсан үед сэргээх).
  const [floorKey, setFloorKey] = useState('B1');
  const [floorList, setFloorList] = useState([]); // Supabase-с татсан бодит давхаргын нэрс
  const [addingFloor, setAddingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const fileInputRef = useRef(null);
  const localStorageKey = `cosmo_grid_constructor_${hoaId}_${floorKey}`;

  const { alert, AlertDialog } = useAlert();
  const [cols, setCols] = useState(40);
  const [rows, setRows] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState('slot'); // 'slot' | 'warehouse' | 'polygon' | 'text' | 'line'
  const [slots, setSlots] = useState(() => []);
  const [polygons, setPolygons] = useState(() => []);
  const [texts, setTexts] = useState(() => []);
  const [lines, setLines] = useState(() => []);
  const [compasses, setCompasses] = useState(() => []);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingLineId, setEditingLineId] = useState(null);
  const [strokeColor, setStrokeColor] = useState(null);
  const [borderColor, setBorderColor] = useState(null);

  const gridRef = useRef(null);

  // ---------------- undo/redo (snapshot-based, refs — React state биш) ----------------
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [, forceHistoryRender] = useState(0);

  const snapshot = useCallback(() => JSON.stringify({ cols, rows, slots, polygons, texts, lines, compasses }), [cols, rows, slots, polygons, texts, lines, compasses]);
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
      // 2026-09-03: Escape дарахад олноор сонгосон слотыг цэвэрлэнэ.
      if (e.key === 'Escape') setSelectedIds(new Set());
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const ec = CELL * zoom; // тухайн zoom-ийн бодит нүдний хэмжээ (px)

  // ---------------- ачаалах: localStorage (шуурхай) → Supabase (эх сурвалж) ----------------
  const applyLayout = useCallback((layout) => {
    // 2026-09-02 (2): Хэрэглэгчийн хүсэлт - слотын id одоо зөвхөн
    // React-ийн дотоод (session-only) дугаар БИШ, харин owners/
    // clientele-той ХОЛБОГДОХ ТОГТМОЛ түлхүүр болсон тул incrementing
    // тоо (1,2,3...) биш **UUID** (crypto.randomUUID()) ашиглана -
    // label өөрчилсөн ч холбоос тасрахгүй. ҮҮр эх сурвалж (Supabase-с
    // ачаалсан, гар JSON-оор импортолсон)-д "id" байхгүй л бол шинэ
    // UUID автоматаар хуваарилна.
    const slotsWithIds = (layout.slots || []).map((s) => (s.id ? s : { ...s, id: crypto.randomUUID() }));
    const polysWithIds = (layout.polygons || []).map((p) => (p.id ? p : { ...p, id: crypto.randomUUID() }));
    const textsWithIds = (layout.texts || []).map((t) => (t.id ? t : { ...t, id: crypto.randomUUID() }));
    const linesWithIds = (layout.lines || []).map((l) => (l.id ? l : { ...l, id: crypto.randomUUID() }));
    const compassesWithIds = (layout.compasses || []).map((c) => (c.id ? c : { ...c, id: crypto.randomUUID() }));
    setCols(layout.cols || 40);
    setRows(layout.rows || 30);
    setSlots(slotsWithIds);
    setPolygons(polysWithIds);
    setTexts(textsWithIds);
    setLines(linesWithIds);
    setCompasses(compassesWithIds);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, []);

  const isFirstLoadRef = useRef(true);
  useEffect(() => {
    isFirstLoadRef.current = true;
    // 1) localStorage-с шуурхай ачаална (сүлжээгүй үед ч ажиллана).
    try {
      const cached = localStorage.getItem(localStorageKey);
      if (cached) applyLayout(JSON.parse(cached));
    } catch { /* хоосон эсвэл эвдэрсэн cache — үл тоомсорноно */ }
    // 2) Supabase-ээс эх сурвалжиг татаж, байвал ДАВХАР бичнэ.
    if (!hoaId) return;
    supabase.from('basement_floors').select('layout_json, status').eq('tenant_id', hoaId).eq('floor_key', floorKey).maybeSingle()
      .then(({ data }) => {
        if (data) { applyLayout(data.layout_json); setStatus(data.status); }
        else setStatus('draft');
        isFirstLoadRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId, floorKey]);

  // 2026-09-04: Хэрэглэгчийн хүсэлт - "B1"/"B2"/"B3" хатуу нэрсийг
  // тухайн hoaId-ийн бодит давхаргын нэрсээр солив (тэмдэглэгээ
  // хотхон бүрд харьцангуй тул). Supabase-с бодитоор татна.
  useEffect(() => {
    if (!hoaId) return;
    supabase.from('basement_floors').select('floor_key').eq('tenant_id', hoaId).then(({ data }) => {
      const names = (data || []).map((r) => r.floor_key);
      setFloorList((prev) => {
        const merged = Array.from(new Set([...names, ...prev, floorKey]));
        return merged.length ? merged : ['B1'];
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  function handleAddFloor() {
    const name = newFloorName.trim();
    if (!name) return;
    if (!floorList.includes(name)) setFloorList((prev) => [...prev, name]);
    setFloorKey(name);
    setNewFloorName('');
    setAddingFloor(false);
  }

  // 2026-09-04 (2): Хэрэглэгчийн хүсэлт - идэвхтэй давхаргыг устгах
  // товч ("+ Шинэ давхарга" товчийг санамсаргүй хоёр дахин дарж
  // үүссэн илүүдэл давхаргыг цэвэрлэхэд зориулав).
  async function handleDeleteFloor() {
    if (floorList.length <= 1) { alert('Хамгийн багадаа нэг давхарга үлдэх ёстой.'); return; }
    if (!window.confirm(`"${floorKey}" давхаргыг бүрмөсөн устгах vv? ҮҮнийг буцаах боломжгүй.`)) return;
    await supabase.from('basement_floors').delete().eq('tenant_id', hoaId).eq('floor_key', floorKey);
    const remaining = floorList.filter((f) => f !== floorKey);
    setFloorList(remaining);
    setFloorKey(remaining[0]);
  }

  // ---------------- localStorage-д автомат хадгалалт (аюлгвүйн сүлжээ) ----------------
  useEffect(() => {
    if (isFirstLoadRef.current) return; // ачаалж дуусаагүй үед бичихгүй
    try { localStorage.setItem(localStorageKey, JSON.stringify({ cols, rows, slots, polygons, texts, lines, compasses })); } catch { /* quota — үл тоомсорноно */ }
  }, [cols, rows, slots, polygons, texts, lines, compasses, localStorageKey]);

  // ---------------- Supabase хадгалах/нийтлэх ----------------
  async function saveToSupabase(publish) {
    if (!hoaId) return;
    setSaving(true);
    const payload = {
      tenant_id: hoaId, floor_key: floorKey,
      layout_json: { cols, rows, slots, polygons, texts, lines, compasses },
      ...(publish ? { status: 'published' } : {}),
    };
    const { error } = await supabase.from('basement_floors').upsert(payload, { onConflict: 'tenant_id,floor_key' });
    setSaving(false);
    if (error) { alert(friendlyErrorMessage(error, 'Хадгалахад алдаа гарлаа')); return; }
    if (publish) setStatus('published');
    setLastSavedAt(new Date());
  }

  // ---------------- JSON импорт/экспорт (архивлах, устсэн үед сэргээх) ----------------
  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        pushHistory();
        const data = JSON.parse(reader.result);
        applyLayout(data);
      } catch {
        alert('JSON файл уншиж чадсангүй — файлын бүтцийг шалгана уу.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

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
  const [marqueeRect, setMarqueeRect] = useState(null); // {x,y,w,h} - "чирж хүрээгээр сонгох" үзүүлэлт

  function handleGridPointerDown(e) {
    if (e.target.closest('[data-slot-id]')) return; // одоо буй слот өврийн listener-тэй
    if (tool === 'polygon' || tool === 'text' || tool === 'compass') return; // өврийн listener-тэй
    if (tool === 'line') {
      const rect = gridRef.current.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / zoom) / polySnap) * polySnap;
      const y = Math.round(((e.clientY - rect.top) / zoom) / polySnap) * polySnap;
      dragRef.current = { mode: 'line', startX: x, startY: y, startClientX: e.clientX, startClientY: e.clientY };
      return;
    }
    const { col, row } = clientToCell(e.clientX, e.clientY);
    if (!inBounds(col, row, cols, rows)) return;
    dragRef.current = { startCol: col, startRow: row, startClientX: e.clientX, startClientY: e.clientY, mode: 'undecided' };
  }

  const [lineGhost, setLineGhost] = useState(null);
  function handleGridPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === 'line') {
      const rect = gridRef.current.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / zoom) / polySnap) * polySnap;
      const y = Math.round(((e.clientY - rect.top) / zoom) / polySnap) * polySnap;
      setLineGhost({ x1: d.startX, y1: d.startY, x2: x, y2: y });
      return;
    }
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
    if (d.mode === 'marquee') {
      // 2026-09-03: Хэрэглэгчийн хүсэлт - хоосон нүднээс хол чирвэл
      // (эсвэл tool='warehouse' үед) рүүгүүл зурж, түүнтэй
      // огтлолцсон бүх слотыг НЭГ зэрэг сонгоно (олноор сонгох).
      const rect = gridRef.current.getBoundingClientRect();
      const x1 = Math.min(d.startClientX, e.clientX) - rect.left;
      const y1 = Math.min(d.startClientY, e.clientY) - rect.top;
      const x2 = Math.max(d.startClientX, e.clientX) - rect.left;
      const y2 = Math.max(d.startClientY, e.clientY) - rect.top;
      setMarqueeRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    }
  }

  function finishMarqueeSelection(e, additive) {
    const rect = gridRef.current.getBoundingClientRect();
    const x1 = (Math.min(dragRef.current.startClientX, e.clientX) - rect.left) / ec;
    const y1 = (Math.min(dragRef.current.startClientY, e.clientY) - rect.top) / ec;
    const x2 = (Math.max(dragRef.current.startClientX, e.clientX) - rect.left) / ec;
    const y2 = (Math.max(dragRef.current.startClientY, e.clientY) - rect.top) / ec;
    const hitIds = slots
      .filter((s) => {
        const cells = cellsOf(s);
        return cells.some(([c, r]) => c + 1 > x1 && c < x2 && r + 1 > y1 && r < y2);
      })
      .map((s) => s.id);
    setSelectedIds((prev) => {
      if (additive) return new Set([...prev, ...hitIds]);
      return new Set(hitIds);
    });
    setMarqueeRect(null);
  }

  function handleGridPointerUp(e) {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === 'line') {
      if (e) {
        const rect = gridRef.current.getBoundingClientRect();
        const x2 = Math.round(((e.clientX - rect.left) / zoom) / polySnap) * polySnap;
        const y2 = Math.round(((e.clientY - rect.top) / zoom) / polySnap) * polySnap;
        const distPx = Math.hypot(x2 - d.startX, y2 - d.startY) * zoom;
        if (distPx > 5) {
          pushHistory();
          setLines((prev) => [...prev, { id: crypto.randomUUID(), x1: d.startX, y1: d.startY, x2, y2, color: strokeColor, strokeWidth: 2 }]);
        }
      }
      setLineGhost(null);
      dragRef.current = null;
      return;
    }
    if (d.mode === 'draw' && d.pending) {
      pushHistory();
      setSlots((prev) => [...prev, {
        id: crypto.randomUUID(), col: d.pending.col, row: d.pending.row, horizontal: d.pending.horizontal,
        kind: 'slot', borderColor, fillColor: null, label: '',
      }]);
    } else if (d.mode === 'undecided' && tool === 'warehouse') {
      if (!occupancy(slots).has(`${d.startCol},${d.startRow}`)) {
        pushHistory();
        setSlots((prev) => [...prev, {
          id: crypto.randomUUID(), col: d.startCol, row: d.startRow, horizontal: false,
          kind: 'warehouse', borderColor, fillColor: null, label: '',
        }]);
      }
    } else if (d.mode === 'marquee' && e) {
      finishMarqueeSelection(e, e.ctrlKey || e.metaKey || e.shiftKey);
    }
    setGhost(null);
    dragRef.current = null;
  }

  // ---------------- одоо буй слот зөөх / дарж засах (5px "click" босго) ----------------
  const moveRef = useRef(null);

  // ---------------- текст чирж зөөх / дарж засах (5px "click" босго) ----------------
  const textMoveRef = useRef(null);
  const [draggingTextPos, setDraggingTextPos] = useState(null); // {id, x, y} - чирж буй үед л үзүүлэлт болгож ашиглана
  function handleTextPointerDown(e, text) {
    e.stopPropagation();
    textMoveRef.current = { id: text.id, startClientX: e.clientX, startClientY: e.clientY, startX: text.x, startY: text.y };
  }
  function handleTextPointerMove(e) {
    const m = textMoveRef.current;
    if (!m) return;
    const dx = (e.clientX - m.startClientX) / zoom;
    const dy = (e.clientY - m.startClientY) / zoom;
    // 2026-09-04 (10): Хэрэглэгчийн хүсэлт - чирэлт чөлөөт зайгаар БИШ,
    // торны 0.5 нүдний алхамаар (polySnap) л зөвгөддөг байх ёстой -
    // торны тэгш хэмийг эвдэхгүйн тулд.
    const snapX = Math.round((m.startX + dx) / polySnap) * polySnap;
    const snapY = Math.round((m.startY + dy) / polySnap) * polySnap;
    m.candidate = { x: snapX, y: snapY };
    setDraggingTextPos({ id: m.id, x: m.candidate.x, y: m.candidate.y });
  }
  function handleTextPointerUp(e) {
    const m = textMoveRef.current;
    if (!m) return;
    const movedPx = Math.hypot((e?.clientX || 0) - m.startClientX, (e?.clientY || 0) - m.startClientY);
    if (movedPx < 5) {
      setEditingTextId(m.id);
    } else if (m.candidate) {
      pushHistory();
      setTexts((prev) => prev.map((t) => (t.id === m.id ? { ...t, x: m.candidate.x, y: m.candidate.y } : t)));
    }
    setDraggingTextPos(null);
    textMoveRef.current = null;
  }


  function handleSlotPointerDown(e, slot) {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // 2026-09-03: Хэрэглэгчийн хүсэлт - Ctrl (Mac дээр Cmd) + дарах
      // үед зөвхөн сонголтыг нэмэх/хасах, зввхгүй (multi-select).
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(slot.id)) next.delete(slot.id); else next.add(slot.id);
        return next;
      });
      return;
    }
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
    function onMove(e) { handleGridPointerMove(e); handleSlotPointerMove(e); handleTextPointerMove(e); handlePolygonPointerMove(e); handleLinePointerMove(e); }
    function onUp(e) { handleGridPointerUp(e); handleSlotPointerUp(e); handleTextPointerUp(e); handlePolygonPointerUp(e); handleLinePointerUp(e); }
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
    setPolygons((prev) => [...prev, { id: crypto.randomUUID(), points, strokeColor, strokeWidth: 2, fillColor: null, label: '' }]);
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

  // 2026-09-04: Хэрэглэгчийн хүсэлт - "Текст нэмэх" горим үед хоосон
  // цэг дээр дарахад шинэ текст үүсгэж, шууд засах модалыг нээнэ.
  function handleTextToolClick(e) {
    if (tool !== 'text') return;
    if (e.target.closest('[data-text-id]')) return; // одоо буй текст өврийн onClick-тэй
    const rect = gridRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    pushHistory();
    const id = crypto.randomUUID();
    setTexts((prev) => [...prev, { id, x, y, text: '', color: null, fontSize: 14 }]);
    setEditingTextId(id);
  }
  function updateText(id, patch) {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  // 2026-09-04: Хэрэглэгчийн хүсэлт - "Компасс" горим үед хоосон
  // цэг дээр дарахад тор (grid)-ийн ХАМГИЙН ОЙР огтлолцол дээр
  // төв болгож байрлуулна. Компасс дээр дарах бүрд баруун тийш
  // 45 хэмээр эргүүлнэ.
  function handleCompassToolClick(e) {
    if (tool !== 'compass') return;
    if (e.target.closest('[data-compass-id]')) return; // одоо буй компасс өврийн onClick-тэй
    const rect = gridRef.current.getBoundingClientRect();
    const col = Math.round((e.clientX - rect.left) / ec);
    const row = Math.round((e.clientY - rect.top) / ec);
    pushHistory();
    setCompasses((prev) => [...prev, { id: crypto.randomUUID(), col, row, rotation: 0 }]);
  }
  function rotateCompass(id) {
    pushHistory();
    setCompasses((prev) => prev.map((c) => (c.id === id ? { ...c, rotation: ((c.rotation || 0) + 45) % 360 } : c)));
  }
  function deleteCompass(id) {
    pushHistory();
    setCompasses((prev) => prev.filter((c) => c.id !== id));
  }
  function deleteText(id) {
    pushHistory();
    setTexts((prev) => prev.filter((t) => t.id !== id));
    setEditingTextId(null);
  }

  function updateLine(id, patch) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function deleteLine(id) {
    pushHistory();
    setLines((prev) => prev.filter((l) => l.id !== id));
    setEditingLineId(null);
  }

  // ---------------- бэлэн полигон дээр дарж нэр (label) оноох ----------------
  // 2026-09-02: Хэрэглэгчийн хүсэлт — талбай эзэмшигчийг "Тоот" засах
  // модал доторх dropdown-оор холбохын тулд полигон ч мвн slot шиг
  // тодорхой нэртэй (жиш нь "Э-01") байх шаардлагатай болов.
  const [editingPolygonId, setEditingPolygonId] = useState(null);
  // 2026-09-04 (9): Хэрэглэгчийн хүсэлт - полигон болон шулуун
  // зураасыг чирж байрлалыг өөрчлөх боломжтой болгов (текст/слот
  // шиг адил зарчим: 5px-ээс бага бол дарсан гэж үзэж модаль нээнэ,
  // илүү бол чирж байрлал вврчилнэ).
  const polygonMoveRef = useRef(null);
  const [draggingPolyDelta, setDraggingPolyDelta] = useState(null);
  function handlePolygonPointerDown(e, p) {
    e.stopPropagation();
    polygonMoveRef.current = { id: p.id, startClientX: e.clientX, startClientY: e.clientY, points: p.points };
  }
  function handlePolygonPointerMove(e) {
    const m = polygonMoveRef.current;
    if (!m) return;
    const dx = Math.round(((e.clientX - m.startClientX) / zoom) / polySnap) * polySnap;
    const dy = Math.round(((e.clientY - m.startClientY) / zoom) / polySnap) * polySnap;
    m.candidate = { dx, dy };
    setDraggingPolyDelta({ id: m.id, dx, dy });
  }
  function handlePolygonPointerUp(e) {
    const m = polygonMoveRef.current;
    if (!m) return;
    const movedPx = Math.hypot((e?.clientX || 0) - m.startClientX, (e?.clientY || 0) - m.startClientY);
    if (movedPx < 5) {
      setEditingPolygonId(m.id);
    } else if (m.candidate) {
      pushHistory();
      const { dx, dy } = m.candidate;
      setPolygons((prev) => prev.map((p) => (p.id === m.id ? { ...p, points: p.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) } : p)));
    }
    polygonMoveRef.current = null;
    setDraggingPolyDelta(null);
  }
  const lineMoveRef = useRef(null);
  const [draggingLineDelta, setDraggingLineDelta] = useState(null);
  function handleLinePointerDown(e, l) {
    e.stopPropagation();
    lineMoveRef.current = { id: l.id, startClientX: e.clientX, startClientY: e.clientY };
  }
  function handleLinePointerMove(e) {
    const m = lineMoveRef.current;
    if (!m) return;
    const dx = Math.round(((e.clientX - m.startClientX) / zoom) / polySnap) * polySnap;
    const dy = Math.round(((e.clientY - m.startClientY) / zoom) / polySnap) * polySnap;
    m.candidate = { dx, dy };
    setDraggingLineDelta({ id: m.id, dx, dy });
  }
  function handleLinePointerUp(e) {
    const m = lineMoveRef.current;
    if (!m) return;
    const movedPx = Math.hypot((e?.clientX || 0) - m.startClientX, (e?.clientY || 0) - m.startClientY);
    if (movedPx < 5) {
      setEditingLineId(m.id);
    } else if (m.candidate) {
      pushHistory();
      const { dx, dy } = m.candidate;
      setLines((prev) => prev.map((l) => (l.id === m.id ? { ...l, x1: l.x1 + dx, y1: l.y1 + dy, x2: l.x2 + dx, y2: l.y2 + dy } : l)));
    }
    lineMoveRef.current = null;
    setDraggingLineDelta(null);
  }
  function updatePolygon(id, patch) {
    setPolygons((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function deletePolygon(id) {
    pushHistory();
    setPolygons((prev) => prev.filter((p) => p.id !== id));
    setEditingPolygonId(null);
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
      slots: slots.map((s) => ({ id: s.id, col: s.col, row: s.row, horizontal: s.horizontal, kind: s.kind, borderColor: s.borderColor, fillColor: s.fillColor, labelColor: s.labelColor, label: s.label || '', labelRotation: s.labelRotation || 0, sqm: s.sqm ?? null })),
      polygons: polygons.map((p) => ({ id: p.id, points: p.points, strokeColor: p.strokeColor, strokeWidth: p.strokeWidth, lineStyle: p.lineStyle || null, fillColor: p.fillColor, labelColor: p.labelColor, label: p.label || '', labelRotation: p.labelRotation || 0, sqm: p.sqm ?? null })),
      texts: texts.map((t) => ({ id: t.id, x: t.x, y: t.y, text: t.text || '', color: t.color, fontSize: t.fontSize || 14, rotation: t.rotation || 0 })),
      lines: lines.map((l) => ({ id: l.id, x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, color: l.color, strokeWidth: l.strokeWidth || 2, lineStyle: l.lineStyle || null })),
      compasses: compasses.map((c) => ({ id: c.id, col: c.col, row: c.row, rotation: c.rotation || 0 })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'floor-slots-react.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const editingSlot = useMemo(() => slots.find((s) => s.id === editingSlotId), [slots, editingSlotId]);
  // 2026-09-04: Хэрэглэгчийн хүсэлт - тухайн давхаргад зурагдсан
  // Зогсоол/Агуулахын тоог менежерүүдэд хурдан харуулж, алга болох/
  // давхардахыг чеклэхэд туслах зорилготой.
  const parkingCount = useMemo(() => slots.filter((s) => s.kind === 'slot').length, [slots]);
  const warehouseCount = useMemo(() => slots.filter((s) => s.kind === 'warehouse').length, [slots]);
  const editingPolygon = useMemo(() => polygons.find((p) => p.id === editingPolygonId), [polygons, editingPolygonId]);
  const editingText = useMemo(() => texts.find((t) => t.id === editingTextId), [texts, editingTextId]);
  const editingLine = useMemo(() => lines.find((l) => l.id === editingLineId), [lines, editingLineId]);

  return (
    <div className="ds-card p-3" style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 2026-08-31 (2): давхарга сонгох + хадгалах/нийтлэх/импорт — талбайн ажилтан тусгаар (draft/published 2 түвшин) хандалахад зориулав. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded border border-bordercol overflow-hidden">
          {sortFloors(floorList).map((fk) => (
            <button
              key={fk}
              onClick={() => setFloorKey(fk)}
              className={`px-3 py-1.5 text-[12px] font-medium ${floorKey === fk ? 'bg-customBlue text-white' : 'bg-transparent text-mutedtext hover:text-slate-900 dark:hover:text-white'}`}
            >
              {fk}
            </button>
          ))}
        </div>
        {addingFloor ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus className="ds-input w-24" placeholder="жиш. F1" value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddFloor(); if (e.key === 'Escape') setAddingFloor(false); }}
            />
            <button className="ds-btn-primary" onClick={handleAddFloor}>Нэмэх</button>
            <button className="ds-btn-secondary" onClick={() => { setAddingFloor(false); setNewFloorName(''); }}>Болих</button>
          </div>
        ) : (
          <button className="ds-btn-secondary" onClick={() => setAddingFloor(true)}>+ Шинэ давхарга</button>
        )}
        <button className="ds-btn-secondary text-customRed" onClick={handleDeleteFloor} title="Идэвхтэй давхаргыг устгах">Давхарга устгах</button>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${status === 'published' ? 'bg-customGreen text-white' : 'bg-customOrange text-white'}`}>
          {status === 'published' ? 'Нийтлэгдсэн' : 'Ноорог'}
        </span>
        <button className="ds-btn-secondary" onClick={() => saveToSupabase(false)} disabled={saving || !hoaId}>
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
        <button className="ds-btn-primary" onClick={() => saveToSupabase(true)} disabled={saving || !hoaId}>Нийтлэх</button>
        {lastSavedAt && (
          <span className="text-[10.5px] text-mutedtext">Сүүлд хадгалсан: {lastSavedAt.toLocaleTimeString()}</span>
        )}
        {selectedIds.size > 0 && (
          <>
            <span className="text-[10.5px] text-customBlue">{selectedIds.size} слот сонгогдсон</span>
            <button className="ds-btn-secondary" onClick={() => setSelectedIds(new Set())}>Сонголт цэвэрлэх</button>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />
      </div>

      {/* ---------------- toolbar ---------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded border border-bordercol overflow-hidden">
          {[['slot', 'Зогсоол зурах'], ['warehouse', 'Агуулах зурах'], ['polygon', 'Полигон зурах'], ['text', 'Текст нэмэх'], ['line', 'Шулуун зураас'], ['compass', 'Компасс']].map(([key, label]) => (
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
        {tool === 'polygon' || tool === 'line' ? (
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-mutedtext">Зураасны өнгө</label>
            <button onClick={() => setStrokeColor(null)} className={`w-5 h-5 rounded border ${!strokeColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} title="Автомат (Тоот шиг)" />
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setStrokeColor(c)} style={{ background: c }} className={`w-5 h-5 rounded ${strokeColor === c ? 'ring-2 ring-customBlue' : ''}`} />
            ))}
          </div>
        ) : tool === 'text' ? null : (
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-mutedtext">Хүрээний өнгө</label>
            <button onClick={() => setBorderColor(null)} className={`w-5 h-5 rounded border ${!borderColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} title="Автомат (Тоот шиг)" />
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
        <button className="ds-btn-secondary" onClick={() => fileInputRef.current?.click()}>JSON импортлох</button>
        <button className="ds-btn-primary" onClick={exportJson}>JSON export</button>
      </div>

      <div className="text-[10.5px] text-mutedtext">
        Зогсоол: хоосон нүднээс зэргэлдээ нүд рүү чирж 2 нүд холбоход слот үүснэ · Агуулах: хоосон нүд дээр дарахад 1 нүдэд слот үүснэ ·
        Слот дээр дарж чирвэл байрлал өөрчлөгднө, дарахад (чиргэлгүй) засах цонх нээгдэнэ · Полигон: тор дээр дарж оройнуудаа байрлуулж, эхний цэг дээр дарах эсвэл Enter дарахад хаагдана, Backspace сүүлийн цэгийг арилгана, Escape цуцална · Ctrl+дарах (эсвэл Cmd) - олон слот сонгох, хоосон нүднээс хол чирэх - рүүгүүлээр олноор сонгох, Escape - сонголт цэвэрлэх.
      </div>

      {/* ---------------- canvas ---------------- */}
      <div className="flex-1 overflow-auto overscroll-contain rounded border border-bordercol">
        <div
          ref={gridRef}
          onPointerDown={handleGridPointerDown}
          onClick={(e) => { handlePolyClick(e); handleTextToolClick(e); handleCompassToolClick(e); }}
          style={{
            position: 'relative', width: cols * ec, height: rows * ec, cursor: 'crosshair',
            touchAction: 'none', // 2026-09-03: iPad/tablet+pen дэмжлэг - хүлээгдэхгүй scroll/zoom
            // gesture-ийг браузерт саатуулж, pointer event бүгдийг манай handler-т шилжүүлнэ.
            backgroundImage: `repeating-linear-gradient(180deg, rgba(143,168,192,0.16) 0, rgba(143,168,192,0.16) 1px, transparent 1px, transparent ${ec}px),`
              + `repeating-linear-gradient(90deg, rgba(143,168,192,0.16) 0, rgba(143,168,192,0.16) 1px, transparent 1px, transparent ${ec}px)`,
          }}
        >
          {/* 2026-09-04: Зогсоол/Агуулахын тоо - зүүн дээд (1,1) нүдэнд
              байнга харагдах динамик мвр (менежерүүдэд алга болох/
              давхардахыг хурдан чеклэхэд зориулав). */}
          <div
            style={{ position: 'absolute', left: ec, top: ec, zIndex: 45, pointerEvents: 'none' }}
            className="bg-white/90 dark:bg-sidebg/90 rounded px-2 py-1 text-[10.5px] font-semibold text-slate-700 dark:text-mutedtext leading-tight shadow-sm border border-slate-200 dark:border-bordercol"
          >
            <div>Зогсоол: {parkingCount} ш.</div>
            <div>Агуулах: {warehouseCount} ш.</div>
          </div>

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
                <div
                  className={`absolute inset-[1px] rounded-[1px] border ${!s.borderColor ? 'border-slate-500/30' : ''} ${!s.fillColor && !selectedIds.has(s.id) ? 'bg-slate-500/[0.10]' : ''}`}
                  style={{
                    ...(s.borderColor ? { borderColor: s.borderColor } : {}),
                    ...(selectedIds.has(s.id) ? { background: 'rgba(95,224,208,0.18)' } : s.fillColor ? { background: s.fillColor } : {}),
                  }}
                />
                {s.label && (
                  <div
                    className={!s.labelColor ? 'text-slate-400 dark:text-mutedtext' : ''}
                    style={{
                      position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) rotate(${s.labelRotation || 0}deg)`,
                      fontSize: 10 * zoom, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap',
                      ...(s.labelColor ? { color: s.labelColor } : {}),
                    }}
                  >
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

          {/* 2026-09-03: "чирж хүрээгээр сонгох" (marquee) үзүүлэлт */}
          {marqueeRect && (
            <div style={{
              position: 'absolute', left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.w, height: marqueeRect.h,
              background: 'rgba(59,130,246,0.15)', border: '1px dashed #3b82f6', pointerEvents: 'none', zIndex: 60,
            }} />
          )}

          {/* полигон давхарга (SVG) */}
          <svg style={{ position: 'absolute', left: 0, top: 0, width: cols * ec, height: rows * ec, pointerEvents: 'none' }}>
            {polygons.map((p) => {
              const delta = draggingPolyDelta && draggingPolyDelta.id === p.id ? draggingPolyDelta : { dx: 0, dy: 0 };
              const pts = p.points.map((pt) => ({ x: pt.x + delta.dx, y: pt.y + delta.dy }));
              const cx = (pts.reduce((s, pt) => s + pt.x, 0) / pts.length) * zoom;
              const cy = (pts.reduce((s, pt) => s + pt.y, 0) / pts.length) * zoom;
              return (
                <g
                  key={p.id}
                  className={!p.strokeColor || !p.labelColor ? 'text-slate-400 dark:text-mutedtext' : ''}
                  style={{ pointerEvents: 'auto', cursor: 'grab' }}
                  onPointerDown={(e) => handlePolygonPointerDown(e, p)}
                >
                  <polygon
                    points={pts.map((pt) => `${pt.x * zoom},${pt.y * zoom}`).join(' ')}
                    fill={p.fillColor ? p.fillColor : 'currentColor'} fillOpacity={p.fillColor ? 0.35 : 0.10}
                    stroke={p.strokeColor ? p.strokeColor : 'currentColor'} strokeOpacity={p.strokeColor ? 1 : 0.3} strokeWidth={p.strokeWidth} strokeLinejoin="round"
                    strokeDasharray={p.lineStyle === 'dashed' ? `${(p.strokeWidth || 2) * 3},${(p.strokeWidth || 2) * 2}` : p.lineStyle === 'dotted' ? `${p.strokeWidth || 2},${(p.strokeWidth || 2) * 1.5}` : undefined}
                    strokeLinecap={p.lineStyle === 'dotted' ? 'round' : 'butt'}
                  />
                  {p.label && (
                    <text
                      x={cx} y={cy} fill={p.labelColor ? p.labelColor : 'currentColor'} fontSize={12 * zoom} fontWeight={600}
                      textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${p.labelRotation || 0} ${cx} ${cy})`}
                      style={{ pointerEvents: 'none' }}
                    >
                      {p.label}
                    </text>
                  )}
                  {p.label && p.sqm != null && (
                    <text
                      x={cx} y={cy + 13 * zoom} fill={p.labelColor ? p.labelColor : 'currentColor'} fontSize={9 * zoom} fontWeight={600} opacity={0.8}
                      textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${p.labelRotation || 0} ${cx} ${cy})`}
                      style={{ pointerEvents: 'none' }}
                    >
                      {p.sqm}м2
                    </text>
                  )}
                </g>
              );
            })}
            {tool === 'polygon' && polyPoints.length > 0 && (
              <polyline
                points={polyPoints.map((pt) => `${pt.x * zoom},${pt.y * zoom}`).join(' ')}
                fill="none" stroke={strokeColor} strokeWidth={2} strokeDasharray="4,3"
              />
            )}
            {tool === 'polygon' && polyPoints.map((pt, i) => (
              <circle key={i} cx={pt.x * zoom} cy={pt.y * zoom} r={4} fill={i === 0 ? '#5fe0d0' : strokeColor} />
            ))}
            {lines.map((l) => {
              const delta = draggingLineDelta && draggingLineDelta.id === l.id ? draggingLineDelta : { dx: 0, dy: 0 };
              const x1 = l.x1 + delta.dx, y1 = l.y1 + delta.dy, x2 = l.x2 + delta.dx, y2 = l.y2 + delta.dy;
              const dashArray = l.lineStyle === 'dashed' ? `${(l.strokeWidth || 2) * 3},${(l.strokeWidth || 2) * 2}` : l.lineStyle === 'dotted' ? `${l.strokeWidth || 2},${(l.strokeWidth || 2) * 1.5}` : undefined;
              const lineCap = l.lineStyle === 'dotted' ? 'round' : 'butt';
              return (
                <g key={l.id} style={{ pointerEvents: 'auto', cursor: 'grab' }} onPointerDown={(e) => handleLinePointerDown(e, l)}>
                  {/* Даралт үзэх талбайг түүнлүүлж, дарахад амар болгох тулд тунгалаг өргөн зураас (hit-area) */}
                  <line x1={x1 * zoom} y1={y1 * zoom} x2={x2 * zoom} y2={y2 * zoom} stroke="transparent" strokeWidth={Math.max(16, (l.strokeWidth || 2) * zoom)} />
                  <line x1={x1 * zoom} y1={y1 * zoom} x2={x2 * zoom} y2={y2 * zoom} stroke={l.color || '#94a3b8'} strokeWidth={(l.strokeWidth || 2) * zoom} strokeLinecap={lineCap} strokeDasharray={dashArray} />
                </g>
              );
            })}
            {lineGhost && (
              <line x1={lineGhost.x1 * zoom} y1={lineGhost.y1 * zoom} x2={lineGhost.x2 * zoom} y2={lineGhost.y2 * zoom} stroke={strokeColor || '#94a3b8'} strokeWidth={2} strokeDasharray="4,3" />
            )}
          </svg>
          {texts.map((t) => {
            const pos = draggingTextPos && draggingTextPos.id === t.id ? draggingTextPos : t;
            return (
              <div
                key={t.id}
                data-text-id={t.id}
                onPointerDown={(e) => handleTextPointerDown(e, t)}
                style={{
                  position: 'absolute', left: pos.x * zoom, top: pos.y * zoom, cursor: 'grab',
                  fontSize: (t.fontSize || 14) * zoom, fontWeight: 600, whiteSpace: 'nowrap',
                  color: t.color || undefined, padding: 2,
                  transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined, transformOrigin: 'left top',
                }}
                className={!t.color ? 'text-slate-400 dark:text-mutedtext' : ''}
              >
                {t.text || '(хоосон текст)'}
              </div>
            );
          })}
          {/* 2026-09-04: Компасс - 48px диаметртэй, тор (grid) огтлолцол
              дээр төвтөй гөвр байрлана, дарах бүрд 45 хэмээр эргэнэ.
              2026-09-04 (2): Хэрэглэгчийн вгсвн дэлгэрэнгүй SVG (path-
              үндэслэсэн, "N" үсэг + бүтэн тойрог хүрээ + ромбо needle)
              болгож сольсон. Эх SVG-ийн хатуу "#000000" fill-ийг
              "currentColor" болгож (Dark/Light mode хоёуланд theme-
              aware байхаар) вврчилсвн - үлдсэн бүгд яг эх хэвээрээ. */}
          {compasses.map((c) => (
            <svg
              key={c.id}
              data-compass-id={c.id}
              version="1.0" xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 326.000000 335.000000"
              preserveAspectRatio="xMidYMid meet"
              width={48 * zoom} height={48 * zoom}
              onClick={(e) => { e.stopPropagation(); if (e.ctrlKey || e.metaKey) deleteCompass(c.id); else rotateCompass(c.id); }}
              style={{
                position: 'absolute', left: c.col * ec - 24 * zoom, top: c.row * ec - 24 * zoom,
                transform: `rotate(${c.rotation || 0}deg)`, transformOrigin: '50% 50%', cursor: 'pointer',
              }}
              className="text-slate-600 dark:text-slate-300"
              title="Дарж эргүүлэх · Ctrl+дарж устгах"
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

      {/* ---------------- слот засах модал ---------------- */}
      {editingSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,15,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditingSlotId(null)}>
          <div className="ds-card p-4" style={{ width: 300, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Слот засах</div>
            <label className="block text-[10.5px] text-mutedtext mb-1">Дугаар / бичвэр</label>
            <input className="ds-input w-full mb-3" maxLength={8} value={editingSlot.label} onChange={(e) => updateSlot(editingSlot.id, { label: e.target.value })} />
            {editingSlot.kind === 'warehouse' && (
              <>
                <label className="block text-[10.5px] text-mutedtext mb-1">Талбайн хэмжээ (м2) - газар дээр хэмжсэнээр гараар оруулна</label>
                <input type="number" min={0} step="0.01" className="ds-input w-full mb-3" value={editingSlot.sqm ?? ''} onChange={(e) => updateSlot(editingSlot.id, { sqm: e.target.value === '' ? null : Math.max(0, +e.target.value || 0) })} />
              </>
            )}


            <label className="block text-[10.5px] text-mutedtext mb-1">Дугаарын өнгө</label>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button onClick={() => updateSlot(editingSlot.id, { labelColor: null })} className={`w-6 h-6 rounded border ${!editingSlot.labelColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} title="Автомат (Тоот шиг)" />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updateSlot(editingSlot.id, { labelColor: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingSlot.labelColor === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>

            <label className="block text-[10.5px] text-mutedtext mb-1">Хүрээний өнгө</label>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button onClick={() => updateSlot(editingSlot.id, { borderColor: null })} className={`w-6 h-6 rounded border ${!editingSlot.borderColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} title="Автомат (Тоот шиг)" />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updateSlot(editingSlot.id, { borderColor: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingSlot.borderColor === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>

            <label className="block text-[10.5px] text-mutedtext mb-1">Дүү ргэх өнгө</label>
            <div className="flex gap-1.5 mb-4 flex-wrap">
              <button onClick={() => updateSlot(editingSlot.id, { fillColor: null })} className={`w-6 h-6 rounded border ${!editingSlot.fillColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updateSlot(editingSlot.id, { fillColor: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingSlot.fillColor === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>

            <label className="block text-[10.5px] text-mutedtext mb-1">Одоогийн эргэлт: {editingSlot.labelRotation || 0}°</label>
            <div className="flex gap-2 mb-4">
              <button className="ds-btn-secondary flex-1" onClick={() => updateSlot(editingSlot.id, { labelRotation: ((editingSlot.labelRotation || 0) - 90 + 360) % 360 })}>↺ 90° (зүү н)</button>
              <button className="ds-btn-secondary flex-1" onClick={() => updateSlot(editingSlot.id, { labelRotation: ((editingSlot.labelRotation || 0) + 90) % 360 })}>↻ 90° (баруун)</button>
            </div>

            <div className="flex justify-between gap-2">
              <button className="ds-btn-secondary text-customRed" onClick={() => deleteSlot(editingSlot.id)}>Слот устгах</button>
              <button className="ds-btn-primary" onClick={() => setEditingSlotId(null)}>Дуусгах</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- полигон засах модал (талбай нэр оноох) ---------------- */}
      {editingPolygon && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,15,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditingPolygonId(null)}>
          <div className="ds-card p-4" style={{ width: 300, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Талбай засах</div>
            <label className="block text-[10.5px] text-mutedtext mb-1">Талбайн нэр / дугаар (жиш нь "Э-01")</label>
            <input className="ds-input w-full mb-3" maxLength={16} value={editingPolygon.label || ''} onChange={(e) => updatePolygon(editingPolygon.id, { label: e.target.value })} />

            <label className="block text-[10.5px] text-mutedtext mb-1">Талбайн хэмжээ (м2) - газар дээр хэмжсэнээр гараар оруулна</label>
            <input type="number" min={0} step="0.01" className="ds-input w-full mb-3" value={editingPolygon.sqm ?? ''} onChange={(e) => updatePolygon(editingPolygon.id, { sqm: e.target.value === '' ? null : Math.max(0, +e.target.value || 0) })} />

            <label className="block text-[10.5px] text-mutedtext mb-1">Нэрийн өнгө</label>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button onClick={() => updatePolygon(editingPolygon.id, { labelColor: null })} className={`w-6 h-6 rounded border ${!editingPolygon.labelColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} title="Автомат (Тоот шиг)" />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updatePolygon(editingPolygon.id, { labelColor: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingPolygon.labelColor === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>

            <label className="block text-[10.5px] text-mutedtext mb-1">Зураасны өргөн (px)</label>
            <input type="number" min={1} max={10} className="ds-input w-full mb-3" value={editingPolygon.strokeWidth || 2} onChange={(e) => updatePolygon(editingPolygon.id, { strokeWidth: Math.max(1, +e.target.value || 1) })} />

            <label className="block text-[10.5px] text-mutedtext mb-1">Хүрээний загвар</label>
            <select className="ds-input w-full mb-3" value={editingPolygon.lineStyle || 'solid'} onChange={(e) => updatePolygon(editingPolygon.id, { lineStyle: e.target.value === 'solid' ? null : e.target.value })}>
              <option value="solid">Тогтмол зураас</option>
              <option value="dashed">Түүдэн зураас</option>
              <option value="dotted">Цэгэн зураас</option>
            </select>

            <label className="block text-[10.5px] text-mutedtext mb-1">Зураасны өнгө</label>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button onClick={() => updatePolygon(editingPolygon.id, { strokeColor: null })} className={`w-6 h-6 rounded border ${!editingPolygon.strokeColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} title="Автомат (Тоот шиг)" />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updatePolygon(editingPolygon.id, { strokeColor: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingPolygon.strokeColor === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>

            <label className="block text-[10.5px] text-mutedtext mb-1">Дүү ргэлтийн өнгө</label>
            <div className="flex gap-1.5 mb-4 flex-wrap">
              <button onClick={() => updatePolygon(editingPolygon.id, { fillColor: null })} className={`w-6 h-6 rounded border ${!editingPolygon.fillColor ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updatePolygon(editingPolygon.id, { fillColor: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingPolygon.fillColor === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>

            <label className="block text-[10.5px] text-mutedtext mb-1">Одоогийн эргэлт: {editingPolygon.labelRotation || 0}°</label>
            <div className="flex gap-2 mb-4">
              <button className="ds-btn-secondary flex-1" onClick={() => updatePolygon(editingPolygon.id, { labelRotation: ((editingPolygon.labelRotation || 0) - 90 + 360) % 360 })}>↺ 90° (зүү н)</button>
              <button className="ds-btn-secondary flex-1" onClick={() => updatePolygon(editingPolygon.id, { labelRotation: ((editingPolygon.labelRotation || 0) + 90) % 360 })}>↻ 90° (баруун)</button>
            </div>

            <div className="flex justify-between gap-2">
              <button className="ds-btn-secondary text-customRed" onClick={() => deletePolygon(editingPolygon.id)}>Талбай устгах</button>
              <button className="ds-btn-primary" onClick={() => setEditingPolygonId(null)}>Дуусгах</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- текст засах модал ---------------- */}
      {editingText && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,15,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditingTextId(null)}>
          <div className="ds-card p-4" style={{ width: 300, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Текст засах</div>
            <label className="block text-[10.5px] text-mutedtext mb-1">Бичвэр</label>
            <input className="ds-input w-full mb-3" maxLength={40} autoFocus value={editingText.text || ''} onChange={(e) => updateText(editingText.id, { text: e.target.value })} />

            <label className="block text-[10.5px] text-mutedtext mb-1">Хэмжээ (px)</label>
            <input type="number" min={8} max={40} className="ds-input w-full mb-3" value={editingText.fontSize || 14} onChange={(e) => updateText(editingText.id, { fontSize: Math.max(8, +e.target.value || 14) })} />

            <label className="block text-[10.5px] text-mutedtext mb-1">Внгв</label>
            <div className="flex gap-1.5 mb-4 flex-wrap">
              <button onClick={() => updateText(editingText.id, { color: null })} className={`w-6 h-6 rounded border ${!editingText.color ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} title="Автомат (Тоот шиг)" />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updateText(editingText.id, { color: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingText.color === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>

            <label className="block text-[10.5px] text-mutedtext mb-1">Одоогийн эргэлт: {editingText.rotation || 0}°</label>
            <div className="flex gap-2 mb-4">
              <button className="ds-btn-secondary flex-1" onClick={() => updateText(editingText.id, { rotation: ((editingText.rotation || 0) - 90 + 360) % 360 })}>↺ 90° (зүүн)</button>
              <button className="ds-btn-secondary flex-1" onClick={() => updateText(editingText.id, { rotation: ((editingText.rotation || 0) + 90) % 360 })}>↻ 90° (баруун)</button>
            </div>

            <div className="flex justify-between gap-2">
              <button className="ds-btn-secondary text-customRed" onClick={() => deleteText(editingText.id)}>Текст устгах</button>
              <button className="ds-btn-primary" onClick={() => setEditingTextId(null)}>Дуусгах</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- шулуун зураас засах модал ---------------- */}
      {editingLine && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,15,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditingLineId(null)}>
          <div className="ds-card p-4" style={{ width: 300, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Зураас засах</div>
            <label className="block text-[10.5px] text-mutedtext mb-1">өргөн (px)</label>
            <input type="number" min={1} max={10} className="ds-input w-full mb-3" value={editingLine.strokeWidth || 2} onChange={(e) => updateLine(editingLine.id, { strokeWidth: Math.max(1, +e.target.value || 1) })} />

            <label className="block text-[10.5px] text-mutedtext mb-1">Загвар</label>
            <select className="ds-input w-full mb-3" value={editingLine.lineStyle || 'solid'} onChange={(e) => updateLine(editingLine.id, { lineStyle: e.target.value === 'solid' ? null : e.target.value })}>
              <option value="solid">Тогтмол зураас</option>
              <option value="dashed">Түүдэн зураас</option>
              <option value="dotted">Цэгэн зураас</option>
            </select>

            <label className="block text-[10.5px] text-mutedtext mb-1">Внгв</label>
            <div className="flex gap-1.5 mb-4 flex-wrap">
              <button onClick={() => updateLine(editingLine.id, { color: null })} className={`w-6 h-6 rounded border ${!editingLine.color ? 'ring-2 ring-customBlue' : ''}`} style={{ background: 'repeating-linear-gradient(45deg, #2a3a4d, #2a3a4d 3px, #1a2534 3px, #1a2534 6px)' }} title="Автомат (Тоот шиг)" />
              {PALETTE.map((c) => (
                <button key={c} onClick={() => updateLine(editingLine.id, { color: c })} style={{ background: c }} className={`w-6 h-6 rounded ${editingLine.color === c ? 'ring-2 ring-customBlue' : ''}`} />
              ))}
            </div>

            <div className="flex justify-between gap-2">
              <button className="ds-btn-secondary text-customRed" onClick={() => deleteLine(editingLine.id)}>Зураас устгах</button>
              <button className="ds-btn-primary" onClick={() => setEditingLineId(null)}>Дуусгах</button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog />
    </div>
  );
}
