import { useEffect, useRef, useState } from 'react';

// EditOwnerModal.jsx-д анх бүтээгдсэн давтагдах жагсаалт талбарууд
// (утас/имэйл/зогсоол/агуулах/машин) — 2026-08-16 EditClientModal.jsx-д ч
// дахин хэрэгтэй болсон тул тусдаа файл болгов (Rule of two).

export function SimpleListField({ label, items, onChange, placeholder }) {
  function update(i, val) {
    const next = [...items];
    next[i] = val;
    onChange(next);
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, '']);
  }
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] text-slate-500 dark:text-mutedtext tracking-[0.4px]">{label}</label>
        <button type="button" onClick={add} className="text-[11px] text-blue-500 hover:text-blue-400">+ Нэмэх</button>
      </div>
      {items.map((val, i) => (
        <div key={i} className="flex items-center gap-2 mb-1.5">
          <input className="ds-input flex-1" value={val} placeholder={placeholder} onChange={(e) => update(i, e.target.value)} />
          <button type="button" onClick={() => remove(i)} className="text-customRed text-sm px-1">✕</button>
        </div>
      ))}
    </div>
  );
}

// 2026-08-19: 1000+ spot-той үед энгийн <select> хэрэглэхэд бологүй
// тул хайлттай combobox (текст бичихэд шүүж жагсаана, дээд тал нь 50
// үр дүн л render хийнэ) болгож сольсон.
function SpotCombobox({ value, onSelect, spots, takenIds, loading }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = value?.code ? `${value.floorLevel} ${value.code}` : '';
  const q = query.trim().toLowerCase();
  const pool = spots.filter((s) => !takenIds.has(s.id) || s.id === value?.id);
  const matches = (q ? pool.filter((s) => `${s.floorLevel} ${s.code}`.toLowerCase().includes(q)) : pool).slice(0, 50);

  return (
    <div className="relative flex-1" ref={containerRef}>
      <input
        className="ds-input w-full"
        placeholder={loading ? 'Ачаалж байна...' : 'Хайх (давхар, бүс, дугаар)...'}
        value={open ? query : selectedLabel}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-auto ds-card p-1 shadow-lg">
          {matches.length === 0 && (
            <div className="text-[12px] text-mutedtext px-2 py-1.5">Илэрц олдсонгүй</div>
          )}
          {matches.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onSelect(s); setOpen(false); setQuery(''); }}
              className="block w-full text-left px-2 py-1.5 text-[12px] rounded hover:bg-slate-100 dark:hover:bg-appbg"
            >
              {s.floorLevel} {s.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpotSelectField({ label, checked, onToggle, items, onChange, addLabel, spots, takenIds, loading }) {
  function updateItem(i, spot) {
    const next = [...items];
    next[i] = spot ? { id: spot.id, floorLevel: spot.floorLevel, code: spot.code } : { id: '', floorLevel: '', code: '' };
    onChange(next);
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { id: '', floorLevel: '', code: '' }]);
  }
  return (
    <div className="mb-4">
      <label className="flex items-center gap-2 text-[12px] font-medium text-slate-900 dark:text-white cursor-pointer mb-2">
        <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
        {label}
      </label>
      {checked && (
        <>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <SpotCombobox value={it} onSelect={(s) => updateItem(i, s)} spots={spots} takenIds={takenIds} loading={loading} />
              <button type="button" onClick={() => remove(i)} className="text-customRed text-sm px-1">✕</button>
            </div>
          ))}
          <button type="button" onClick={add} className="ds-btn-secondary w-full">{addLabel}</button>
        </>
      )}
    </div>
  );
}

export function VehicleListField({ checked, onToggle, items, onChange }) {
  function update(i, field, val) {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { digits: '', letters: '' }]);
  }
  return (
    <div className="mb-4">
      <label className="flex items-center gap-2 text-[12px] font-medium text-slate-900 dark:text-white cursor-pointer mb-2">
        <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
        Машин
      </label>
      {checked && (
        <>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <input className="ds-input w-20" placeholder="0000" value={it.digits} onChange={(e) => update(i, 'digits', e.target.value)} />
              <input className="ds-input w-20" placeholder="ААА" value={it.letters} onChange={(e) => update(i, 'letters', e.target.value)} />
              <button type="button" onClick={() => remove(i)} className="text-customRed text-sm px-1">✕</button>
            </div>
          ))}
          <button type="button" onClick={add} className="ds-btn-secondary w-full">+ Машин нэмэх</button>
        </>
      )}
    </div>
  );
}
