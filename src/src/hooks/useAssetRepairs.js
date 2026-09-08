import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// "Засвар, үйлчилгээ" таб (FixedAssets.jsx)-ийн өгөгдөл+үйлдэл.
// 2026-09-08 (2): repair_date -> start_date, end_date шинээр нэмэв.
export function useAssetRepairs(hoaId) {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hoaId) return;
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('asset_repairs')
        .select('*, asset:fixed_assets(id, name, barcode)')
        .eq('tenant_id', hoaId)
        .order('start_date', { ascending: false })
    );
    setRepairs(data || []);
    setLoading(false);
  }, [hoaId]);

  useEffect(() => { load(); }, [load]);

  async function addRepair({ assetId, startDate, endDate, amount, description, providerOrg }) {
    const { error } = await supabase.from('asset_repairs').insert({
      tenant_id: hoaId,
      asset_id: assetId,
      start_date: startDate,
      end_date: endDate || null,
      amount: amount !== '' ? Number(amount) : 0,
      description: description || null,
      provider_org: providerOrg || null,
    });
    if (error) throw error;
    await load();
  }

  const stats = useMemo(() => {
    const total = repairs.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const now = new Date();
    const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = repairs.filter((r) => (r.start_date || '').slice(0, 7) === curYm);
    const thisMonthTotal = thisMonth.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { count: repairs.length, total, thisMonthCount: thisMonth.length, thisMonthTotal };
  }, [repairs]);

  // Одоо идэвхтэй (эхэлсэн - дууссан хугацаанд, дуусаагүй бол
  // хугацаагүй үргэлжилсэнд тооцно) засвартай хeрeнгийн ID-ийн Set —
  // FixedAssetsTable/AssetInfoModal-ийн "Тeлeв" баганад "Засварт"
  // (custom оранж) гэж автоматаар давхарлаж харуулахад ашиглана.
  const activeRepairAssetIds = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const set = new Set();
    repairs.forEach((r) => {
      if (!r.start_date) return;
      const started = r.start_date <= todayStr;
      const notEndedYet = !r.end_date || r.end_date >= todayStr;
      if (started && notEndedYet) set.add(r.asset_id);
    });
    return set;
  }, [repairs]);

  return { repairs, loading, addRepair, stats, activeRepairAssetIds, reload: load };
}
