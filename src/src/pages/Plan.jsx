import { Fragment, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// SUPERSYSADMIN "Plan" хуудас — Basic/Standard/Premium/Premium+
// багц бүр ямар модультой үүг тодорхойлдог интерактив матриц.
// package_features (ГЛОБАЛ, tenant_id үгүй) хүснэгэлээс уншиж,
// checkbox бүр дээр дарахад шууд (autosave, "Хадгалах" товч үгүй)
// Supabase рүү бичигдэнэ. Доод хэсэгт багц тус бүрийн эзэлхүүнийн
// хувийг (СИСАДМИН бүлгийг эс тооцвол) амьд тооцоолно.
const PKG_KEYS = [
  { key: 'basic', label: 'BASIC' },
  { key: 'standard', label: 'STANDARD' },
  { key: 'premium', label: 'PREMIUM' },
  { key: 'premium_plus', label: 'PREMIUM+' },
];
const PCT_EXCLUDE_SECTION = 'СИСАДМИН';

export default function Plan() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('package_features').select('*').order('sort_order')
    );
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggle(row, key) {
    const newValue = !row[key];
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [key]: newValue } : r)));
    const { error } = await supabase.from('package_features').update({ [key]: newValue }).eq('id', row.id);
    if (error) {
      window.alert(error.message);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [key]: !newValue } : r)));
    }
  }

  const sections = [];
  rows.forEach((r) => {
    let s = sections.find((s) => s.name === r.section);
    if (!s) { s = { name: r.section, items: [] }; sections.push(s); }
    s.items.push(r);
  });

  const totals = PKG_KEYS.map(({ key }) => {
    const counted = rows.filter((r) => r.section !== PCT_EXCLUDE_SECTION);
    const on = counted.filter((r) => r[key]).length;
    return counted.length > 0 ? Math.round((on / counted.length) * 100) : 0;
  });

  if (loading) return <div className="ds-card p-6 text-center text-[12px] text-mutedtext">Ачаалж байна...</div>;

  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto overscroll-contain">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3">МОДУЛЬ</th>
              <th className="py-2.5 px-3 w-[70px] text-center">DONE</th>
              {PKG_KEYS.map((p) => (
                <th key={p.key} className="py-2.5 px-3 w-[100px] text-center">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {sections.map((s) => (
              <Fragment key={s.name}>
                <tr key={s.name} className="bg-slate-100 dark:bg-white/[0.03]">
                  <td colSpan={2 + PKG_KEYS.length} className="py-2 px-3 text-[11px] font-semibold tracking-wide text-mutedtext uppercase">
                    {s.name}
                  </td>
                </tr>
                {s.items.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3 whitespace-nowrap">{r.feature_label}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${r.is_done ? 'bg-customGreen' : 'bg-slate-300 dark:bg-white/10'}`} />
                    </td>
                    {PKG_KEYS.map((p) => (
                      <td key={p.key} className="py-2 px-3 text-center">
                        <input type="checkbox" checked={!!r[p.key]} onChange={() => toggle(r, p.key)} className="w-4 h-4 cursor-pointer" />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 dark:border-bordercol bg-slate-100 dark:bg-white/[0.03] font-semibold">
              <td className="py-2.5 px-3">Нийт (СИСАДМИН эс тооцвол)</td>
              <td></td>
              {totals.map((pct, i) => (
                <td key={i} className="py-2.5 px-3 text-center">{pct}%</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
