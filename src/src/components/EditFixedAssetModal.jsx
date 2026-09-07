import { useEffect, useState } from 'react';
import Modal from './Modal';
import { supabase } from '../lib/supabaseClient';
import { UNIT_OPTIONS, FIXED_ASSET_STATUS } from '../lib/fixedAssetsFormat';

// FixedAssets.jsx-ийн Нэмэх/Засах модаль — EditClientModal.jsx-ийн
// бүтцийг дахин ашигласан (Rule of two). Шинээр нэмэх үед барcode-ыг
// next_fixed_asset_barcode() RPC-ээр автоматаар санал болгоно, гэхдээ
// хэрэглэгч гараар өөрчилж болно.
export default function EditFixedAssetModal({ open, onClose, asset, onSave, hoaId }) {
  const [form, setForm] = useState(() => ({
    barcode: asset?.barcode || '',
    name: asset?.name || '',
    markSerial: asset?.mark_serial || '',
    category: asset?.category || '',
    qty: asset?.qty ?? 1,
    unit: asset?.unit || 'ширхэг',
    acquiredDate: asset?.acquired_date || '',
    purchasePrice: asset?.purchase_price ?? 0,
    accumulatedDepreciation: asset?.accumulated_depreciation ?? 0,
    location: asset?.location || '',
    responsiblePerson: asset?.responsible_person || '',
    status: asset?.status || 'in_use',
    note: asset?.note || '',
  }));

  useEffect(() => {
    if (!open || asset) return; // зөвхөн шинээр нэмэх үед л автомат barcode санал болгоно
    supabase.rpc('next_fixed_asset_barcode', { p_tenant_id: hoaId }).then(({ data }) => {
      if (data) setForm((f) => ({ ...f, barcode: f.barcode || data }));
    });
  }, [open, asset, hoaId]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.barcode.trim()) {
      window.alert('БАРКОД болон НЭР талбарыг заавал бөглөнө үү.');
      return;
    }
    onSave(form);
  }

  return (
    <Modal open={open} onClose={onClose} title={asset ? 'Хөрөнгийн мэдээлэл засах' : 'Хөрөнгө нэмэх'} size="md" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="ds-btn-primary" onClick={handleSubmit}>Хадгалах</button>
      </>
    }>
      <form className="grid grid-cols-2 gap-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Баркод</label>
          <input className="ds-input w-full" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Нэр, брэнд</label>
          <input className="ds-input w-full" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Марк/Сериал</label>
          <input className="ds-input w-full" value={form.markSerial} onChange={(e) => set('markSerial', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Төрөл</label>
          <input className="ds-input w-full" value={form.category} onChange={(e) => set('category', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тоо хэмжээ</label>
          <div className="flex gap-2">
            <input type="number" min="0" step="any" className="ds-input w-full" value={form.qty} onChange={(e) => set('qty', e.target.value)} />
            <select className="ds-select" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
              {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Авсан огноо</label>
          <input type="date" className="ds-input w-full" value={form.acquiredDate} onChange={(e) => set('acquiredDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Худалдан авсан үнэ</label>
          <input type="number" min="0" step="any" className="ds-input w-full" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хуримтлагдсан элэгдэл</label>
          <input type="number" min="0" step="any" className="ds-input w-full" value={form.accumulatedDepreciation} onChange={(e) => set('accumulatedDepreciation', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Байршил</label>
          <input className="ds-input w-full" value={form.location} onChange={(e) => set('location', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хариуцагч</label>
          <input className="ds-input w-full" value={form.responsiblePerson} onChange={(e) => set('responsiblePerson', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Төлөв</label>
          <select className="ds-select w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {Object.entries(FIXED_ASSET_STATUS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тайлбар</label>
          <textarea className="ds-input w-full" rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
