import { useState } from 'react';
import Modal from './Modal';

// "Харилцагчийн бvртгэл" (/providers) хуудасны Нэмэх/Засах модаль —
// 2026-08-19 хэрэглэгчийн screenshot-оор өгсөн бvтэц (EditClientModal.jsx-
// ийн загварыг дахин ашигласан, Rule of two) + шинэ "Банк+Данс" хэсэг
// (Монголын банкны харилцахын дансны бvтэц: [Банк][IBAN#][Данс]).
const BANKS = [
  'Хаан банк',
  'Голомт банк',
  'Худалдаа хүгжлийн банк (ХХБ)',
  'Төрийн банк',
  'Капитрон банк',
  'Богд банк',
  'Ард банк',
  'Ариг банк',
  'Чингис Хаан банк',
  'М банк',
  'Тээвэр хөгжлийн банк',
  'Үндэсний хөрөнгө оруулалтын банк',
  'Бусад',
];

export default function EditProviderModal({ open, onClose, provider, onSave }) {
  const [form, setForm] = useState(() => ({
    legalEntityName: provider?.legal_entity_name || '',
    certificateNo: provider?.certificate_no || '',
    ceoName: provider?.ceo_name || '',
    mobile: provider?.mobile || '',
    phone: provider?.phone || '',
    email: provider?.email || '',
    contractNo: provider?.contract_no || '',
    contractStart: provider?.contract_start || '',
    contractEnd: provider?.contract_end || '',
    bankName: provider?.bank_name || '',
    bankIban: provider?.bank_iban || '',
    bankAccount: provider?.bank_account || '',
    note: provider?.note || '',
  }));

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={provider ? 'Харилцагч засах' : 'Харилцагч нэмэх'}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
          <button className="ds-btn-primary" onClick={() => onSave?.(form)}>Хадгалах</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хуулийн этгээдийн нэр</label>
          <input className="ds-input w-full" value={form.legalEntityName} onChange={(e) => set('legalEntityName', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гэрчилгээ №</label>
          <input className="ds-input w-full" value={form.certificateNo} onChange={(e) => set('certificateNo', e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гүйцэтгэх удирдлага</label>
        <input className="ds-input w-full" placeholder="Овог Нэр" value={form.ceoName} onChange={(e) => set('ceoName', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гар утас</label>
          <input className="ds-input w-full" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Утас</label>
          <input className="ds-input w-full" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Мэйл</label>
        <input className="ds-input w-full" placeholder="info@company.mn" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гэрээ №</label>
        <input className="ds-input w-full" placeholder="СүХ-2026-001" value={form.contractNo} onChange={(e) => set('contractNo', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гэрээ эхлэх</label>
          <input type="date" className="ds-input w-full" value={form.contractStart} onChange={(e) => set('contractStart', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гэрээ дуусах</label>
          <input type="date" className="ds-input w-full" value={form.contractEnd} onChange={(e) => set('contractEnd', e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Банк, дансны мэдээлэл</label>
        <div className="grid grid-cols-3 gap-2">
          <select className="ds-select w-full" value={form.bankName} onChange={(e) => set('bankName', e.target.value)}>
            <option value="">Банк сонгох</option>
            {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <input className="ds-input w-full" placeholder="IBAN#" value={form.bankIban} onChange={(e) => set('bankIban', e.target.value)} />
          <input className="ds-input w-full" placeholder="Дансны дугаар" value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тэмдэглэл</label>
        <textarea
          className="ds-input w-full resize-none"
          style={{ height: '80px' }}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>
    </Modal>
  );
}
