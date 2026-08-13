import { useState } from 'react';
import Modal from './Modal';

// suh.html-ийн загварт тулгуурласан "Сууц өмчлөгч засах" модал —
// 2026-08-13 хэрэглэгчийн өгсөн 2 screenshot-той тулгаж бүтээв. Хэдэн ч
// утас/имэйл/агуулах/зогсоол/машинтай байж болох тул давтагдах жагсаалт
// хэсгүүдийг (SimpleListField/SpotListField/VehicleListField) "Rule of
// two"-ийн дагуу тусад нь задалж, 5 газарт дахин ашиглав.

const BUILDING_OPTIONS = [101, 102, 103, 109];

function SectionTitle({ icon, children }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-mutedtext uppercase tracking-[0.4px] mb-3 mt-5 first:mt-0">
      {icon}
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
        <label className="text-[11px] text-slate-500 dark:text-mutedtext uppercase tracking-[0.4px]">{label}</label>
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
        Автомашин
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

const HomeIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const UserIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

export default function EditOwnerModal({ open, onClose, owner, onSave }) {
  const [form, setForm] = useState(() => ({
    buildingNo: owner?.building || BUILDING_OPTIONS[0],
    floor: '',
    doorNo: '',
    firstname: owner?.firstname || '',
    lastname: owner?.lastname || '',
    regno: '',
    ownDate: owner?.ownDate || '',
    cadastralPrefix: 'A',
    cadastralNo: '',
    phones: owner?.phone ? [owner.phone] : [''],
    emails: owner?.email ? [owner.email] : [''],
    people: owner?.people || '',
    child1: owner?.child1 || '',
    child2: owner?.child2 || '',
    hasStorage: false, storages: [],
    hasParking: false, parkings: [],
    hasVehicle: false, vehicles: [],
  }));

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={owner ? 'Сууц өмчлөгч засах' : 'Сууц өмчлөгч нэмэх'}
      size="lg"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
          <button className="ds-btn-primary" onClick={() => onSave?.(form)}>Хадгалах</button>
        </>
      }
    >
      <SectionTitle icon={HomeIcon}>Тоотын мэдээлэл</SectionTitle>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Байр дугаар</label>
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
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хаалга дугаар</label>
          <select className="ds-select w-full" value={form.doorNo} onChange={(e) => set('doorNo', e.target.value)}>
            {Array.from({ length: 8 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <SectionTitle icon={UserIcon}>Сууц өмчлөгчийн мэдээлэл</SectionTitle>
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

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">өмчилсөн огноо</label>
          <input type="date" className="ds-input w-full" value={form.ownDate} onChange={(e) => set('ownDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">өмчийн Улсын бүртгэлийн дугаар</label>
          <div className="flex gap-2">
            <input className="ds-input w-14 text-center" value={form.cadastralPrefix} onChange={(e) => set('cadastralPrefix', e.target.value)} />
            <input className="ds-input flex-1" placeholder="000000000000" value={form.cadastralNo} onChange={(e) => set('cadastralNo', e.target.value)} />
          </div>
        </div>
      </div>

      <SimpleListField label="Утасны дугаар" items={form.phones} onChange={(v) => set('phones', v)} placeholder="99001122" />
      <SimpleListField label="И-мэйл" items={form.emails} onChange={(v) => set('emails', v)} placeholder="email@example.com" />

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
        label="Агуулах" checked={form.hasStorage}
        onToggle={(v) => setForm((f) => ({ ...f, hasStorage: v, storages: v && f.storages.length === 0 ? [{ floor: '', no: '' }] : f.storages }))}
        items={form.storages} onChange={(v) => set('storages', v)} addLabel="+ Агуулах нэмэх"
      />
      <SpotListField
        label="Зогсоол" checked={form.hasParking}
        onToggle={(v) => setForm((f) => ({ ...f, hasParking: v, parkings: v && f.parkings.length === 0 ? [{ floor: '', no: '' }] : f.parkings }))}
        items={form.parkings} onChange={(v) => set('parkings', v)} addLabel="+ Зогсоол нэмэх"
      />
      <VehicleListField
        checked={form.hasVehicle}
        onToggle={(v) => setForm((f) => ({ ...f, hasVehicle: v, vehicles: v && f.vehicles.length === 0 ? [{ digits: '', letters: '' }] : f.vehicles }))}
        items={form.vehicles} onChange={(v) => set('vehicles', v)}
      />
    </Modal>
  );
}
