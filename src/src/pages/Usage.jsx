import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatDate } from '../lib/format';
import { usePlans } from '../hooks/usePlans';

// SUPERSYSADMIN "Usage" хуудас — 2026-09-08 (31): Supabase-ийн дэд
// бүтцийн хэрэглээ (file storage, egress г.м.) БИШ, харин Cosmo
// БүТЭЭГДЭХүүНИЙ бодит хэрэглээг (tenant тус бүрийн мэдээллийн
// эзлэхүүн) харуулна. Management API/PAT шаардахгүй тул нэмэлт
// аюулгүй байдлын эрсдэлгүй — зөвхөн одоо байгаа RLS/SUPERSYSADMIN
// загвараар ажиллана.
export default function Usage() {
  const { plans } = usePlans();
  const [tenants, setTenants] = useState([]);
  const [ownerCounts, setOwnerCounts] = useState({});
  const [unitCounts, setUnitCounts] = useState({});
  const [assetCounts, setAssetCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: tenantRows }, { data: ownerRows }, { data: unitRows }, { data: assetRows }] = await Promise.all([
        fetchAllRows(() => supabase.from('tenants').select('id, name, plan_key, created_at')),
        fetchAllRows(() => supabase.from('owners').select('tenant_id')),
        fetchAllRows(() => supabase.from('unit_layouts').select('tenant_id')),
        fetchAllRows(() => supabase.from('fixed_assets').select('tenant_id')),
      ]);
      setTenants(tenantRows || []);
      const countBy = (rows) => {
        const m = {};
        (rows || []).forEach((r) => { m[r.tenant_id] = (m[r.tenant_id] || 0) + 1; });
        return m;
      };
      setOwnerCounts(countBy(ownerRows));
      setUnitCounts(countBy(unitRows));
      setAssetCounts(countBy(assetRows));
      setLoading(false);
    }
    load();
  }, []);

  const planLabel = (key) => plans.find((p) => p.key === key)?.label || key || '—';

  const totalOwners = Object.values(ownerCounts).reduce((s, n) => s + n, 0);
  const totalUnits = Object.values(unitCounts).reduce((s, n) => s + n, 0);
  const totalAssets = Object.values(assetCounts).reduce((s, n) => s + n, 0);
  const maxUnits = Math.max(1, ...tenants.map((t) => unitCounts[t.id] || 0));

  if (loading) return <div className="ds-card p-6 text-center text-[12px] text-mutedtext">Ачаалж байна...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-[10px]">
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Нийт tenant</div>
          <div className="text-[19px] font-bold">{tenants.length}</div>
        </div>
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Нийт бүртгэлтэй тоот</div>
          <div className="text-[19px] font-bold">{totalUnits}</div>
        </div>
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Нийт өмчлөгч</div>
          <div className="text-[19px] font-bold">{totalOwners}</div>
        </div>
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Нийт үндсэн хөрөнгө</div>
          <div className="text-[19px] font-bold">{totalAssets}</div>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Tenant тус бүрийн хэрэглээ</div>
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto overscroll-contain">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3">БАЙГУУЛЛАГА</th>
                  <th className="py-2.5 px-3">БАГЦ</th>
                  <th className="py-2.5 px-3">БҮРТГҮҮЛСЭН ОГНОО</th>
                  <th className="py-2.5 px-3 w-[220px]">ТООТ</th>
                  <th className="py-2.5 px-3 text-center w-[90px]">ӨМЧЛӨГЧ</th>
                  <th className="py-2.5 px-3 text-center w-[110px]">ҮНДСЭН ХӨРӨНГӨ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {tenants.map((t) => {
                  const units = unitCounts[t.id] || 0;
                  const pct = Math.round((units / maxUnits) * 100);
                  return (
                    <tr key={t.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{t.name}</td>
                      <td className="py-2.5 px-3">{planLabel(t.plan_key)}</td>
                      <td className="py-2.5 px-3 text-mutedtext whitespace-nowrap">{formatDate(t.created_at)}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div className="h-full bg-customBlue rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-mutedtext w-8 text-right">{units}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">{ownerCounts[t.id] || 0}</td>
                      <td className="py-2.5 px-3 text-center">{assetCounts[t.id] || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="ds-card p-3 text-[11.5px] text-mutedtext leading-relaxed">
        <b className="text-slate-900 dark:text-white">Тэмдэглэл</b> — Энэ хуудас Cosmo бүтээгдэхүүний хэрэглээг (tenant бүрийн мэдээллийн эзлэхүүн) харуулна, Supabase дэд бүтцийн хэрэглээ (file storage, egress г.м.) БИШ — үүнийг Supabase Dashboard-аас шалгана уу.
      </div>
    </div>
  );
}
