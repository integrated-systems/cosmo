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
// 2026-08-31 БүРЭН ШИНЭЧЛЭЛ — OwnerApp-ийн бодит хвгжүүлэлтийг дагаж
// нийцүүлэв. ОЛСОН БОДИТ АЛДАА: жагсаалтын 7 модуль (guest_invite,
// requests, paid_services, info, emergency_phones, elevator_call,
// camera_view) АЛЬ НЬ Ч бодит menu.js-ийн page_key-тэй холбогдоогүй
// байсан тул checkbox үүнийг дарсан ч үр дүнд юу ч өөрчлөгддөггүй
// байв (зүгээр "хуурмаг" тохиргоо байсан). Мвн "Зочин урих" буруу
// key-тэй ("guest_invite") бүртгэгдсэн байсан — жинхэнэ key нь
// "parking" (Түр зогсоол бүртгэл, OwnerApp-д харагдах нэрээр нь).
//
// Одоо ЗӨВХӨН бодит menu.js-д буй, OwnerApp-ийн Home tile grid-д
// үнэхээр нөлөөлдөг key-үүдийг л жагсаана. Тус бүрт ажиллагаа нь
// бодитоор бүтээгдсэн эсэхийг ("Идэвхтэй"/"Түн удахгүй") үзүүлж,
// admin худал мэдээлэлд ойлгомжгүйрхэхээс сэргийлнэ. Баруун талд
// OwnerApp-ийн Home дэлгэцийн ЖИНХЭНЭ tile grid-тэй ижил бүтэцтэй
// (checkbox-той шууд синхрон) урьдчилсан харагдац нэмж, admin "юуг
// хэрэглэгч үзэх вэ" гэдгийг шууд нүдээрээ харна.
const MODULES = [
  { key: 'dashboard', label: 'Хянах самбар', built: true },
  { key: 'news', label: 'Мэдээ, мэдээлэл', built: true },
  { key: 'msgr', label: 'Мессенжер', built: true },
  { key: 'voting', label: 'Сонгууль, санал асуулга', built: true },
  { key: 'parking', label: 'Зочин урих', built: false },
];

// Тогтмол харагдах (энэ жагсаалтаар ХЯЗГААРЛАГДДАГГүй) зүйлс —
// admin-д тодорхой болгохын тулд зүгээр мэдээлэл болгон үзүүлнэ.
const FIXED_ITEMS = [
  { label: 'Зарын самбар', note: 'Home tile — одоогоор үүргүй харагдана (тохируулах боломж удахгүй нэмэгдэнэ)' },
  { label: 'Төлбөр', note: 'Доод navigation tab — үүргүй харагдана' },
  { label: 'Профайл', note: 'Доод navigation tab — үүргүй харагдана' },
];

const TABS = [
  { key: 'modules', label: 'Модуль тохиргоо' },
  { key: 'paid', label: 'Төлбөрт үйлчилгээ' },
  { key: 'contacts', label: 'Хэрэгцээт утас, мэйл' },
];

function TilePreview({ label, active, built }) {
  return (
    <div
      style={{
        borderRadius: 10, padding: '10px 8px', minHeight: 56,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: active ? 'rgba(59,130,246,0.12)' : 'rgba(148,163,184,0.08)',
        border: active ? '1px solid rgba(59,130,246,0.4)' : '1px dashed rgba(148,163,184,0.3)',
        opacity: active ? 1 : 0.45,
        transition: 'all .15s',
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.2 }} className="text-slate-800 dark:text-white">{label}</div>
      {active && !built && <div style={{ fontSize: 8.5, marginTop: 2 }} className="text-customOrange">түн удахгүй</div>}
    </div>
  );
}

export default function UserAppConfig() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('modules');
  const [enabled, setEnabled] = useState({}); // { page_key: boolean }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
              <div className="rounded-xl p-3 bg-slate-900" style={{ maxWidth: 300 }}>
                <div className="text-[10px] text-slate-400 mb-2">Гэрлүг Виста · 58/4 байрны 0703 тоот</div>
                <div className="grid grid-cols-2 gap-2">
                  {MODULES.map((m) => (
                    <TilePreview key={m.key} label={m.label} active={!!enabled[m.key]} built={m.built} />
                  ))}
                  <TilePreview label="Зарын самбар" active built={false} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'paid' && (
          <div className="text-[12px] text-mutedtext">Төлбөрт үйлчилгээний тохиргоо — удахгүй.</div>
        )}

        {tab === 'contacts' && (
          <div className="text-[12px] text-mutedtext">Хэрэгцээт утас, мэйлийн жагсаалт тохиргоо — удахгүй.</div>
        )}
      </div>
    </div>
  );
}
