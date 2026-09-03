import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useConfirm } from '../hooks/useConfirm';
import { DeleteIcon, EditIcon } from '../components/icons/Icons';
import { formatMoney } from '../lib/format';

// "Санхүүгийн тохиргоо" (СИСАДМИН, /finconfig) — 2026-09-04 хэрэглэгчийн
// шийдвэрээр хуучин, тусдаа "НББ тохиргоо" (accconfig) болон "Тариф
// тохиргоо" (paymentconfig) 2 меню нэгтгэгдэж энэ 1 хуудас болов
// (Тариф ба НББ хоорондын нягт холбоо — Төлбөрийн урсгал: Тариф ->
// Нэхэмжлэл -> Төлбөр -> НББ журнал -> Тайлан - шийдвэрийн үндэслэл).
// UX-ийн үүднээс 8 таб (4+4) шугаман биш, 2 ТОМ БүЛЭГ (Тариф/НББ),
// тус бүрийн дотор дэд таб гэсэн 2 давхаргатай зохион байгуулалттай.
//
// 2026-09-04 (2): Хэрэглэгчийн шийдвэрээр "Хүримтлалын сан" дэд табыг
// Тариф-аас НББ рүү шилжүүлэв (энэ нь тариф БИШ, нягтлан бодох
// бүртгэлийн зүйл гэдэг үүднээс). Шинэ "Төлбөрийн хоцрогдол" дэд таб
// нэмэв - Сууц өмчлөгч БОЛОН Талбай өмчлөгч ХОЁУЛАНД адилхан үйлчлэх
// НЭГ ерөнхий тохиргоо (тус тусад нь биш). "Хаалтны тариф" дэд табын
// НЭРИЙГ "Хотхоны хаалт" болгов (картын гарчиг хэвээрээ).
const CALC_METHODS = [
  { value: 'count', label: 'Тоогоор (ш./сар)' },
  { value: 'area', label: 'Талбайгаар (₮/м²/сар)' },
  { value: 'fixed', label: 'Тогтмол (₮/сар)' },
];

function calcMethodLabel(v) {
  return CALC_METHODS.find((m) => m.value === v)?.label || v;
}

// ---------------- Тарифын каталог (Сууц өмчлөгч / ААН) ----------------
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
                <td className="py-2 px-2">{formatMoney(r.amount)}₮</td>
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
            <input type="number" className="ds-input" placeholder="Хэмжээ (₮)" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
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

// ---------------- fin_settings-д тулгуурласан ганц мврт тохиргооны карт ----------------
function useFinSettings(hoaId) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('fin_settings').select('*').eq('tenant_id', hoaId).maybeSingle();
    setSettings(data || { tenant_id: hoaId });
    setLoading(false);
  }
  useEffect(() => { if (hoaId) load(); }, [hoaId]);

  async function save(patch) {
    const payload = { tenant_id: hoaId, ...settings, ...patch, updated_at: new Date().toISOString() };
    delete payload.id;
    await supabase.from('fin_settings').upsert(payload, { onConflict: 'tenant_id' });
    await load();
  }
  return { settings, loading, save };
}

function SettingsField({ label, hint, value, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-[11.5px] font-medium text-slate-700 dark:text-mutedtext mb-1">{label}</label>
      <input type="number" step="any" className="ds-input w-full" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <div className="text-[10.5px] text-mutedtext mt-1">{hint}</div>}
    </div>
  );
}

function ReserveFundCard({ hoaId }) {
  const { settings, loading, save } = useFinSettings(hoaId);
  const [amount, setAmount] = useState('');
  useEffect(() => { if (settings) setAmount(settings.monthly_reserve_amount ?? 0); }, [settings]);
  if (loading || !settings) return <div className="ds-card p-4 text-center text-mutedtext text-sm">Ачаалж байна...</div>;
  return (
    <div className="ds-card p-4" style={{ maxWidth: 420 }}>
      <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Хуримтлалын санд сар бүр төлөрүүлэх дүн</div>
      <SettingsField label="Сарын хуримтлалын сан (₮/сар)" value={amount} onChange={setAmount} />
      <button className="ds-btn-primary" onClick={() => save({ monthly_reserve_amount: +amount || 0 })}>Хадгалах</button>
    </div>
  );
}

function OverdueCard({ hoaId }) {
  const { settings, loading, save } = useFinSettings(hoaId);
  const [form, setForm] = useState({ overdue_penalty_pct: '', overdue_days: '', at_risk_days: '' });
  useEffect(() => {
    if (settings) setForm({
      overdue_penalty_pct: settings.overdue_penalty_pct ?? 0,
      overdue_days: settings.overdue_days ?? 30,
      at_risk_days: settings.at_risk_days ?? 180,
    });
  }, [settings]);
  if (loading || !settings) return <div className="ds-card p-4 text-center text-mutedtext text-sm">Ачаалж байна...</div>;
  return (
    <div className="ds-card p-4" style={{ maxWidth: 480 }}>
      <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-1">Төлбөрийн хоцрогдол</div>
      <div className="text-[10.5px] text-mutedtext mb-3">Сууц өмчлөгч БОЛОН Талбай өмчлөгч хоёуланд адилхан үйлчлэх ерөнхий нэг тохиргоо</div>
      <SettingsField label="Хугацаа хэтэрсэн торгуулийн хувь (%/сар)" value={form.overdue_penalty_pct} onChange={(v) => setForm((f) => ({ ...f, overdue_penalty_pct: v }))} />
      <SettingsField
        label="Төлбөр төлөлтийг хугацаа хэтэрсэнд тооцох хугацаа"
        hint="Нэхэмжлэх илгээсэн өдрөөс хойш дээрх хоногоос дотогш байгаа бол Хүлээлттэйд тооцогдох ба дээрх хоногоос илүү гарвал автоматаар Хугацаа хэтэрсэнд тооцогдоно."
        value={form.overdue_days} onChange={(v) => setForm((f) => ({ ...f, overdue_days: v }))}
      />
      <SettingsField
        label="Төлбөр төлөлтийг эрсдэлтэйд тооцох хугацаа"
        hint="Нэхэмжлэх илгээсэн өдрөөс хойш дээрх хоногоос илүү гарвал автоматаар Эрсдэлтэйд тооцогдоно."
        value={form.at_risk_days} onChange={(v) => setForm((f) => ({ ...f, at_risk_days: v }))}
      />
      <button className="ds-btn-primary" onClick={() => save({
        overdue_penalty_pct: +form.overdue_penalty_pct || 0,
        overdue_days: +form.overdue_days || 0,
        at_risk_days: +form.at_risk_days || 0,
      })}>Хадгалах</button>
    </div>
  );
}

function GateTariffCard({ hoaId }) {
  const { settings, loading, save } = useFinSettings(hoaId);
  const [form, setForm] = useState({ gate_unit_minutes: '', gate_unit_price: '', gate_temp_stop_interval_minutes: '', gate_free_guest_minutes: '' });
  useEffect(() => {
    if (settings) setForm({
      gate_unit_minutes: settings.gate_unit_minutes ?? 15,
      gate_unit_price: settings.gate_unit_price ?? 0,
      gate_temp_stop_interval_minutes: settings.gate_temp_stop_interval_minutes ?? 15,
      gate_free_guest_minutes: settings.gate_free_guest_minutes ?? 60,
    });
  }, [settings]);
  if (loading || !settings) return <div className="ds-card p-4 text-center text-mutedtext text-sm">Ачаалж байна...</div>;
  return (
    <div className="ds-card p-4" style={{ maxWidth: 420 }}>
      <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Хаалтны тариф</div>
      <SettingsField label="Төлбөр тооцох нэгж хугацаа (минут)" value={form.gate_unit_minutes} onChange={(v) => setForm((f) => ({ ...f, gate_unit_minutes: v }))} />
      <SettingsField label="Нэгж хугацаанд тооцох төлбөр (₮)" value={form.gate_unit_price} onChange={(v) => setForm((f) => ({ ...f, gate_unit_price: v }))} />
      <SettingsField label="Түр зогсолтод тооцох хугацааны интервал (минут)" value={form.gate_temp_stop_interval_minutes} onChange={(v) => setForm((f) => ({ ...f, gate_temp_stop_interval_minutes: v }))} />
      <SettingsField label="Зочны эдлэх үнэгүй тарифт хугацаа (макс минут)" value={form.gate_free_guest_minutes} onChange={(v) => setForm((f) => ({ ...f, gate_free_guest_minutes: v }))} />
      <button className="ds-btn-primary" onClick={() => save({
        gate_unit_minutes: +form.gate_unit_minutes || 0,
        gate_unit_price: +form.gate_unit_price || 0,
        gate_temp_stop_interval_minutes: +form.gate_temp_stop_interval_minutes || 0,
        gate_free_guest_minutes: +form.gate_free_guest_minutes || 0,
      })}>Хадгалах</button>
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


// 2026-09-04 (4): "Орлогын дэд ангилал" - НББ модуль хийх үед
// ашиглагдах жинхэнэ бүтэц, гэхдээ ОДООГООР placeholder (гүйлгээ
// бүртгэл, дансны холболт огт байхгүй, зөвхөн жагсаалт+тайлбар).
const INCOME_CATEGORIES = [
  'Айл, врх, зогсоол, агуулах',
  'Аж ахуйн нэгж',
  'Антены, лифтний самбарын түрээс',
  'Банкны хүүгийн орлого',
  'Зогсоолын хураамж',
  'Чипний орлого',
  'Ажилчдаас авах авлага',
  'Хохирлын нвхвн төлбөр',
  'Бусад',
  'Хаалтны хэтэрсэн хугацаа, түр зогсолтын төлбөр',
];

function IncomeCategoriesPlaceholder() {
  return (
    <div>
      <div className="ds-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Орлогын дэд ангилал</div>
          <button className="ds-btn-primary" disabled title="НББ модуль хийгдсэний дараа идэвхжинэ">+ Шинэ дэд ангилал нэмэх</button>
        </div>
        <table className="ds-table w-full">
          <thead>
            <tr>
              <th className="py-2 px-2">НЭР</th>
              <th className="py-2 px-2 text-right">үЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {INCOME_CATEGORIES.map((name) => (
              <tr key={name}>
                <td className="py-2 px-2 text-customBlue">{name}</td>
                <td className="py-2 px-2 text-right whitespace-nowrap opacity-40">
                  <button className="ds-icon-btn" disabled><EditIcon /></button>
                  <button className="ds-icon-btn danger" disabled><DeleteIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ds-card p-4 text-[11.5px] text-mutedtext leading-relaxed">
        <div className="font-semibold text-slate-900 dark:text-white mb-2">Энэ тохиргоо юу хийдэг, юу хийдэггүй вэ</div>
        <p className="mb-2">Эндээс тохируулсан нэрс нь зөвхөн "Гүйлгээ бүртгэл — Орлого — Орлого нэмэх" модалийн "Дэд ангилал" dropdown жагсаалтад харагдана. Энэ жагсаалт нь ямар нэг тодорхой дансанд шууд заагдаагүй, чөлөөт текст шинж чанартай.</p>
        <p className="mb-2"><b>НББ-ийн дансанд хэрхэн твсдэглэгдэх вэ:</b> Та дээрх жагсаалтаас аль нь сонгосон ч, гүйлгээ бүр яг ижил нэг данс — 5600 "Бусад орлого"-нд бичигдэнэ (дэд ангиллын нэрээс үл хамаарна). өөрөөр хэлбэл, "Банкны хүүгийн орлого" эсвэл "Зогсоолын хураамж" аль алийг сонгосон ч, журналын бичилт адилхан 5600 дансанд орно — зөвхөн гүйлгээний тайлбар (сар, зорилго) л ялгаатай харагдана.</p>
        <p className="mb-2"><b>Тэгэхээр яагаад энэ тохиргоо хэрэгтэй вэ:</b> Дансанд нвлввгүй ч, СӨХ-ны дотоод санхүүгийн бүртгэлийг цэгцтэй, ойлгомжтой байлгах зорилготой (жиш нь тайлан, жагсаалт харахад "юу вэ" гэдгийг тодорхой ялгах). Нэр солих, нэмэх, устгах, дараалал өөрчлөх нь Нягтлан бодох бүртгэлийн модульд хамааралтай.</p>
        <p>Зөвхөн Орлогын дэд ангилалд хамаарна. Зарлагын дэд ангилал (Урсгал зардал, Хөрөнгө оруулалтын зардал гэх мэт) энд ОРООГүй — учир нь тэдгээрийн зарим нэр (жиш нь "Цалин хвлсний зардал", "НДШ зардал") нь тодорхой дансанд (7010, 7020 г.м) шууд, нэрээр нь холбогдсон тул нэрийг өөрчлөх нь тайланг буруу ангилуулах эрсдэлтэй. Иймд Зарлагын ангилалыг өөрчлөхийг зввлвдэггүй.</p>
      </div>
    </div>
  );
}

function InvoiceScheduleCard({ hoaId }) {
  const { settings, loading, save } = useFinSettings(hoaId);
  const [form, setForm] = useState({
    invoice_register_day: '', invoice_send_day: '', invoice_due_day: '',
    notify_mail: false, notify_sms: false, notify_messenger: true,
  });
  useEffect(() => {
    if (settings) setForm({
      invoice_register_day: settings.invoice_register_day ?? 1,
      invoice_send_day: settings.invoice_send_day ?? 2,
      invoice_due_day: settings.invoice_due_day ?? 20,
      notify_mail: settings.notify_mail ?? false,
      notify_sms: settings.notify_sms ?? false,
      notify_messenger: settings.notify_messenger ?? true,
    });
  }, [settings]);
  if (loading || !settings) return <div className="ds-card p-4 text-center text-mutedtext text-sm">Ачаалж байна...</div>;
  return (
    <div className="ds-card p-4" style={{ maxWidth: 460 }}>
      <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Нэхэмжлэх илгээх хуваарь</div>
      <SettingsField
        label="Нэхэмжлэл бүртгэх календарийн вдвр"
        hint='Энэ вдвр "Нягтлан бодох бүртгэл — Журналд нэхэмжлэх бүртгэх" табын "Энэ сарын нэхэмжлэл бүртгэх" товч автоматаар дарагдана.'
        value={form.invoice_register_day} onChange={(v) => setForm((f) => ({ ...f, invoice_register_day: v }))}
      />
      <SettingsField
        label="Нэхэмжлэл илгээх календарийн вдвр"
        hint="Энэ вдвр бүртгэгдсэн нэхэмжлэлийг автоматаар илгээнэ."
        value={form.invoice_send_day} onChange={(v) => setForm((f) => ({ ...f, invoice_send_day: v }))}
      />
      <div className="mb-4">
        <label className="block text-[11.5px] font-medium text-slate-700 dark:text-mutedtext mb-1.5">Илгээх суваг</label>
        <div className="flex gap-4">
          {[['notify_mail', 'Мэйл'], ['notify_sms', 'СМС'], ['notify_messenger', 'Мессенжер']].map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-[12px] text-slate-700 dark:text-mutedtext cursor-pointer">
              <input type="checkbox" checked={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <SettingsField
        label="Төлбөр твлвх календарийн сүүлчийн вдвр"
        hint='Нэхэмжлэлийн мэдэгдэлд "[ХХ]-ний дотор твлнэ vv" гэж харагдана.'
        value={form.invoice_due_day} onChange={(v) => setForm((f) => ({ ...f, invoice_due_day: v }))}
      />
      <button className="ds-btn-primary" onClick={() => save({
        invoice_register_day: +form.invoice_register_day || 1,
        invoice_send_day: +form.invoice_send_day || 1,
        invoice_due_day: +form.invoice_due_day || 1,
        notify_mail: form.notify_mail, notify_sms: form.notify_sms, notify_messenger: form.notify_messenger,
      })}>Хадгалах</button>
    </div>
  );
}

const TARIFF_TABS = [
  { key: 'owner', label: 'Сууц өмчлөгчийн СӨХ-ны төлбөр' },
  { key: 'client', label: 'Талбай өмчлөгч (ААН)-ийн СӨХ-ны төлбөр' },
  { key: 'closure', label: 'Хотхоны хаалт' },
];
// 2026-09-04 (2): Хэрэглэгчийн заасан дараалал: Орлогын дэд ангилал -
// Нэхэмжлэл - Төлбөрийн хоцрогдол - Хүримтлалын сан - Нэмэгдэл -
// Татвар, шимтгэл.
const NBB_TABS = [
  { key: 'income_cats', label: 'Орлогын дэд ангилал' },
  { key: 'invoice', label: 'Нэхэмжлэх' },
  { key: 'overdue', label: 'Төлбөрийн хоцрогдол' },
  { key: 'reserve', label: 'Хуримтлалын сан' },
  { key: 'bonuses', label: 'Нэмэгдэл' },
  { key: 'taxes', label: 'Татвар, шимтгэл' },
];

export default function FinConfig() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [group, setGroup] = useState('tariff'); // 'tariff' | 'nbb'
  const [tariffTab, setTariffTab] = useState('owner');
  const [nbbTab, setNbbTab] = useState('income_cats');

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
          {tariffTab === 'client' && <TariffCatalog hoaId={hoaId} category="client" title="Талбай өмчлөгч" />}
          {tariffTab === 'closure' && <GateTariffCard hoaId={hoaId} />}
        </>
      )}

      {group === 'nbb' && (
        <>
          <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-bordercol flex-wrap">
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
          {nbbTab === 'income_cats' && <IncomeCategoriesPlaceholder />}
          {nbbTab === 'invoice' && <InvoiceScheduleCard hoaId={hoaId} />}
          {nbbTab === 'overdue' && <OverdueCard hoaId={hoaId} />}
          {nbbTab === 'reserve' && <ReserveFundCard hoaId={hoaId} />}
          {['bonuses', 'taxes'].includes(nbbTab) && (
            <InProgress label={NBB_TABS.find((t) => t.key === nbbTab)?.label} />
          )}
        </>
      )}
    </>
  );
}
