import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// "Элэгдэл" таб (FixedAssets.jsx)-ийн өгөгдөл+үйлдэл — hook болгож
// гаргасан нь Toolbar/Таб товч/Статистик карт/Хүснэгэл дарааллыг
// FixedAssets.jsx дотор чөлөөтэй зохион байгуулах боломж өгнө (Rule
// of two — DepreciationTab.jsx компонент дотор шигтгэвэл дараалал
// өөрчлөхөд хэцүү болно).
export function useDepreciationPostings(hoaId) {
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!hoaId) return;
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
  }, [hoaId]);

  useEffect(() => { load(); }, [load]);

  async function postCurrentMonth() {
    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    setPosting(true);
    const { data, error } = await supabase.rpc('post_monthly_depreciation', { p_tenant_id: hoaId, p_period: period });
    setPosting(false);
    if (error) throw error;
    await load();
    return data?.length || 0;
  }

  const stats = useMemo(() => {
    const total = postings.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const now = new Date();
    const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthAmount = postings
      .filter((p) => (p.period || '').slice(0, 7) === curYm)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const latestPeriod = postings[0]?.period || null;
    return { count: postings.length, total, thisMonthAmount, latestPeriod };
  }, [postings]);

  return { postings, loading, posting, postCurrentMonth, stats, reload: load };
}
