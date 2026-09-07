import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatDate, formatMoney } from '../lib/format';
import { DEPRECIATION_METHODS } from '../lib/fixedAssetsFormat';
import { useConfirm } from '../hooks/useConfirm';

// "Элэгдэл" таб (FixedAssets.jsx) — 2026-09-08: "Батлах" үйлдэл
// post_monthly_depreciation() RPC-г дуудаж, тухайн сарын элэгдлийг
// ЦОРЫН ГАНЦ удаа (asset_id, period) unique index-ээр хамгаалагдсан
// байдлаар бичнэ. Батлагдсан бүртгэл ДАХИН ӨӨРЧЛӨГДӨХГүй (НББ-ийн
// "хаагдсан үе" зарчим) — зөвхөн шинэ үеийг НЭМЖ болно.
export default function DepreciationTab({ hoaId }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('depreciation_postings')
        .select('*, asset:fixed_assets(id, name, barcode)')
        .eq('tenant_id', hoaId)
        .order('period', { ascending: false })
        .order('created_at', { ascending: false })
    );
    setPostings(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  async function handlePost() {
    const today = new Date();
    const periodLabel = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`;
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    if (!(await confirm(`Энэ сарын (${periodLabel}) элэгдлийг батлах уу? Батлагдсаны дараа буцаах боломжгүй.`))) return;
    setPosting(true);
    const { data, error } = await supabase.rpc('post_monthly_depreciation', { p_tenant_id: hoaId, p_period: period });
    setPosting(false);
    if (error) { window.alert(error.message); return; }
    window.alert(`${data?.length || 0} хeрeнгийн элэгдэл батлагдлаа.`);
    load();
  }

  return (
    <>
      <div className="ds-toolbar justify-between">
        <div className="text-[11.5px] text-mutedtext">Сар бүр НЭГ л удаа батлагдана — давхар батлахыг систем зeвшeeрeхгүй.</div>
        <button className="ds-btn-primary" disabled={posting} onClick={handlePost}>{posting ? 'Батлаж байна...' : '+ Энэ сарын элэгдлийг батлах'}</button>
      </div>

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3 w-[100px]">үЕ</th>
                <th className="py-2.5 px-3">ХӨРӨНГӨ</th>
                <th className="py-2.5 px-3 w-[150px]">АРГАЧЛАЛ</th>
                <th className="py-2.5 px-3 w-[130px] text-right">ДүН</th>
                <th className="py-2.5 px-3 w-[140px]">БАТАЛСАН ОГНОО</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading && <tr><td colSpan={5} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>}
              {!loading && postings.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-darktext">Батлагдсан элэгдэл алга</td></tr>
              )}
              {!loading && postings.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 px-3">{formatDate(p.period)}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{p.asset?.name || '—'}</td>
                  <td className="py-2.5 px-3">{DEPRECIATION_METHODS[p.method_used] || p.method_used || '—'}</td>
                  <td className="py-2.5 px-3 text-right">{formatMoney(p.amount)}₮</td>
                  <td className="py-2.5 px-3">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog />
    </>
  );
}
