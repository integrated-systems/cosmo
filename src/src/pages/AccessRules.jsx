import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { MENU_SECTIONS } from '../config/menu';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useAlert } from '../hooks/useAlert';

// "Хандах эрхийн тохиргоо" (/rolesrules, СИСАДМИН-үүд зорилготой) —
// 2026-08-19 хэрэглэгчтэй тохиролцсон архитектур:
// - Salesforce-ийн "Profile" загварыг бахүүжуулсан хувилбар — SISADMIN
//   ("СүХ-ийн бурхан") болон SUPERSYSADMIN ("бурхдын бурхан") ЭНЭ
//   матрицад ОГТ ОРОХГүй, тэдний эрх кодоор hardcode, үргүй.
// - 5 роль: Удирдах зөвлөл / Хяналтын зөвлөл / Гүйцэтгэх захирал /
//   Нягтлан бодогч / Менежер. Роль ОЛГОХ (аль хэрэглэгч аль ролийн)
//   БОЛОН нууц үг тохируулах эрх үргэлж зввхүн Админ-д хамаарна,
//   серверийн Edge Function дээр хатуу шалгагддаг тул ЭНД тохируулах
//   боломжгүй (тэмдэглэл UI дээр харагдана) — энэ хуудас зүгээр л
//   "роль бүр аль хуудсанд ямар үйлдэл хийж чадах вэ" гэдгийг
//   тохируулна.
// - Дээд тал: хуудасны нэрс (СИСАДМИН бүлгийг оруулаагүй — тэдгээр нь
//   Admin-only тул энэ матрицад хамаарахгүй). Доод тал: сонгосон
//   хуудасны үйлдэл(мвр) × роль(багана) матриц, Тийм/Үгүй dropdown.
const ROLES = [
  { key: 'board', label: 'Удирдах зввлвл' },
  { key: 'supervisory_board', label: 'Хяналтын зввлвл' },
  { key: 'executive_director', label: 'Гүйцэтгэх захирал' },
  { key: 'accountant', label: 'Нягтлан бодогч' },
  { key: 'manager', label: 'Менежер' },
  { key: 'owner', label: 'Сууц өмчлөгч (OwnerApp)' },
];

const STANDARD_ACTIONS = [
  { key: 'view', label: 'Харах' },
  { key: 'add', label: 'Нэмэх' },
  { key: 'edit', label: 'Засах' },
  { key: 'delete', label: 'Устгах' },
  { key: 'print', label: 'Хэвлэх' },
  { key: 'export', label: 'Экспорт' },
];

// Зүвхүн тодорхой хуудсанд л хамаарах тусгай үйлдлүүд — бусад хуудсанд
// greyed-out ("хамаарахгүй") харагдана.
const SPECIAL_ACTIONS = [
  { key: 'calc_payroll', label: 'Сарын цалин тооцох', pages: ['payrollacc'] },
  { key: 'journal_invoice', label: 'Журналд нэхэмжлэх бүртгэх', pages: ['accounting', 'invoice'] },
  { key: 'send_notification', label: 'Мэдэгдэл илгээх', pages: ['anndunn', 'news'] },
  { key: 'register_payment', label: 'Твлбвр бүртгэх', pages: ['payments', 'transactions'] },
];

// СИСАДМИН бүлгийг хассан (Admin-only, энэ матрицад хамаарахгүй) бүх
// хуудсыг menu.js-ээс шууд гарган авна — цаашид menu.js-д шинэ хуудас
// нэмэгдэхэд энд гараар давхар нэмэх шаардлагагүй.
const PAGES = MENU_SECTIONS
  .filter((section) => section.groupKey !== 'sysadmin')
  .flatMap((section) => section.items)
  .filter((item) => item.key !== 'emails');

export default function AccessRules() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { alert, AlertDialog } = useAlert();
  const [activePage, setActivePage] = useState(PAGES[0].key);
  const [rules, setRules] = useState({}); // { "role:action": boolean }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadRules() {
    setLoading(true);
    const { data, error } = await fetchAllRows(() =>
      supabase.from('access_rules').select('role,action,allowed').eq('tenant_id', hoaId).eq('page_key', activePage)
    );
    if (error) { alert(error.message); setLoading(false); return; }
    const map = {};
    (data ?? []).forEach((r) => { map[`${r.role}:${r.action}`] = r.allowed; });
    setRules(map);
    setLoading(false);
  }

  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId, activePage]);

  function isAllowed(role, action) {
    // Анхдагч: Харах/Нэмэх/Засах үйлдэл үргэлж "Тийм", Устгах үргэлж
    // "Үгүй" (тохиргоо хараахан хийгдээгүй үед ч ажлын урсгал тасрахгүй,
    // аюулгүй анхдагч) — Хэвлэх/Экспорт "Тийм" анхдагчаар.
    const key = `${role}:${action}`;
    if (key in rules) return rules[key];
    return action !== 'delete';
  }

  function setAllowed(role, action, value) {
    setRules((r) => ({ ...r, [`${role}:${action}`]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const allActions = [...STANDARD_ACTIONS, ...SPECIAL_ACTIONS.filter((a) => a.pages.includes(activePage))];
    const rows = [];
    for (const role of ROLES) {
      for (const action of allActions) {
        rows.push({
          tenant_id: hoaId,
          page_key: activePage,
          role: role.key,
          action: action.key,
          allowed: isAllowed(role.key, action.key),
          updated_at: new Date().toISOString(),
        });
      }
    }
    const { error } = await supabase
      .from('access_rules')
      .upsert(rows, { onConflict: 'tenant_id,page_key,role,action' });
    setSaving(false);
    if (error) { alert(error.message); return; }
    alert('Хадгаллаа.');
  }

  const applicableSpecial = SPECIAL_ACTIONS.filter((a) => a.pages.includes(activePage));
  const notApplicableSpecial = SPECIAL_ACTIONS.filter((a) => !a.pages.includes(activePage));

  return (
    <>
      <div className="ds-card p-4">
        <div className="flex flex-wrap gap-2">
          {PAGES.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePage(p.key)}
              className={`text-[12.5px] px-3 py-1.5 rounded-full border transition-colors ${
                activePage === p.key
                  ? 'bg-customBlue text-white border-customBlue'
                  : 'border-slate-200 dark:border-bordercol text-slate-600 dark:text-mutedtext hover:text-slate-900 dark:hover:text-white hover:border-customBlue'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ds-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] text-slate-500 dark:text-mutedtext">
            Роль олгох болон нууц үг тохируулах эрх үргэлж зүвхүн Админ-д хамаарна — серверийн Edge Function дээр хатуу шалгагддаг тул энд тохируулах боломжгүй.
          </div>
          <button className="ds-btn-primary shrink-0 ml-3" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-darktext text-sm py-8">Ачаалж байна...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-bordercol">
                  <th className="py-2 px-2 text-[10px] uppercase text-slate-400 dark:text-darktext">Үйлдэл</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="py-2 px-2 text-[10px] uppercase text-slate-400 dark:text-darktext text-center">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-bordercol/50">
                {STANDARD_ACTIONS.map((a) => (
                  <tr key={a.key}>
                    <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-white">{a.label}</td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="py-2.5 px-2 text-center">
                        <select
                          className={`ds-select text-center font-medium ${isAllowed(r.key, a.key) ? 'text-customGreen' : 'text-customRed'}`}
                          value={isAllowed(r.key, a.key) ? '1' : '2'}
                          onChange={(e) => setAllowed(r.key, a.key, e.target.value === '1')}
                        >
                          <option value="1">1 - Тийм</option>
                          <option value="2">2 - Үгүй</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
                {applicableSpecial.map((a) => (
                  <tr key={a.key}>
                    <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-white">{a.label}</td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="py-2.5 px-2 text-center">
                        <select
                          className={`ds-select text-center font-medium ${isAllowed(r.key, a.key) ? 'text-customGreen' : 'text-customRed'}`}
                          value={isAllowed(r.key, a.key) ? '1' : '2'}
                          onChange={(e) => setAllowed(r.key, a.key, e.target.value === '1')}
                        >
                          <option value="1">1 - Тийм</option>
                          <option value="2">2 - Үгүй</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
                {notApplicableSpecial.map((a) => (
                  <tr key={a.key} className="opacity-40 pointer-events-none select-none">
                    <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-white">
                      {a.label} <span className="font-normal text-[10px]">(хамаарахгүй)</span>
                    </td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="py-2.5 px-2 text-center">
                        <select className="ds-select text-center font-medium text-customRed" value="2" disabled>
                          <option value="2">2 - Үгүй</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog />
    </>
  );
}
