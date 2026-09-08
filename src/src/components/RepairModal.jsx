import { useState } from 'react';
import Modal from './Modal';

// 2026-09-08: "Засвар бүртгэх" модаль — хэрэглэгчийн зурган жишээтэй
// яг адил бүтэц (Хөрөнгө/Огноо/Үнэ/Тайлбар/Үйлчилгээ үзүүлэгч).
// 2026-09-08 (2): Огноо -> Эхэлсэн огноо + Дууссан огноо (хугацааны
// завсар). Тэмдэглэл: Дууссан огноо хоосон үлдэж болно (засвар
// үргэлжилж байгаа үед) — үүнийг activeRepairAssetIds (useAssetRepairs.js)
// "Засварт" тeлeв тооцоход ашиглана.
export default function RepairModal({ open, onClose, assets, onSave }) {
  const [assetId, setAssetId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [providerOrg, setProviderOrg] = useState('');

  function reset() {
    setAssetId('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setAmount(0);
    setDescription('');
    setProviderOrg('');
  }

  async function handleSave() {
    if (!assetId) { window.alert('Хөрөнгө сонгоно уу.'); return; }
    await onSave({ assetId, startDate, endDate, amount, description, providerOrg });
    reset();
  }

  return (
    <Modal open={open} onClose={onClose} title="Засвар бүртгэх" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="ds-btn-primary" onClick={handleSave}>Хадгалах</button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хөрөнгө</label>
          <select className="ds-select w-full" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            <option value="">— Сонгох —</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Эхэлсэн огноо</label>
            <input type="date" className="ds-input w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Дууссан огноо</label>
            <input type="date" className="ds-input w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Үнэ (₮)</label>
          <input type="number" min="0" step="any" className="ds-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тайлбар</label>
          <textarea className="ds-input w-full" rows={3} placeholder="Хийсэн ажлын тайлбар..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Үйлчилгээ үзүүлэгч байгууллага</label>
          <input className="ds-input w-full" placeholder="Байгууллагын нэр..." value={providerOrg} onChange={(e) => setProviderOrg(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
