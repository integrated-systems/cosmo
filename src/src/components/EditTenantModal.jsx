import { useState } from 'react';
import Modal from './Modal';
import { PLANS } from '../data/plans';
import { supabase } from '../lib/supabaseClient';

// TenantStatus.jsx-ийн "Үйлдэл→Засах" товч дарахад нээгдэх — tenant-ийн
// үндсэн мэдээллийг (СӨХ-ны нэр/регистр/татвар/имэйл/утас/багц) засварлана.
// 2026-08-16: "Админ солих" (өөр бүртгэлтэй хэрэглэгчид tenant_admin role
// шилжүүлэх, RPC) + "Нууц үг сэргээх линк илгээх" (одоогийн админд
// Supabase-аар сэргээх имэйл явуулна — нууц үгийг ХЭЗЭЭ Ч харуулахгүй/
// шилжүүлэхгүй, зөвхөн эрх+нэвтрэх боломж шилждэг) 2 үйлдэл нэмэв.
export default function EditTenantModal({ tenant, adminEmail, onClose, onSave, onAdminChanged }) {
  const [form, setForm] = useState(() => ({
    name: tenant?.name || '',
    registrationNo: tenant?.registration_no || '',
    taxPayerNo: tenant?.tax_payer_no || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    planKey: tenant?.plan_key || PLANS[0].key,
  }));
  const [saving, setSaving] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');

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

  async function handleReassign() {
    if (!newAdminEmail.trim()) return;
    setReassigning(true);
    setAdminMsg('');
    const { error } = await supabase.rpc('reassign_tenant_admin', {
      p_tenant_id: tenant.id,
      p_new_admin_email: newAdminEmail.trim(),
    });
    setReassigning(false);
    if (error) {
      setAdminMsg(error.message);
      return;
    }
    setAdminMsg('Админ амжилттай сольсон.');
    supabase.rpc('log_audit_event', { p_tenant_id: tenant.id, p_action: 'reassign_admin', p_details: { new_admin_email: newAdminEmail.trim() }, p_target_name: tenant.name });
    setNewAdminEmail('');
    onAdminChanged?.();
  }

  async function handleResetLink() {
    if (!adminEmail) return;
    setResetSending(true);
    setAdminMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(adminEmail, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    });
    setResetSending(false);
    setAdminMsg(error ? error.message : `Нууц үг сэргээх линк ${adminEmail}-рүү илгээгдлээ.`);
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
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Багц</label>
        <select className="ds-select w-full" value={form.planKey} onChange={(e) => set('planKey', e.target.value)}>
          {PLANS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
        </select>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-bordercol">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-mutedtext mb-2 uppercase tracking-[.04em]">Одоогийн админ: {adminEmail || '—'}</div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="email" placeholder="Шинэ админы имэйл (аль хэдийн бүртгэлтэй)"
            className="ds-input flex-1" value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
          />
          <button className="ds-btn-secondary shrink-0" onClick={handleReassign} disabled={reassigning || !newAdminEmail.trim()}>
            Солих
          </button>
        </div>
        <button className="ds-btn-secondary" onClick={handleResetLink} disabled={resetSending || !adminEmail}>
          Нууц үг сэргээх линк илгээх
        </button>
        {adminMsg && <div className="mt-2 text-xs text-mutedtext">{adminMsg}</div>}
      </div>
    </Modal>
  );
}
