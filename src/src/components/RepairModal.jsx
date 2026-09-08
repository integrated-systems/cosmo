import { useEffect, useState } from 'react';
import Modal from './Modal';
import MoneyInput from './MoneyInput';

// 2026-09-08: "Засвар бүртгэх" модаль — хэрэглэгчийн зурган жишээтэй
// яг адил бүтэц (Хөрөнгө/Огноо/Үнэ/Тайлбар/Үйлчилгээ үзүүлэгч).
// 2026-09-08 (2): Огноо -> Эхэлсэн огноо + Дууссан огноо (хугацааны
// завсар). Тэмдэглэл: Дууссан огноо хоосон үлдэж болно (засвар
// үргэлжилж байгаа үед) — үүнийг activeRepairAssetIds (useAssetRepairs.js)
// "Засварт" тeлeв тооцоход ашиглана.
// 2026-09-08 (3): Хэрэглэгчийн заасны дагуу:
//   - "Үнэ (₮)" талбар MoneyInput ашиглаж 0.00₮ форматтай харагдана
//   - "Хөрөнгө" dropdown (мянга мянган мвр үед ашиглах боломжгүй
//     болдог асуудалтай байсан) -> нэр/бүртгэлийн дугаараар шүүгддэг
//     хайлтын combobox (AssetSearchCombobox) болов
// 2026-09-08 (4): Капиталжуулах засвар (хөрөнгийн үнэ цэнэ/ашиглах
// хугацааг нэмэгдүүлдэг том засвар — жиш дээвэр солих, дулаалга)
// чекбокс нэмэв. Тэмдэглэвэл үнэ дүн fixed_assets.capitalized_amount-д
// нэмэгдэж, сунгах сар зааж үгвэл useful_life_months-д ч нэмэгдэнэ
// (useAssetRepairs.js харна уу).
export default function RepairModal({ open, onClose, assets, onSave }) {
  const [assetId, setAssetId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [providerOrg, setProviderOrg] = useState('');
  const [isCapitalized, setIsCapitalized] = useState(false);
  const [extendMonths, setExtendMonths] = useState('');

  function reset() {
    setAssetId('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setAmount(0);
    setDescription('');
    setProviderOrg('');
    setIsCapitalized(false);
    setExtendMonths('');
  }

  async function handleSave() {
    if (!assetId) { window.alert('Хөрөнгө сонгоно уу.'); return; }
    await onSave({ assetId, startDate, endDate, amount, description, providerOrg, isCapitalized, extendMonths });
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
          <AssetSearchCombobox assets={assets} value={assetId} onChange={setAssetId} />
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
          <MoneyInput value={amount} onChange={setAmount} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тайлбар</label>
          <textarea className="ds-input w-full" rows={3} placeholder="Хийсэн ажлын тайлбар..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Үйлчилгээ үзүүлэгч байгууллага</label>
          <input className="ds-input w-full" placeholder="Байгууллагын нэр..." value={providerOrg} onChange={(e) => setProviderOrg(e.target.value)} />
        </div>

        <div className="ds-card p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isCapitalized} onChange={(e) => setIsCapitalized(e.target.checked)} />
            <span className="text-[12px] font-medium">Капитал засвар (хөрөнгийн үнэ цэнэ/ашиглах хугацааг нэмэгдүүлнэ)</span>
          </label>
          {isCapitalized && (
            <div className="mt-2">
              <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Ашиглах хугацааг хэдэн сараар сунгах вэ? (заавал биш)</label>
              <input type="number" min="0" step="1" className="ds-input w-full" placeholder="0" value={extendMonths} onChange={(e) => setExtendMonths(e.target.value)} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Хөрөнгийн нэр эсвэл бүртгэлийн дугаараар (эхний үсэг/тоо бичих
// үед) шүүгдэж, доор нь жагсаалт гарч ирдэг хайлтын элемент — олон
// мянган мвртэй хүснэгэлд ердийн <select> ашиглах боломжгүй болсныг
// шийдэв.
function AssetSearchCombobox({ assets, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = assets.find((a) => a.id === value);

  useEffect(() => {
    setQuery(selected ? selected.name : '');
  }, [selected?.id, selected?.name]);

  const q = query.trim().toLowerCase();
  const filtered = (q === ''
    ? assets
    : assets.filter((a) => a.name.toLowerCase().includes(q) || (a.barcode || '').toLowerCase().includes(q))
  ).slice(0, 50);

  return (
    <div className="relative">
      <input
        type="text"
        className="ds-input w-full"
        placeholder="Хайх (нэр эсвэл бүртгэлийн дугаар)..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onChange(''); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md border border-slate-200 dark:border-bordercol bg-white dark:bg-appbg shadow-lg">
          {filtered.map((a) => (
            <button
              type="button"
              key={a.id}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-slate-100 dark:hover:bg-white/5"
              onMouseDown={() => { onChange(a.id); setQuery(a.name); setOpen(false); }}
            >
              <div className="font-medium text-slate-900 dark:text-white">{a.name}</div>
              <div className="text-[11px] text-mutedtext font-mono">{a.barcode}</div>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 dark:border-bordercol bg-white dark:bg-appbg shadow-lg px-3 py-2 text-[12px] text-mutedtext">
          Олдсонгүй
        </div>
      )}
    </div>
  );
}
