import { useState } from 'react';
import Modal from './Modal';
import { PLANS } from '../data/plans';

// TenantStatus.jsx-ийн "Үйлдэл→Засах" товч дарахад нээгдэх — tenant-ийн
// үндсэн мэдээллийг (СӨХ-ны нэр/регистр/татвар/имэйл/утас/багц) засварлана.
export default function EditTenantModal({ tenant, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: tenant?.name || '',
    registrationNo: tenant?.registration_no || '',
    taxPayerNo: tenant?.tax_payer_no || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    planKey: tenant?.plan_key || PLANS[0].key,
  }));
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    await onSave(tenant.id, {
      name: form.name,
      registration_no: form.registrationNo || null,
      tax_payer_no: form.taxPayerNo || null,
      email: form.email || null,
      phone: form.phone || null,
      plan_key: form.planKey,
    });
    setSaving(false);
  }

  return (
    <Modal
      open={!!tenant}
      onClose={onClose}
      title="СӨХ засах"
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
          <button className="ds-btn-primary" onClick={handleSubmit} disabled={saving}>Хадгалах</button>
        </>
      }
    >
      <div className="mb-3.5">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">СӨХ-ны нэр</label>
        <input className="ds-input w-full" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Регистрийн дугаар</label>
          <input className="ds-input w-full" value={form.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Татвар төлөгчийн дугаар</label>
          <input className="ds-input w-full" value={form.taxPayerNo} onChange={(e) => set('taxPayerNo', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Имэйл</label>
          <input className="ds-input w-full" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Холбоо барих утас</label>
          <input className="ds-input w-full" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="mb-1">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Багц</label>
        <select className="ds-select w-full" value={form.planKey} onChange={(e) => set('planKey', e.target.value)}>
          {PLANS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
        </select>
      </div>
    </Modal>
  );
}
