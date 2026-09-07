import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { supabase } from '../lib/supabaseClient';
import { UNIT_OPTIONS, DEPRECIATION_METHODS } from '../lib/fixedAssetsFormat';
import { computeStraightLineDepreciation, computeAcceleratedDepreciation } from '../lib/depreciation';
import { formatMoney, formatDate } from '../lib/format';
import { useFixedAssetConfig } from '../hooks/useFixedAssetConfig';

// FixedAssets.jsx-ийн Нэмэх/Засах модаль — 2026-09-07 (2) хэрэглэгчийн
// өгсөн "suh" прототипийн зурган жишээгээр ДАХИН ЗОХИОВ (өмнөх энгийн
// хувилбарыг бүрэн орлов): Ангилал/Терел/Байршил FixedAssetConfig.jsx-
// ийн лавлах хүснэгэлүүдээс dropdown-оор сонгогдоно, Терел сонгосон
// Ангилалаараа шүүгдэнэ. Элэгдлийн тооцоолол (Шугаман/Хурдасгасан)
// нь src/lib/depreciation.js-ээс амьд (live) тооцоологдож харагдана —
// хадгалахаас өмнө хэрэглэгч үр дүнг шууд харна.
//
// НЭГ АНХААРУУЛГА (шинэчлэгдсэн 2026-09-07 (4)): "Хөрөнгийн хариуцагч"
// одоо Санхүүгийн тохиргоо → НББ → Албан тушаал жагсаалтаас dropdown-
// оор сонгогдоно (job_positions хүснэгэл) — хэрэглэгчийн шийдвэрийн
// дагуу "хариуцагч" бол тодорхой нэг хүн БИШ, харьяалагдах АЛБАН
// ТУШААЛ. Баркод нь {СӨХ-ны регистрийн дугаар}-{дэс дугаар} хэлбэрээр
// next_fixed_asset_barcode() RPC-ээр автоматаар үүсгэгдэж, үүсгэсний
// дараа ФИЗИК ШОШГО хэвлэгдсэн байж болзошгүй тул readonly (өөрчлөгдөхгүй).
export default function EditFixedAssetModal({ open, onClose, asset, onSave, hoaId }) {
  const { categories, types, locations, loading: configLoading } = useFixedAssetConfig(hoaId);
  const [jobPositions, setJobPositions] = useState([]);

  useEffect(() => {
    if (!hoaId) return;
    supabase.from('job_positions').select('id, name').eq('tenant_id', hoaId).order('sort_order').then(({ data }) => {
      setJobPositions(data || []);
    });
  }, [hoaId]);

  const [form, setForm] = useState(() => ({
    barcode: asset?.barcode || '',
    name: asset?.name || '',
    markSerial: asset?.mark_serial || '',
    categoryId: asset?.category_id || '',
    typeId: asset?.type_id || '',
    qty: asset?.qty ?? 1,
    unit: asset?.unit || 'ширхэг',
    acquiredDate: asset?.acquired_date || '',
    purchasePrice: asset?.purchase_price ?? 0,
    sellerOrg: asset?.seller_org || '',
    locationId: asset?.location_id || '',
    responsiblePerson: asset?.responsible_person || '',
    note: asset?.note || '',
    usefulLifeMonths: asset?.useful_life_months ?? '',
    depreciationMethod: asset?.depreciation_method || 'straight_line',
    salvageValue: asset?.salvage_value ?? 0,
    annualDepreciationRate: asset?.annual_depreciation_rate ?? 20,
    status: asset?.status || 'in_use',
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

  function handleCategoryChange(categoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    setForm((f) => ({
      ...f,
      categoryId,
      typeId: types.some((t) => t.id === f.typeId && t.category_id === categoryId) ? f.typeId : '',
      usefulLifeMonths: cat ? cat.default_useful_life_months : f.usefulLifeMonths,
      depreciationMethod: cat ? cat.default_depreciation_method : f.depreciationMethod,
    }));
  }

  const typesForCategory = useMemo(
    () => types.filter((t) => t.category_id === form.categoryId),
    [types, form.categoryId]
  );

  // "Газар" гэх мэт ЭЛЭГДЭХГүй терел сонгогдсон үед элэгдлийн бүх
  // тооцооллыг нуух (2026-09-07 (6), Rule of two — is_depreciable
  // flag ганцхан газраас, fixed_asset_types-с ирнэ).
  const selectedType = useMemo(() => types.find((t) => t.id === form.typeId), [types, form.typeId]);
  const isDepreciable = selectedType ? selectedType.is_depreciable !== false : true;

  const disposalDate = useMemo(() => {
    if (!form.acquiredDate || !form.usefulLifeMonths) return null;
    const d = new Date(form.acquiredDate);
    d.setMonth(d.getMonth() + Number(form.usefulLifeMonths));
    return d;
  }, [form.acquiredDate, form.usefulLifeMonths]);

  const straightLine = computeStraightLineDepreciation({
    purchasePrice: form.purchasePrice,
    salvageValue: form.salvageValue,
    usefulLifeMonths: form.usefulLifeMonths,
    acquiredDate: form.acquiredDate,
  });
  const accelerated = computeAcceleratedDepreciation({
    purchasePrice: form.purchasePrice,
    salvageValue: form.salvageValue,
    annualDepreciationRate: form.annualDepreciationRate,
    acquiredDate: form.acquiredDate,
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.barcode.trim()) {
      window.alert('Хөрөнгийн нэр болон баркод талбарыг заавал бөглөнө үү.');
      return;
    }
    onSave({ ...form, isDepreciable });
  }

  return (
    <Modal open={open} onClose={onClose} title={asset ? 'Хөрөнгийн бүртгэл засах' : 'Хөрөнгийн бүртгэл нэмэх'} size="lg" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="ds-btn-primary" onClick={handleSubmit}>Хадгалах</button>
      </>
    }>
      <form className="grid grid-cols-2 gap-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хөрөнгийн нэр, брэнд</label>
          <input className="ds-input w-full" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хөрөнгийн марк, сериал, баркод</label>
          <input className="ds-input w-full" value={form.markSerial} onChange={(e) => set('markSerial', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Баркод (СӨХ-ны регистрийн дугаар дээр үндэслэн автоматаар үүсгэгдэнэ, өөрчлөгдөхгүй)</label>
          <input className="ds-input w-full opacity-70" readOnly value={form.barcode || '— үүсгэж байна —'} />
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хөрөнгийн ангилал</label>
          <select className="ds-select w-full" value={form.categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>
            <option value="">— Ангилал сонгох —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хөрөнгийн төрөл</label>
          <select className="ds-select w-full" value={form.typeId} onChange={(e) => set('typeId', e.target.value)} disabled={!form.categoryId}>
            <option value="">— Төрөл сонгох —</option>
            {typesForCategory.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
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
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Худалдан авсан огноо</label>
          <input type="date" className="ds-input w-full" value={form.acquiredDate} onChange={(e) => set('acquiredDate', e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Худалдан авсан үнэ (₮)</label>
          <input type="number" min="0" step="any" className="ds-input w-full" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Борлуулагч байгууллага</label>
          <input className="ds-input w-full" placeholder="Байгууллагын нэр..." value={form.sellerOrg} onChange={(e) => set('sellerOrg', e.target.value)} />
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хөрөнгийн байршил</label>
          <select className="ds-select w-full" value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
            <option value="">— Байршил сонгох —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хөрөнгийн хариуцагч</label>
          <select className="ds-select w-full" value={form.responsiblePerson} onChange={(e) => set('responsiblePerson', e.target.value)}>
            <option value="">— Албан тушаал сонгох —</option>
            {jobPositions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тэмдэглэл</label>
          <textarea className="ds-input w-full" rows={2} placeholder="Хөрөнгийн техник үзүүлэлт, хүчин чадал, шинж чанар гэх мэт дэлгэрэнгүй мэдээллийг оруулах" value={form.note} onChange={(e) => set('note', e.target.value)} />
        </div>

        <div className="col-span-2 pt-2 mt-1 border-t border-slate-200 dark:border-bordercol text-[11px] font-semibold tracking-wide text-mutedtext uppercase">
          Элэгдлийн тооцоолол
        </div>

        {!isDepreciable ? (
          <div className="col-span-2 text-[12px] text-mutedtext ds-card p-3">
            "{selectedType?.name}" төрөл элэгддэггүй хөрөнгө тул элэгдлийн тооцоолол хийгдэхгүй. Дансны үлдэгдэл үнэ = Худалдан авсан үнэ хэвээр байнга үлдэнэ.
          </div>
        ) : (
          <>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Ашиглах хугацаа (сараар)</label>
              <input type="number" min="0" step="1" className="ds-input w-full" value={form.usefulLifeMonths} onChange={(e) => set('usefulLifeMonths', e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Элэгдэл тооцох аргачлал</label>
              <select className="ds-select w-full" value={form.depreciationMethod} onChange={(e) => set('depreciationMethod', e.target.value)}>
                {Object.entries(DEPRECIATION_METHODS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>

            {form.depreciationMethod === 'accelerated' && (
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Жилийн элэгдлийн хувь (%)</label>
                <input type="number" min="0" max="100" step="any" className="ds-input w-full" value={form.annualDepreciationRate} onChange={(e) => set('annualDepreciationRate', e.target.value)} />
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Ашиглалтаас гарах огноо</label>
              <input type="text" className="ds-input w-full opacity-70" readOnly value={disposalDate ? formatDate(disposalDate) : '—'} />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Үлдэгдэл үнэ (Ашиглалт дуусахад, ₮)</label>
              <input type="number" min="0" step="any" className="ds-input w-full" value={form.salvageValue} onChange={(e) => set('salvageValue', e.target.value)} />
            </div>

            <div className="col-span-2 text-[11px] font-semibold tracking-wide text-mutedtext uppercase mt-1">
              Хоёр аргын харьцуулсан нарийвчилсан тооцоолол
            </div>
            <div className="ds-card p-3">
              <div className="text-[12px] font-semibold text-customBlue mb-1.5">Шугаман элэгдэл</div>
              <div className="text-[11.5px] text-slate-600 dark:text-mutedtext space-y-0.5">
                <div>Сарын элэгдэл: <span className="text-slate-900 dark:text-white font-medium">{formatMoney(straightLine.monthly)}₮</span></div>
                <div>1 жилийн элэгдэл: <span className="text-slate-900 dark:text-white font-medium">{formatMoney(straightLine.yearly)}₮</span></div>
                <div>Хуримтлагдсан элэгдэл (өнөөдрийг хүртэл): <span className="text-slate-900 dark:text-white font-medium">{formatMoney(straightLine.accumulated)}₮</span></div>
                <div>Дансны үлдэгдэл үнэ: <span className="text-customGreen font-semibold">{formatMoney(straightLine.bookValue)}₮</span></div>
              </div>
            </div>
            <div className="ds-card p-3">
              <div className="text-[12px] font-semibold text-customOrange mb-1.5">Хурдасгасан элэгдэл</div>
              <div className="text-[11.5px] text-slate-600 dark:text-mutedtext space-y-0.5">
                <div>1-р сарын элэгдэл: <span className="text-slate-900 dark:text-white font-medium">{formatMoney(accelerated.firstMonth)}₮</span></div>
                <div>1 жилийн элэгдэл: <span className="text-slate-900 dark:text-white font-medium">{formatMoney(accelerated.yearly)}₮</span></div>
                <div>Хуримтлагдсан элэгдэл (өнөөдрийг хүртэл): <span className="text-slate-900 dark:text-white font-medium">{formatMoney(accelerated.accumulated)}₮</span></div>
                <div>Дансны үлдэгдэл үнэ: <span className="text-customGreen font-semibold">{formatMoney(accelerated.bookValue)}₮</span></div>
              </div>
            </div>
          </>
        )}

        {configLoading && <div className="col-span-2 text-[11px] text-mutedtext">Лавлах жагсаалт ачаалж байна...</div>}
      </form>
    </Modal>
  );
}
