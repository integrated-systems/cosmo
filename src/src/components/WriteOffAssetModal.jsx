import { useState } from 'react';
import Modal from './Modal';

// 2026-09-07 (9): "Хөрөнгө актлах" модаль — AssetInfoModal-ийн
// "Актлах" товчоор дуудагдана. Хадгалахад status='written_off' болж,
// write_off_date/reason/amount бичигдэнэ.
const REASONS = ['Эвдэрсэн', 'Худалдсан', 'Хандивласан', 'Хуучирсан', 'Бусад'];

export default function WriteOffAssetModal({ open, onClose, asset, onConfirm }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Эвдэрсэн');
  const [amount, setAmount] = useState(0);

  if (!asset) return null;

  function handleConfirm() {
    onConfirm({ writeOffDate: date, writeOffReason: reason, writeOffAmount: amount !== '' ? Number(amount) : 0 });
  }

  return (
    <Modal open={open} onClose={onClose} title="Хөрөнгө актлах" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="bg-customRed hover:opacity-90 text-white text-xs px-3 py-1.5 rounded font-medium transition-opacity" onClick={handleConfirm}>Актлах</button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Актласан огноо</label>
          <input type="date" className="ds-input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Шалтгаан</label>
          <select className="ds-select w-full" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Актласан үнэ / орлого (₮) (хэрэв худалдсан бол)</label>
          <input type="number" min="0" step="any" className="ds-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
