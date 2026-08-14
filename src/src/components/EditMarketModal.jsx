import { useState } from 'react';
import Modal from './Modal';
import { RENTAL_LABELS } from '../data/realEstateMarket';

// "Сарын үнэ оруулах" модаль — хэрэглэгчийн screenshot-д заасан загвар:
// Он/Сар сонголт + Орон сууц/Агуулах/Зогсоолын борлуулалт+түрээслэх үнэ.
// EditOwnerModal.jsx-тэй ЯГ АДИЛ логик (row=null → "Сар нэмэх" горим,
// row={object} → "Сарын үнэ засах" горим, НЭГ компонент 2 горимд) —
// Rule of two-гоор дахин ашиглав.

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function SectionTitle({ children }) {
  return (
    <div className="text-[11px] font-semibold text-slate-500 dark:text-mutedtext uppercase tracking-[0.4px] mb-3 mt-5 first:mt-0">
      {children}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">{label}</label>
      <input type="number" className="ds-input w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function EditMarketModal({ open, onClose, row, onSave }) {
  const now = new Date();
  const [year, setYear] = useState(row ? Number(row.month.split('/')[0]) : now.getFullYear());
  const [month, setMonth] = useState(row ? Number(row.month.split('/')[1]) : now.getMonth() + 1);
  const [form, setForm] = useState(() => ({
    residentialSale: row?.residentialSale ?? '',
    rental: row ? [...row.rental] : ['', '', '', '', '', ''],
    storageSale: row?.storageSale ?? '',
    storageRental: row?.storageRental ?? '',
    parkingSale: row?.parkingSale ?? '',
    parkingRental: row?.parkingRental ?? '',
  }));

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }
  function setRental(i, val) {
    setForm((f) => {
      const rental = [...f.rental];
      rental[i] = val;
      return { ...f, rental };
    });
  }

  function handleSave() {
    const monthStr = `${year}/${String(month).padStart(2, '0')}`;
    onSave?.({
      month: monthStr,
      residentialSale: Number(form.residentialSale) || 0,
      rental: form.rental.map((v) => Number(v) || 0),
      storageSale: Number(form.storageSale) || 0,
      storageRental: Number(form.storageRental) || 0,
      parkingSale: Number(form.parkingSale) || 0,
      parkingRental: Number(form.parkingRental) || 0,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={row ? 'Сарын үнэ засах' : 'Сарын үнэ оруулах'}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
          <button className="ds-btn-primary" onClick={handleSave}>Хадгалах</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Он</label>
          <select className="ds-select w-full" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Сар</label>
          <select className="ds-select w-full" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}-р сар</option>)}
          </select>
        </div>
      </div>

      <SectionTitle>Орон сууц</SectionTitle>
      <div className="mb-3">
        <Field label="Борлуулалтын үнэ (₮/м²)" value={form.residentialSale} onChange={(v) => set('residentialSale', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {RENTAL_LABELS.map((label, i) => (
          <Field key={label} label={`${label} түрээс (₮/сар)`} value={form.rental[i]} onChange={(v) => setRental(i, v)} />
        ))}
      </div>

      <SectionTitle>Агуулах</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Field label="Борлуулалтын үнэ (₮)" value={form.storageSale} onChange={(v) => set('storageSale', v)} />
        <Field label="Түрээслэх үнэ (₮/сар)" value={form.storageRental} onChange={(v) => set('storageRental', v)} />
      </div>

      <SectionTitle>Зогсоол</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Борлуулалтын үнэ (₮)" value={form.parkingSale} onChange={(v) => set('parkingSale', v)} />
        <Field label="Түрээслэх үнэ (₮/сар)" value={form.parkingRental} onChange={(v) => set('parkingRental', v)} />
      </div>
    </Modal>
  );
}
