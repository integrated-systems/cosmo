import { useState } from 'react';
import Modal from './Modal';

// suh.html-ийн загварт тулгуурласан "Сууц өмчлөгч засах" модал —
// 2026-08-13 хэрэглэгчийн өгсөн 2 screenshot-той тулгаж бүтээв. Хэдэн ч
// утас/имэйл/агуулах/зогсоол/машинтай байж болох тул давтагдах жагсаалт
// хэсгүүдийг (SimpleListField/SpotListField/VehicleListField) "Rule of
// two"-ийн дагуу тусад нь задалж, 5 газарт дахин ашиглав.

const BUILDING_OPTIONS = [101, 102, 103, 109];

function SectionTitle({ children }) {
  return (
    <div className="text-[11px] font-semibold text-slate-500 dark:text-mutedtext uppercase tracking-[0.4px] mb-3 mt-5 first:mt-0">
      {children}
    </div>
  );
}

function SimpleListField({ label, items, onChange, placeholder }) {
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

function SpotListField({ label, checked, onToggle, items, onChange, addLabel }) {
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

function VehicleListField({ checked, onToggle, items, onChange }) {
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

export default function EditOwnerModal({ open, onClose, owner, onSave }) {
  // 2026-08-15: owner нь одоо Supabase-ийн бодит мөр (snake_case багана)
  // — өмнө mock EXAMPLE_OWNERS-ийн бүтэц (building/phone/email г.м)
  // ашигладаг байсныг бодит DB талбарын нэртэй уялдуулав.
  const [form, setForm] = useState(() => {
    const cadastralPrefix = owner?.cadastral_no ? owner.cadastral_no.slice(0, 1) : 'A';
    const cadastralNo = owner?.cadastral_no ? owner.cadastral_no.slice(1) : '';
    return {
      buildingNo: owner?.building_no || BUILDING_OPTIONS[0],
      floor: owner?.floor ?? '',
      doorNo: owner?.door_no ?? '',
      sqm: owner?.sqm ?? '',
      firstname: owner?.firstname || '',
      lastname: owner?.lastname || '',
      regno: owner?.regno || '',
      ownDate: owner?.own_date || '',
      cadastralPrefix,
      cadastralNo,
      phones: owner?.phones?.length ? owner.phones : [''],
      emails: owner?.emails?.length ? owner.emails : [''],
      people: owner?.people_count ?? '',
      child1: owner?.child_0_5 ?? '',
      child2: owner?.child_6_18 ?? '',
      hasStorage: owner?.has_storage || false, storages: owner?.storages || [],
      hasParking: owner?.has_parking || false, parkings: owner?.parkings || [],
      hasVehicle: owner?.has_vehicle || false, vehicles: owner?.vehicles || [],
      note: owner?.note || '',
    };
  });

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={owner ? 'Сууц өмчлөгч засах' : 'Сууц өмчлөгч нэмэх'}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
          <button className="ds-btn-primary" onClick={() => onSave?.(form)}>Хадгалах</button>
        </>
      }
    >
      <SectionTitle>Тоотын мэдээлэл</SectionTitle>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Байр</label>
          <select className="ds-select w-full" value={form.buildingNo} onChange={(e) => set('buildingNo', e.target.value)}>
            {BUILDING_OPTIONS.map((b) => <option key={b} value={b}>{b}-р байр</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Давхар</label>
          <select className="ds-select w-full" value={form.floor} onChange={(e) => set('floor', e.target.value)}>
            {Array.from({ length: 9 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тоот</label>
          <select className="ds-select w-full" value={form.doorNo} onChange={(e) => set('doorNo', e.target.value)}>
            {Array.from({ length: 8 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Талбай (м²)</label>
        <input type="number" step="0.01" className="ds-input w-full" value={form.sqm} onChange={(e) => set('sqm', e.target.value)} />
      </div>

      <SectionTitle>Сууц өмчлөгчийн мэдээлэл</SectionTitle>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Нэр</label>
          <input className="ds-input w-full" value={form.firstname} onChange={(e) => set('firstname', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Овог</label>
          <input className="ds-input w-full" value={form.lastname} onChange={(e) => set('lastname', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Регистрийн дугаар</label>
          <input className="ds-input w-full" value={form.regno} onChange={(e) => set('regno', e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Өмчилсөн огноо</label>
        <input type="date" className="ds-input w-full" value={form.ownDate} onChange={(e) => set('ownDate', e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Өмчийн Улсын бүртгэлийн дугаар</label>
        <div className="flex gap-2">
          <input className="ds-input w-14 text-center" value={form.cadastralPrefix} onChange={(e) => set('cadastralPrefix', e.target.value)} />
          <input className="ds-input flex-1" placeholder="000000000000" value={form.cadastralNo} onChange={(e) => set('cadastralNo', e.target.value)} />
        </div>
      </div>

      <SimpleListField label="Утасны дугаар" items={form.phones} onChange={(v) => set('phones', v)} placeholder="99001122" />
      <SimpleListField label="Имэйл" items={form.emails} onChange={(v) => set('emails', v)} placeholder="email@example.com" />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Ам бүл</label>
          <input type="number" className="ds-input w-full" value={form.people} onChange={(e) => set('people', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">0-6 насны хүүхэд</label>
          <input type="number" className="ds-input w-full" value={form.child1} onChange={(e) => set('child1', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">6-18 насны хүүхэд</label>
          <input type="number" className="ds-input w-full" value={form.child2} onChange={(e) => set('child2', e.target.value)} />
        </div>
      </div>

      <SpotListField
        label="Зогсоол" checked={form.hasParking}
        onToggle={(v) => setForm((f) => ({ ...f, hasParking: v, parkings: v && f.parkings.length === 0 ? [{ floor: '', no: '' }] : f.parkings }))}
        items={form.parkings} onChange={(v) => set('parkings', v)} addLabel="+ Зогсоол нэмэх"
      />
      <SpotListField
        label="Агуулах" checked={form.hasStorage}
        onToggle={(v) => setForm((f) => ({ ...f, hasStorage: v, storages: v && f.storages.length === 0 ? [{ floor: '', no: '' }] : f.storages }))}
        items={form.storages} onChange={(v) => set('storages', v)} addLabel="+ Агуулах нэмэх"
      />
      <VehicleListField
        checked={form.hasVehicle}
        onToggle={(v) => setForm((f) => ({ ...f, hasVehicle: v, vehicles: v && f.vehicles.length === 0 ? [{ digits: '', letters: '' }] : f.vehicles }))}
        items={form.vehicles} onChange={(v) => set('vehicles', v)}
      />
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тайлбар</label>
        <textarea
          className="ds-input w-full resize-none"
          style={{ height: '52px' }}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>
    </Modal>
  );
}
