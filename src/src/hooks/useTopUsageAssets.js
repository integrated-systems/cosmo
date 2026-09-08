import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { computeUsagePct } from '../lib/fixedAssetsFormat';

// "Хянах самбар"-ын "Ашиглалтын хугацаа дуусч буй Үндсэн хөрөнгө"
// карт (Dashboard.jsx) — Үндсэн хeрeнгийн бүртгэлтэй динамик холбов.
// computeUsagePct()-ыг ЦОРЫН ГАНЦ газраас (fixedAssetsFormat.js) дуудна
// (Rule of two — FixedAssetsTable.jsx/AssetInfoModal.jsx-тай ижил).
export function useTopUsageAssets(hoaId, limit = 5) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    setLoading(true);
    fetchAllRows(() =>
      supabase.from('fixed_assets')
        .select('id, name, purchase_price, capitalized_amount, salvage_value, accumulated_depreciation, status, type:fixed_asset_types(is_depreciable)')
        .eq('tenant_id', hoaId)
        .neq('status', 'written_off')
    ).then(({ data }) => {
      const withPct = (data || [])
        .map((a) => ({ ...a, usagePct: computeUsagePct(a) }))
        .filter((a) => a.usagePct != null)
        .sort((a, b) => b.usagePct - a.usagePct)
        .slice(0, limit);
      setAssets(withPct);
      setLoading(false);
    });
  }, [hoaId, limit]);

  return { assets, loading };
}
