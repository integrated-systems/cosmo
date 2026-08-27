import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';

// "UserApp тохиргоо" (/uappconfig) — 2026-08-19 хэрэглэгчийн зурган
// дизайны дагуу шинээр үүсгэв. "Модуль тохиргоо" таб дотор SISADMIN
// ирээдүйн резидент (Мобайл) апп-д ямар модуль харагдахыг сонгодог
// whitelist. Энэ нь "Хандах эрхийн тохиргоо"-г ОРЛОХГүй, зүгээр
// НЭМЭЛТ шүүлтүүр — жинхэнэ эрх (Харах=Тийм) байгаа ч, энд идэвхжүүлээгүй
// бол Мобайл апп дотор товч болж харагдахгүй.
const MODULES = [
  { key: 'dashboard', label: 'Хянах самбар' },
  { key: 'news', label: 'Мэдээ, мэдээлэл' },
  { key: 'msgr', label: 'Мессенжер' },
  { key: 'guest_invite', label: 'Зочин урих' },
  { key: 'voting', label: 'Сонгууль, санал асуулга' },
  { key: 'requests', label: 'Ирсэн санал, хүсэлт' },
  { key: 'paid_services', label: 'Төлбөрт үйлчилгээ' },
  { key: 'info', label: 'Хэрэгцээт мэдээлэл' },
  { key: 'emergency_phones', label: 'Онцгой хэрэгцээт утас' },
  { key: 'elevator_call', label: 'Лифт дуудах (түн удахгүй)' },
  { key: 'camera_view', label: 'Камер харах (түн удахгүй)' },
];

const TABS = [
  { key: 'modules', label: 'Модуль тохиргоо' },
  { key: 'paid', label: 'Төлбөрт үйлчилгээ' },
  { key: 'contacts', label: 'Хэрэгцээт утас, мэйл' },
];

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
          <div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-1">Мобайл апп (userapp-react) модулийн тохиргоо</div>
            <div className="text-[11px] text-mutedtext mb-4 max-w-3xl">
              Гар утасны дэлгэц жижиг, агуулга их модуль тохиромжгүй харагдаж болно. Энд идэвхжүүлсэн модулиуд ЗӨВХӨН тухайн хэрэглэгчийн эрхтэй
              (Хандах эрхийн тохиргоо → Харах=Тийм/Өврийнхийг харах) үед л Мобайл апп-д товч болж харагдана — энэ тохиргоо нэмэлт шүүлтүүр,
              эрхийг орлохгүй.
            </div>

            {loading ? (
              <div className="text-[12px] text-darktext py-4">Ачаалж байна...</div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-200 dark:divide-bordercol">
                {MODULES.map((m) => (
                  <label key={m.key} className="flex items-center gap-3 py-2.5 cursor-pointer">
                    <input type="checkbox" checked={!!enabled[m.key]} onChange={() => toggle(m.key)} className="w-4 h-4" />
                    <span className="text-[13px] text-slate-800 dark:text-text">{m.label}</span>
                  </label>
                ))}
              </div>
            )}

            <button className="ds-btn-primary mt-4" onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
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
