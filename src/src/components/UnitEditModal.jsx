import { useState } from 'react';
import Modal from './Modal';

// AddressConfig.jsx-ийн grid tile дарахад нээгдэх "Тоотыг засах, нуух"
// модаль — screenshot-той тохирсон (Дугаарын бүтэц сонголт+Тоот дугаар+
// м²(нэг мөрөнд)+Нуух/Хадгалах). 2026-08-17 (4-р засвар): "Дугаарын
// бүтэц" (Байр+Давхар+Тоот / Байр+Орц+Тоот) dropdown нэмэв — энэ сонголт
// БАЙР ТУС БҮРД (энэ tile-ийн байранд харьяалагдах бүх мөрд) хамаарна.
export default function UnitEditModal({ unit, structureType, onStructureTypeChange, onClose, onSave, onHide, onUnhide }) {
  const [doorNo, setDoorNo] = useState(unit?.doorNo ?? '');
  const [sqm, setSqm] = useState(unit?.sqm ?? '');

  if (!unit) return null;

  return (
    <Modal open={!!unit} onClose={onClose} title="Дугаар олгох" size="sm">
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Дугаарын бүтэц</label>
        <select className="ds-select w-full" value={structureType} onChange={(e) => onStructureTypeChange(e.target.value)}>
          <option value="floor">Байр, Давхар, Тоот</option>
          <option value="entrance">Байр, Орц, Тоот</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тоот</label>
          <input className="ds-input w-full" value={doorNo} onChange={(e) => setDoorNo(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">м²</label>
          <input type="number" step="0.01" className="ds-input w-full" value={sqm} onChange={(e) => setSqm(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        {unit.hidden ? (
          <button className="ds-btn-secondary flex-1" onClick={() => onUnhide(unit.id)}>Ил болгох</button>
        ) : (
          <button className="ds-btn-secondary flex-1" onClick={() => onHide(unit.id)}>Нуух</button>
        )}
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
