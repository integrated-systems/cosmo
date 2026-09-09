import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney, formatDate } from '../lib/format';

// SUPERSYSADMIN "Billing" хуудас — 2026-09-08 (17): багц бүрийн НЭГ
// ТООТОД ногдох сарын үнэ (package_prices) болон tenant бүрийн
// бүртгэлтэй тоотын тоо (owners хүснэгэлээс COUNT)-ыг үржүүлж, сарын
// төлбөрийг тооцно. tenants.plan_key-г шууд шинэчилдэг (autosave).
// 2026-09-08 (18): UI-г бүрэн дуусгах үе шат — Төлбөрийн төлөв/
// Дараагийн огноо/Тэмдэглэл 3 талбарыг ГАРААР удирддаг байдлаар
// сэргээв (bilинг_status/billing_next_date/billing_note, migration
// 0104). "Тэмдэглэл" бол зөвхөн мөрөө дагасан чөлөөт текст —
// хаанаас ч дуудагдахгүй, хаашаа ч дуудагддаггүй. Бодит нэхэмжлэх/
// төлбөрийн автомат систем ХАРААХАН ХОЛБОГДООГүй — үүнийг ирээдүйд
// цэгцэлнэ (хэрэглэгчийн тодорхой заасны дагуу).
const PLAN_KEYS = ['basic', 'standard', 'premium', 'premium_plus'];
const PLAN_LABELS = { basic: 'BASIC', standard: 'STANDARD', premium: 'PREMIUM', premium_plus: 'PREMIUM+' };
const STATUS_OPTIONS = [
  { key: 'paid', label: 'Төлөгдсөн', className: 'text-customGreen' },
  { key: 'pending', label: 'Хүлээгдэж буй', className: 'text-customOrange' },
  { key: 'overdue', label: 'Хугацаа хэтэрсэн', className: 'text-customRed' },
];

export default function Billing() {
  const [prices, setPrices] = useState({});
  const [tenants, setTenants] = useState([]);
  const [unitCounts, setUnitCounts] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: priceRows }, { data: tenantRows }, { data: ownerRows }] = await Promise.all([
      supabase.from('package_prices').select('*'),
      fetchAllRows(() => supabase.from('tenants').select('id, name, plan_key, status, billing_status, billing_next_date, billing_note')),
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

  async function updateTenantField(tenantId, field, value) {
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, [field]: value } : t)));
    const { error } = await supabase.from('tenants').update({ [field]: value }).eq('id', tenantId);
    if (error) window.alert(error.message);
  }

  function handleInvoiceClick() {
    window.alert('Нэхэмжлэх үүсгэх урсгал хараахан хэрэгжээгүй байна — ирээдүйд нэмэгдэнэ.');
  }

  function monthlyTotal(t) {
    const price = prices[t.plan_key] || 0;
    const units = unitCounts[t.id] || 0;
    return price * units;
  }

  const mrr = tenants.reduce((s, t) => s + monthlyTotal(t), 0);
  const planCounts = {};
  tenants.forEach((t) => { if (PLAN_KEYS.includes(t.plan_key)) planCounts[t.plan_key] = (planCounts[t.plan_key] || 0) + 1; });
  const pendingCount = tenants.filter((t) => t.billing_status === 'pending').length;
  const overdueCount = tenants.filter((t) => t.billing_status === 'overdue').length;

  if (loading) return <div className="ds-card p-6 text-center text-[12px] text-mutedtext">Ачаалж байна...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Багцын нэг тоотын үнэ (жишээ)</div>
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
        <div className="grid grid-cols-4 gap-[10px]">
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Сарын нийт орлого (MRR)</div>
            <div className="text-[19px] font-bold">{formatMoney(mrr)}₮</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Идэвхтэй tenant</div>
            <div className="text-[19px] font-bold mb-1.5">{tenants.length}</div>
            <div className="flex flex-wrap gap-1">
              {PLAN_KEYS.map((k) => (
                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-mutedtext">
                  {PLAN_LABELS[k]}: {planCounts[k] || 0}
                </span>
              ))}
            </div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Хүлээгдэж буй төлбөр</div>
            <div className="text-[19px] font-bold text-customOrange">{pendingCount}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Хугацаа хэтэрсэн</div>
            <div className="text-[19px] font-bold text-customRed">{overdueCount}</div>
          </div>
        </div>
      </div>

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">БАЙГУУЛЛАГА</th>
                <th className="py-2.5 px-3 w-[90px] text-center">ТООТЫН ТОО</th>
                <th className="py-2.5 px-3 w-[140px]">БАГЦ</th>
                <th className="py-2.5 px-3 w-[160px] text-right">САРЫН ТөЛБөР</th>
                <th className="py-2.5 px-3 w-[150px]">ТөЛБөРИЙН ТөЛөВ</th>
                <th className="py-2.5 px-3 w-[130px]">ДАРААГИЙН ОГНОО</th>
                <th className="py-2.5 px-3 w-[180px]">ТЭМДЭГЛЭЛ</th>
                <th className="py-2.5 px-3 w-[100px] text-right">үЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{t.name}</td>
                  <td className="py-2.5 px-3 text-center text-mutedtext">{unitCounts[t.id] || 0}</td>
                  <td className="py-2.5 px-3">
                    <select
                      className="ds-select"
                      value={PLAN_KEYS.includes(t.plan_key) ? t.plan_key : ''}
                      onChange={(e) => updateTenantField(t.id, 'plan_key', e.target.value)}
                    >
                      {!PLAN_KEYS.includes(t.plan_key) && <option value="">{t.plan_key || '—'}</option>}
                      {PLAN_KEYS.map((k) => <option key={k} value={k}>{PLAN_LABELS[k]}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="font-semibold">{formatMoney(monthlyTotal(t))}₮</div>
                    <div className="text-[10.5px] text-mutedtext">{formatMoney(prices[t.plan_key] || 0)}₮ × {unitCounts[t.id] || 0} тоот</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      className={`ds-select font-semibold ${STATUS_OPTIONS.find((s) => s.key === t.billing_status)?.className || ''}`}
                      value={t.billing_status || 'paid'}
                      onChange={(e) => updateTenantField(t.id, 'billing_status', e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="date" className="ds-input w-full text-[12px]"
                      value={t.billing_next_date || ''}
                      onChange={(e) => updateTenantField(t.id, 'billing_next_date', e.target.value || null)}
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text" className="ds-input w-full text-[12px]" placeholder="Тэмдэглэл бичих..."
                      defaultValue={t.billing_note || ''}
                      onBlur={(e) => { if (e.target.value !== (t.billing_note || '')) updateTenantField(t.id, 'billing_note', e.target.value || null); }}
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button className="ds-btn-secondary" onClick={handleInvoiceClick}>Нэхэмжлэх</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ds-card p-3 text-[11.5px] text-mutedtext leading-relaxed">
        <b className="text-slate-900 dark:text-white">Тэмдэглэл</b> — Тоотын тоог <code>owners</code> хүснэгэлээс бодитоор тоолсон. Төлбөрийн төлөв, дараагийн огноо, тэмдэглэл одоохондоо SUPERSYSADMIN гараар бөглөдөг талбар — нэхэмжлэх үүсгэх, төлбөр хүлээн авах автомат систем ирээдүйн ажил.
      </div>
    </div>
  );
}
