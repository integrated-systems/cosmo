import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useConfirm } from '../hooks/useConfirm';
import { DeleteIcon, EditIcon } from '../components/icons/Icons';

// "Санхүүгийн тохиргоо" (СИСАДМИН, /finconfig) — 2026-09-04 хэрэглэгчийн
// шийдвэрээр хуучин, тусдаа "НББ тохиргоо" (accconfig) болон "Тариф
// тохиргоо" (paymentconfig) 2 меню нэгтгэгдэж энэ 1 хуудас болов
// (Тариф ба НББ хоорондын нягт холбоо — Төлбөрийн урсгал: Тариф ->
// Нэхэмжлэл -> Төлбөр -> НББ журнал -> Тайлан - шийдвэрийн үндэслэл).
// UX-ийн үүднээс 8 таб (4+4) шугаман биш, 2 ТОМ БүЛЭГ (Тариф/НББ),
// тус бүрийн дотор дэд таб гэсэн 2 давхаргатай зохион байгуулалттай.
const CALC_METHODS = [
  { value: 'count', label: 'Тоогоор (ш./сар)' },
  { value: 'area', label: 'Талбайгаар (F/м2/сар)' },
  { value: 'fixed', label: 'Тогтмол (F/сар)' },
];

function calcMethodLabel(v) {
  return CALC_METHODS.find((m) => m.value === v)?.label || v;
}

function TariffCatalog({ hoaId, category, title }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', calc_method: 'count', amount: '' });
  const { confirm, ConfirmDialog } = useConfirm();

  async function load() {
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('tariff_items').select('*').eq('tenant_id', hoaId).eq('category', category).order('sort_order').order('created_at')
    );
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { if (hoaId) load(); }, [hoaId, category]);

  function startAdd() {
    setForm({ name: '', calc_method: 'count', amount: '' });
    setEditingId(null);
    setAdding(true);
  }
  function startEdit(row) {
    setForm({ name: row.name, calc_method: row.calc_method, amount: row.amount });
    setEditingId(row.id);
    setAdding(true);
  }
  async function save() {
    if (!form.name.trim()) return;
    const payload = {
      tenant_id: hoaId, category, name: form.name.trim(),
      calc_method: form.calc_method, amount: +form.amount || 0,
    };
    if (editingId) {
      await supabase.from('tariff_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId);
    } else {
      await supabase.from('tariff_items').insert({ ...payload, sort_order: rows.length });
    }
    setAdding(false);
    setEditingId(null);
    load();
  }
  async function toggleActive(row) {
    await supabase.from('tariff_items').update({ active: !row.active, updated_at: new Date().toISOString() }).eq('id', row.id);
    load();
  }
  async function remove(row) {
    const ok = await confirm(`"${row.name}" тарифыг устгах уу?`);
    if (!ok) return;
    await supabase.from('tariff_items').delete().eq('id', row.id);
    load();
  }

  return (
    <div className="ds-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Тарифын каталог — {title}</div>
        <span className="text-[11px] text-mutedtext">{rows.length} төлбөрийн мвр</span>
      </div>
      {loading ? (
        <div className="text-[12px] text-mutedtext py-6 text-center">Ачаалж байна...</div>
      ) : (
        <table className="ds-table w-full mb-3">
          <thead>
            <tr>
              <th className="py-2 px-2">НЭР</th>
              <th className="py-2 px-2">ТООЦООЛЛЫН АРГА</th>
              <th className="py-2 px-2">ХЭМЖЭЭ</th>
              <th className="py-2 px-2">ИДЭВХТЭЙ</th>
              <th className="py-2 px-2 text-right">үЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-2 font-medium text-slate-900 dark:text-white">{r.name}</td>
                <td className="py-2 px-2 text-mutedtext">{calcMethodLabel(r.calc_method)}</td>
                <td className="py-2 px-2">{r.amount.toLocaleString()}F</td>
                <td className="py-2 px-2">
                  <button onClick={() => toggleActive(r)} className={`text-[11px] font-medium ${r.active ? 'text-customGreen' : 'text-mutedtext'}`}>
                    {r.active ? 'Идэвхтэй' : 'Идэвхгүй'}
                  </button>
                </td>
                <td className="py-2 px-2 text-right whitespace-nowrap">
                  <button className="ds-icon-btn" onClick={() => startEdit(r)}><EditIcon /></button>
                  <button className="ds-icon-btn danger" onClick={() => remove(r)}><DeleteIcon /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-mutedtext">Тариф бүртгэгдээгүй байна</td></tr>
            )}
          </tbody>
        </table>
      )}
      {adding ? (
        <div className="ds-card p-3" style={{ background: 'var(--surface-0, transparent)' }}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input className="ds-input" placeholder="Төлбөрийн нэр" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <select className="ds-input" value={form.calc_method} onChange={(e) => setForm((f) => ({ ...f, calc_method: e.target.value }))}>
              {CALC_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input type="number" className="ds-input" placeholder="Хэмжээ (F)" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button className="ds-btn-primary" onClick={save}>Хадгалах</button>
            <button className="ds-btn-secondary" onClick={() => { setAdding(false); setEditingId(null); }}>Болих</button>
          </div>
        </div>
      ) : (
        <button className="ds-btn-secondary" onClick={startAdd}>+ Шинэ төлбөр нэмэх</button>
      )}
      <ConfirmDialog />
    </div>
  );
}

function InProgress({ label }) {
  return (
    <div className="ds-card p-8 text-center text-mutedtext text-sm">
      "{label}" хэсэг төрлөлж байгаа — удахгүй нэмэгдэнэ.
    </div>
  );
}

const TARIFF_TABS = [
  { key: 'owner', label: 'Сууц өмчлөгчийн СӨХ-ны төлбөр' },
  { key: 'client', label: 'ААН-ий СӨХ-ны төлбөр' },
  { key: 'reserve', label: 'Хүримтлалын сан' },
  { key: 'closure', label: 'Хаалтны тариф' },
];
const NBB_TABS = [
  { key: 'taxes', label: 'Татвар, шимтгэл' },
  { key: 'bonuses', label: 'Нэмэгдэл' },
  { key: 'income_cats', label: 'Орлогын дэд ангилал нэрс' },
  { key: 'invoice', label: 'Нэхэмжлэл' },
];

export default function FinConfig() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [group, setGroup] = useState('tariff'); // 'tariff' | 'nbb'
  const [tariffTab, setTariffTab] = useState('owner');
  const [nbbTab, setNbbTab] = useState('taxes');

  return (
    <>
      <div className="mb-3">
        <div className="text-[15px] font-semibold text-slate-900 dark:text-white mb-1">Санхүүгийн тохиргоо</div>
        <div className="text-[11.5px] text-mutedtext">Тариф болон Нягтлан бодох бүртгэлийн тохиргоог нэг дор удирдана</div>
      </div>

      <div className="flex gap-2 mb-4">
        <button className={group === 'tariff' ? 'ds-btn-primary' : 'ds-btn-secondary'} onClick={() => setGroup('tariff')}>Тариф</button>
        <button className={group === 'nbb' ? 'ds-btn-primary' : 'ds-btn-secondary'} onClick={() => setGroup('nbb')}>НББ</button>
      </div>

      {group === 'tariff' && (
        <>
          <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-bordercol">
            {TARIFF_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTariffTab(t.key)}
                className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px ${tariffTab === t.key ? 'border-customBlue text-customBlue' : 'border-transparent text-mutedtext hover:text-slate-900 dark:hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tariffTab === 'owner' && <TariffCatalog hoaId={hoaId} category="owner" title="Сууц өмчлөгч" />}
          {tariffTab === 'client' && <TariffCatalog hoaId={hoaId} category="client" title="ААН" />}
          {tariffTab === 'reserve' && <InProgress label="Хүримтлалын сан" />}
          {tariffTab === 'closure' && <InProgress label="Хаалтны тариф" />}
        </>
      )}

      {group === 'nbb' && (
        <>
          <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-bordercol">
            {NBB_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setNbbTab(t.key)}
                className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px ${nbbTab === t.key ? 'border-customBlue text-customBlue' : 'border-transparent text-mutedtext hover:text-slate-900 dark:hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <InProgress label={NBB_TABS.find((t) => t.key === nbbTab)?.label} />
        </>
      )}
    </>
  );
}
