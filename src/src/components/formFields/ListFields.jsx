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

export function SpotListField({ label, checked, onToggle, items, onChange, addLabel }) {
  function update(i, field, val) {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { floor: '', no: '' }]);
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
              <select className="ds-select w-28" value={it.floor} onChange={(e) => update(i, 'floor', e.target.value)}>
                <option value="">Давхар</option>
                {Array.from({ length: 5 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <input className="ds-input flex-1" placeholder="Дугаар" value={it.no} onChange={(e) => update(i, 'no', e.target.value)} />
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
