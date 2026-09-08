import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// "Засвар, үйлчилгээ" таб (FixedAssets.jsx)-ийн өгөгдөл+үйлдэл.
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
        .order('repair_date', { ascending: false })
    );
    setRepairs(data || []);
    setLoading(false);
  }, [hoaId]);

  useEffect(() => { load(); }, [load]);

  async function addRepair({ assetId, repairDate, amount, description, providerOrg }) {
    const { error } = await supabase.from('asset_repairs').insert({
      tenant_id: hoaId,
      asset_id: assetId,
      repair_date: repairDate,
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
    const thisMonth = repairs.filter((r) => (r.repair_date || '').slice(0, 7) === curYm);
    const thisMonthTotal = thisMonth.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { count: repairs.length, total, thisMonthCount: thisMonth.length, thisMonthTotal };
  }, [repairs]);

  return { repairs, loading, addRepair, stats, reload: load };
}
