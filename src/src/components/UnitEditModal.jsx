import { useState } from 'react';
import Modal from './Modal';

// AddressConfig.jsx-ийн grid tile дарахад нээгдэх "Тоотыг засах, нуух"
// модаль — screenshot-той тохирсон (Тоот дугаар+м²+Нуух/Хадгалах).
export default function UnitEditModal({ unit, onClose, onSave, onHide }) {
  const [doorNo, setDoorNo] = useState(unit?.doorNo ?? '');
  const [sqm, setSqm] = useState(unit?.sqm ?? '');

  if (!unit) return null;

  return (
    <Modal open={!!unit} onClose={onClose} title="Дугаар олгох" size="sm">
      <div className="mb-3.5">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тоот</label>
        <input className="ds-input w-full" value={doorNo} onChange={(e) => setDoorNo(e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">м²</label>
        <input type="number" step="0.01" className="ds-input w-full" value={sqm} onChange={(e) => setSqm(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="ds-btn-secondary flex-1" onClick={() => onHide(unit.id)}>Нуух</button>
        <button
          className="ds-btn-primary flex-1"
          onClick={() => onSave(unit.id, { doorNo, sqm: sqm === '' ? null : Number(sqm) })}
        >
          Хадгалах
        </button>
      </div>
    </Modal>
  );
}
