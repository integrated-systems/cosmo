import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';

// "UserApp тохиргоо" (/uappconfig) — 2026-08-19 хэрэглэгчийн зурган
// дизайны дагуу шинээр үүсгэв. "Модуль тохиргоо" таб дотор SISADMIN
// OwnerApp-д ямар модуль харагдахыг сонгодог whitelist. Энэ нь
// "Хандах эрхийн тохиргоо"-г ОРЛОХГүй, зүгээр НЭМЭЛТ шүүлтүүр —
// жинхэнэ эрх (Харах=Тийм) байгаа ч, энд идэвхжүүлээгүй бол OwnerApp
// дотор товч болж харагдахгүй.
//
// 2026-08-31 БүРЭН ШИНЭЧЛЭЛ (2) — Хэрэглэгчийн хүсэлт:
//   1) 2 шинэ модуль нэмэв: "Утасны жагсаалт" (phonebook), "СӨХ-ны
//      тухай" (about) — OwnerApp-д synthetic tile байдлаар (мвн
//      "Зарын самбар"-тай адил) UserApp.jsx-д бүртгэгдсэн.
//   2) "Төлбөрт үйлчилгээ" таб -> "Утасны жагсаалт" болж, БОДИТ
//      editor (жагсаалт нэмэх/устгах) болов.
//   3) "Хэрэгцээт утас, мэйл" таб -> "СӨХ-ны тухай" болж, БОДИТ
//      editor (хаяг/данс/танилцуулга) болов.
//   4) Баруун талд OwnerApp-ийн бодит CSS классуудыг ("userapp.css")
//      дахин ашигласан УТАСНЫ ФРЭЙМ дизайнтай Live Preview нэмэв —
//      admin-ий toggle хийсэн үр дүнг бараг бодит OwnerApp шиг
//      харна.
const MODULES = [
  { key: 'dashboard', label: 'Хянах самбар', built: true },
  { key: 'news', label: 'Мэдээ, мэдээлэл', built: true },
  { key: 'msgr', label: 'Мессенжер', built: true },
  { key: 'voting', label: 'Сонгууль, санал асуулга', built: true },
  { key: 'parking', label: 'Зочин урих', built: false },
  { key: 'phonebook', label: 'Утасны жагсаалт', built: true },
  { key: 'about', label: 'СӨХ-ны тухай', built: true },
];

// Тогтмол харагдах (энэ жагсаалтаар ХЯЗГААРЛАГДДАГГүй) зүйлс —
// admin-д тодорхой болгохын тулд зүгээр мэдээлэл болгон үзүүлнэ.
const FIXED_ITEMS = [
  { label: 'Зарын самбар', note: 'Home tile — үүргүй харагдана (тохируулах боломж удахгүй нэмэгдэнэ)' },
  { label: 'Төлбөр', note: 'Доод navigation tab — үүргүй харагдана' },
  { label: 'Профайл', note: 'Доод navigation tab — үүргүй харагдана' },
];

const TABS = [
  { key: 'modules', label: 'Модуль тохиргоо' },
  { key: 'phonebook', label: 'Утасны жагсаалт' },
  { key: 'about', label: 'СӨХ-ны тухай' },
];

// 2026-08-31: OwnerApp-ийн БОДИТ "userapp.css" классуудыг (.tile,
// .home-header, .tab-bar г.м) дахин ашигласан утасны фрэйм дизайнтай
// урьдчилсан харагдац. Fixed дэвсгэр давхарга (app-bg-l1/l2/l3)-ыг
// ЭНД ашиглахгүй (position:fixed нь бүхэл admin хуудсыг бүрхэх
// эрсдэлтэй) — зүгээр --bg-page-ийн энгийн өнгө ашиглана.
function PhonePreview({ modules, enabled }) {
  const activeTiles = modules.filter((m) => enabled[m.key] !== false);
  return (
    <div style={{ width: 280, borderRadius: 32, border: '8px solid #111', overflow: 'hidden', background: '#111', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
      <div className="userapp-root" data-theme="dark" style={{ background: 'var(--bg-page)', height: 500, overflowY: 'auto', position: 'relative' }}>
        <div className="home-header" style={{ padding: '14px 12px 6px' }}>
          <div>
            <div className="app-title" style={{ fontSize: 17 }}>Гэрлүг Виста</div>
            <div className="user-greeting">58/4 байрны 0703 тоот</div>
          </div>
        </div>
        <div style={{ padding: '4px 10px 60px' }}>
          <div className="tile-grid" style={{ gap: 8 }}>
            {activeTiles.map((m) => (
              <div key={m.key} className="tile" style={{ minHeight: 78, padding: 12 }}>
                <div className="tile-label" style={{ fontSize: 10.5 }}>{m.label}</div>
                <div className="tile-status" style={{ fontSize: 8.5 }}>{m.built ? 'Нээлттэй' : 'Түн удахгүй'}</div>
              </div>
            ))}
            <div className="tile" style={{ minHeight: 78, padding: 12 }}>
              <div className="tile-label" style={{ fontSize: 10.5 }}>Зарын самбар</div>
              <div className="tile-status" style={{ fontSize: 8.5 }}>Түн удахгүй</div>
            </div>
          </div>
        </div>
        <div className="tab-bar-wrap" style={{ position: 'absolute', padding: '0 10px 10px' }}>
          <div className="tab-bar" style={{ maxWidth: 240 }}>
            <div className="tab-btn active"><span style={{ fontSize: 8 }}>Home</span></div>
            <div className="tab-btn"><span style={{ fontSize: 8 }}>Төлбөр</span></div>
            <div className="tab-btn"><span style={{ fontSize: 8 }}>Profile</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserAppConfig() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('modules');
  const [enabled, setEnabled] = useState({}); // { page_key: boolean }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [phoneRows, setPhoneRows] = useState([]);
  const [phoneLoading, setPhoneLoading] = useState(true);
  const [phoneSaving, setPhoneSaving] = useState(false);

  const [about, setAbout] = useState({ address: '', bank_name: '', bank_account: '', phone: '', email: '', intro_text: '' });
  const [aboutLoading, setAboutLoading] = useState(true);
  const [aboutSaving, setAboutSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('userapp_config').select('page_key,enabled').eq('tenant_id', hoaId);
      const map = {};
      MODULES.forEach((m) => { map[m.key] = true; }); // анхдагч бүгд идэвхтэй
      (data ?? []).forEach((r) => { map[r.page_key] = r.enabled; });
      setEnabled(map);
      setLoading(false);
    })();
  }, [hoaId]);

  useEffect(() => {
    if (tab !== 'phonebook') return;
    setPhoneLoading(true);
    supabase.from('tenant_phonebook').select('*').eq('tenant_id', hoaId).order('order_index').then(({ data }) => {
      setPhoneRows(data ?? []);
      setPhoneLoading(false);
    });
  }, [hoaId, tab]);

  useEffect(() => {
    if (tab !== 'about') return;
    setAboutLoading(true);
    supabase.from('tenant_about').select('*').eq('tenant_id', hoaId).maybeSingle().then(({ data }) => {
      if (data) setAbout(data);
      setAboutLoading(false);
    });
  }, [hoaId, tab]);

  function toggle(key) {
    setEnabled((e) => ({ ...e, [key]: !e[key] }));
  }

  async function handleSave() {
    setSaving(true);
    const rows = MODULES.map((m) => ({ tenant_id: hoaId, page_key: m.key, enabled: !!enabled[m.key] }));
    const { error } = await supabase.from('userapp_config').upsert(rows, { onConflict: 'tenant_id,page_key' });
    setSaving(false);
    if (error) { alert(error.message); return; }
    supabase.rpc('log_audit_event', { p_tenant_id: hoaId, p_action: 'update_userapp_config' });
  }

  function addPhoneRow() {
    setPhoneRows((r) => [...r, { id: `new-${Date.now()}`, label: '', phone: '', order_index: r.length + 1, _new: true }]);
  }
  function updatePhoneRow(id, field, value) {
    setPhoneRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }
  function removePhoneRow(id) {
    setPhoneRows((r) => r.filter((row) => row.id !== id));
  }
  async function savePhonebook() {
    setPhoneSaving(true);
    const clean = phoneRows.filter((r) => r.label.trim() && r.phone.trim());
    await supabase.from('tenant_phonebook').delete().eq('tenant_id', hoaId);
    if (clean.length > 0) {
      const rows = clean.map((r, i) => ({ tenant_id: hoaId, label: r.label.trim(), phone: r.phone.trim(), order_index: i }));
      const { error } = await supabase.from('tenant_phonebook').insert(rows);
      if (error) { alert(error.message); setPhoneSaving(false); return; }
    }
    setPhoneSaving(false);
    const { data } = await supabase.from('tenant_phonebook').select('*').eq('tenant_id', hoaId).order('order_index');
    setPhoneRows(data ?? []);
  }

  async function saveAbout() {
    setAboutSaving(true);
    const { error } = await supabase.from('tenant_about').upsert({ tenant_id: hoaId, ...about, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
    setAboutSaving(false);
    if (error) { alert(error.message); return; }
  }

  return (
    <div className="ds-card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-bordercol">
        <span className="text-[14px] font-semibold text-slate-900 dark:text-white">UserApp тохиргоо</span>
      </div>

      <div className="flex border-b border-slate-200 dark:border-bordercol px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-customBlue'
                : 'border-transparent text-slate-500 dark:text-mutedtext hover:text-slate-700 dark:hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'modules' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-1">OwnerApp модулийн тохиргоо</div>
              <div className="text-[11px] text-mutedtext mb-4 max-w-md">
                Энд идэвхжүүлсэн модулиуд ЗӨВХӨН тухайн хэрэглэгчийн эрхтэй
                (Хандах эрхийн тохиргоо → Харах=Тийм) үед л OwnerApp-д товч
                болж харагдана — энэ тохиргоо нэмэлт шүүлтүүр, эрхийг
                орлохгүй.
              </div>

              {loading ? (
                <div className="text-[12px] text-darktext py-4">Ачаалж байна...</div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-200 dark:divide-bordercol">
                  {MODULES.map((m) => (
                    <label key={m.key} className="flex items-center gap-3 py-2.5 cursor-pointer">
                      <input type="checkbox" checked={!!enabled[m.key]} onChange={() => toggle(m.key)} className="w-4 h-4" />
                      <span className="text-[13px] text-slate-800 dark:text-text flex-1">{m.label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.built ? 'bg-customGreen/15 text-customGreen' : 'bg-customOrange/15 text-customOrange'}`}>
                        {m.built ? 'Идэвхтэй' : 'Түн удахгүй'}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <button className="ds-btn-primary mt-4" onClick={handleSave} disabled={saving || loading}>
                {saving ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-bordercol">
                <div className="text-[11.5px] font-semibold text-slate-700 dark:text-text mb-2">Тогтмол харагдах (энд тохируулагдахгүй)</div>
                <div className="flex flex-col gap-1.5">
                  {FIXED_ITEMS.map((f) => (
                    <div key={f.label} className="text-[11px] text-mutedtext">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{f.label}</span> — {f.note}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11.5px] font-semibold text-slate-700 dark:text-text mb-2">Урьдчилсан харагдац (OwnerApp Home)</div>
              <PhonePreview modules={MODULES} enabled={enabled} />
            </div>
          </div>
        )}

        {tab === 'phonebook' && (
          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-1">Утасны жагсаалт</div>
            <div className="text-[11px] text-mutedtext mb-4 max-w-xl">
              Гал түймэр, эмнэлэг, цагдаа зэрэг онцгой дугаараас эхлээд лифтчин,
              сантехник, цахилгаанчин зэрэг үйлчилгээний дугаар хүртэл — сууц
              өмчлөгч дугаар дээр дарахад үүрэн утасны оператор руу шиднэ.
            </div>
            {phoneLoading ? (
              <div className="text-[12px] text-darktext py-4">Ачаалж байна...</div>
            ) : (
              <div className="flex flex-col gap-2 max-w-xl">
                {phoneRows.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <input className="ds-input flex-1" placeholder="Нэр (жиш: Гал түймэр)" value={r.label} onChange={(e) => updatePhoneRow(r.id, 'label', e.target.value)} />
                    <input className="ds-input w-40" placeholder="Утасны дугаар" value={r.phone} onChange={(e) => updatePhoneRow(r.id, 'phone', e.target.value)} />
                    <button className="ds-icon-btn danger shrink-0" onClick={() => removePhoneRow(r.id)}>✕</button>
                  </div>
                ))}
                <button className="ds-btn-secondary self-start mt-1" onClick={addPhoneRow}>+ Мвр нэмэх</button>
              </div>
            )}
            <button className="ds-btn-primary mt-4" onClick={savePhonebook} disabled={phoneSaving || phoneLoading}>
              {phoneSaving ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
          </div>
        )}

        {tab === 'about' && (
          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-1">СӨХ-ны тухай</div>
            <div className="text-[11px] text-mutedtext mb-4 max-w-xl">
              СӨХ-ийн хаяг, дансны мэдээлэл болон хотхоны танилцуулга текст —
              сууц өмчлөгч OwnerApp дээрх "СӨХ-ны тухай" тайл дээр дарж
              харна.
            </div>
            {aboutLoading ? (
              <div className="text-[12px] text-darktext py-4">Ачаалж байна...</div>
            ) : (
              <div className="flex flex-col gap-3 max-w-xl">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хаяг</label>
                  <input className="ds-input w-full" value={about.address || ''} onChange={(e) => setAbout({ ...about, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Банк</label>
                    <input className="ds-input w-full" value={about.bank_name || ''} onChange={(e) => setAbout({ ...about, bank_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Дансны дугаар</label>
                    <input className="ds-input w-full" value={about.bank_account || ''} onChange={(e) => setAbout({ ...about, bank_account: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Утас</label>
                    <input className="ds-input w-full" value={about.phone || ''} onChange={(e) => setAbout({ ...about, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">И-мэйл</label>
                    <input className="ds-input w-full" value={about.email || ''} onChange={(e) => setAbout({ ...about, email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Танилцуулга текст</label>
                  <textarea className="ds-input w-full" rows={5} value={about.intro_text || ''} onChange={(e) => setAbout({ ...about, intro_text: e.target.value })} />
                </div>
              </div>
            )}
            <button className="ds-btn-primary mt-4" onClick={saveAbout} disabled={aboutSaving || aboutLoading}>
              {aboutSaving ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
