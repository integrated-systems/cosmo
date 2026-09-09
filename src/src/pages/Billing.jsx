import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney } from '../lib/format';

// SUPERSYSADMIN "Billing" хуудас — 2026-09-08 (17): багц бүрийн НЭГ
// ТООТОД ногдох сарын үнэ (package_prices) болон tenant бүрийн
// бүртгэлтэй тоотын тоо (owners хүснэгэлээс COUNT)-ыг үржүүлж, сарын
// төлбөрийг тооцно. tenants.plan_key-г шууд шинэчилдэг (autosave).
const PLAN_KEYS = ['basic', 'standard', 'premium', 'premium_plus'];
const PLAN_LABELS = { basic: 'BASIC', standard: 'STANDARD', premium: 'PREMIUM', premium_plus: 'PREMIUM+' };

export default function Billing() {
  const [prices, setPrices] = useState({});
  const [tenants, setTenants] = useState([]);
  const [unitCounts, setUnitCounts] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: priceRows }, { data: tenantRows }, { data: ownerRows }] = await Promise.all([
      supabase.from('package_prices').select('*'),
      fetchAllRows(() => supabase.from('tenants').select('id, name, plan_key, status')),
      fetchAllRows(() => supabase.from('owners').select('tenant_id')),
    ]);

    const priceMap = {};
    (priceRows || []).forEach((p) => { priceMap[p.plan_key] = Number(p.price_per_unit) || 0; });
    setPrices(priceMap);

    const counts = {};
    (ownerRows || []).forEach((o) => { counts[o.tenant_id] = (counts[o.tenant_id] || 0) + 1; });
    setUnitCounts(counts);

    setTenants(tenantRows || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updatePrice(planKey, value) {
    const num = Number(value) || 0;
    setPrices((prev) => ({ ...prev, [planKey]: num }));
    const { error } = await supabase.from('package_prices').update({ price_per_unit: num }).eq('plan_key', planKey);
    if (error) window.alert(error.message);
  }

  async function updateTenantPlan(tenantId, planKey) {
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, plan_key: planKey } : t)));
    const { error } = await supabase.from('tenants').update({ plan_key: planKey }).eq('id', tenantId);
    if (error) window.alert(error.message);
  }

  function monthlyTotal(t) {
    const price = prices[t.plan_key] || 0;
    const units = unitCounts[t.id] || 0;
    return price * units;
  }

  const mrr = tenants.reduce((s, t) => s + monthlyTotal(t), 0);

  if (loading) return <div className="ds-card p-6 text-center text-[12px] text-mutedtext">Ачаалж байна...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Багцын нэг тоотын үнэ</div>
        <div className="grid grid-cols-4 gap-[10px]">
          {PLAN_KEYS.map((k) => (
            <div key={k} className="ds-card p-3">
              <div className="text-[11px] text-mutedtext mb-1.5">{PLAN_LABELS[k]}</div>
              <div className="flex items-baseline gap-1.5">
                <input
                  type="number" min="0" step="100"
                  className="ds-input w-20 text-[17px] font-bold"
                  value={prices[k] ?? 0}
                  onChange={(e) => updatePrice(k, e.target.value)}
                />
                <span className="text-[11px] text-mutedtext">₮ / тоот / сар</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Тойм</div>
        <div className="grid grid-cols-3 gap-[10px]">
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Сарын нийт орлого (MRR)</div>
            <div className="text-[19px] font-bold">{formatMoney(mrr)}₮</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Нийт tenant</div>
            <div className="text-[19px] font-bold">{tenants.length}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Нийт бүртгэлтэй тоот</div>
            <div className="text-[19px] font-bold">{Object.values(unitCounts).reduce((s, n) => s + n, 0)}</div>
          </div>
        </div>
      </div>

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">БАЙГУУЛЛАГА</th>
                <th className="py-2.5 px-3 w-[100px] text-center">ТООТЫН ТОО</th>
                <th className="py-2.5 px-3 w-[150px]">БАГЦ</th>
                <th className="py-2.5 px-3 w-[170px] text-right">САРЫН ТөЛБөР</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{t.name}</td>
                  <td className="py-2.5 px-3 text-center text-mutedtext">{unitCounts[t.id] || 0}</td>
                  <td className="py-2.5 px-3">
                    <select
                      className="ds-select"
                      value={PLAN_KEYS.includes(t.plan_key) ? t.plan_key : ''}
                      onChange={(e) => updateTenantPlan(t.id, e.target.value)}
                    >
                      {!PLAN_KEYS.includes(t.plan_key) && <option value="">{t.plan_key || '—'}</option>}
                      {PLAN_KEYS.map((k) => <option key={k} value={k}>{PLAN_LABELS[k]}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="font-semibold">{formatMoney(monthlyTotal(t))}₮</div>
                    <div className="text-[10.5px] text-mutedtext">{formatMoney(prices[t.plan_key] || 0)}₮ × {unitCounts[t.id] || 0} тоот</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ds-card p-3 text-[11.5px] text-mutedtext leading-relaxed">
        <b className="text-slate-900 dark:text-white">Тэмдэглэл</b> — Тоотын тоог `owners` хүснэгэлээс бодитоор тоолсон. Төлбөрийн төлөв (төлөгдсөн/хүлээгдэж буй/хугацаа хэтэрсэн) болон нэхэмжлэх үүсгэх урсгал ирээдүйн ажил.
      </div>
    </div>
  );
}
