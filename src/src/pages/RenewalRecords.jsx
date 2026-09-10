import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney, formatDateTimeMinutes } from '../lib/format';
import { usePlans } from '../hooks/usePlans';

// SUPERSYSADMIN "Renewal records" хуудас — 2026-09-08 (30): Багцын
// шилжилтийн түүх (audit_log, action='change_plan' — өмнeec
// log_audit_event-ээр аль хэдийн бүртгэгддэг байсан тул шинэ
// хүснэгэл үүсгэх шаардлагагүй) болон Төлбөр төлөлтийн түүх
// (payment_records) хоёрыг Tenant-аар шүүж харуулна.
export default function RenewalRecords() {
  const { plans } = usePlans();
  const [tenants, setTenants] = useState([]);
  const [planChanges, setPlanChanges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tenantFilter, setTenantFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: tenantRows }, { data: auditRows }, { data: paymentRows }] = await Promise.all([
        fetchAllRows(() => supabase.from('tenants').select('id, name')),
        fetchAllRows(() => supabase.from('audit_log').select('*').eq('action', 'change_plan').order('created_at', { ascending: false })),
        fetchAllRows(() => supabase.from('payment_records').select('*').order('marked_at', { ascending: false })),
      ]);
      setTenants(tenantRows || []);
      setPlanChanges(auditRows || []);
      setPayments(paymentRows || []);
      setLoading(false);
    }
    load();
  }, []);

  const tenantName = (id) => tenants.find((t) => t.id === id)?.name || id;
  const planLabel = (key) => plans.find((p) => p.key === key)?.label || key;

  const filteredChanges = tenantFilter ? planChanges.filter((r) => r.tenant_id === tenantFilter) : planChanges;
  const filteredPayments = tenantFilter ? payments.filter((r) => r.tenant_id === tenantFilter) : payments;

  if (loading) return <div className="ds-card p-6 text-center text-[12px] text-mutedtext">Ачаалж байна...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="ds-toolbar">
        <select className="ds-select min-w-[220px]" value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
          <option value="">Бүх СӨХ</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div>
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Багцын шилжилтийн түүх</div>
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto overscroll-contain">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3">ОГНОО</th>
                  <th className="py-2.5 px-3">СӨХ</th>
                  <th className="py-2.5 px-3">ШИНЭ БАГЦ</th>
                  <th className="py-2.5 px-3">ХИЙСЭН ХЭРЭГЛЭГЧ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {filteredChanges.length === 0 && (
                  <tr><td colSpan={4} className="py-6 px-3 text-center text-mutedtext text-[12px]">Мэдээлэл алга</td></tr>
                )}
                {filteredChanges.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeMinutes(r.created_at)}</td>
                    <td className="py-2.5 px-3">{r.target_name || tenantName(r.tenant_id)}</td>
                    <td className="py-2.5 px-3 font-medium">{planLabel(r.details?.new_plan)}</td>
                    <td className="py-2.5 px-3 text-mutedtext">{r.actor_email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Төлбөр төлөлтийн түүх</div>
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto overscroll-contain">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3">ОГНОО</th>
                  <th className="py-2.5 px-3">СӨХ</th>
                  <th className="py-2.5 px-3">БАГЦ</th>
                  <th className="py-2.5 px-3 text-right">ДүН</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {filteredPayments.length === 0 && (
                  <tr><td colSpan={4} className="py-6 px-3 text-center text-mutedtext text-[12px]">Мэдээлэл алга</td></tr>
                )}
                {filteredPayments.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeMinutes(r.marked_at)}</td>
                    <td className="py-2.5 px-3">{tenantName(r.tenant_id)}</td>
                    <td className="py-2.5 px-3">{planLabel(r.plan_key)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{formatMoney(r.amount)}₮</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
