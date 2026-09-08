import { useState } from 'react';
import Modal from './Modal';

// 2026-09-08: "Засвар бүртгэх" модаль — хэрэглэгчийн зурган жишээтэй
// яг адил бүтэц (Хөрөнгө/Огноо/үнэ/Тайлбар/үйлчилгээ үзүүлэгч).
export default function RepairModal({ open, onClose, assets, onSave }) {
  const [assetId, setAssetId] = useState('');
  const [repairDate, setRepairDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [providerOrg, setProviderOrg] = useState('');

  function reset() {
    setAssetId('');
    setRepairDate(new Date().toISOString().slice(0, 10));
    setAmount(0);
    setDescription('');
    setProviderOrg('');
  }

  async function handleSave() {
    if (!assetId) { window.alert('Хөрөнгө сонгоно уу.'); return; }
    await onSave({ assetId, repairDate, amount, description, providerOrg });
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
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Огноо</label>
            <input type="date" className="ds-input w-full" value={repairDate} onChange={(e) => setRepairDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">үнэ (₮)</label>
            <input type="number" min="0" step="any" className="ds-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тайлбар</label>
          <textarea className="ds-input w-full" rows={3} placeholder="Хийсэн ажлын тайлбар..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">үйлчилгээ үзүүлэгч байгууллага</label>
          <input className="ds-input w-full" placeholder="Байгууллагын нэр..." value={providerOrg} onChange={(e) => setProviderOrg(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
