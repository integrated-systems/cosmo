import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// "Тооллого" таб (FixedAssets.jsx) — QR-аар скандаж эсвэл гараар
// тэмдэглэж "олдсон" гэж бүртгэдэг физик инвентаризацийн систем.
// start_inventory_count() RPC (SECURITY DEFINER, дотроо эрх шалгадаг)
// идэвхтэй хөрөнгийн жагсаалтыг автоматаар үүсгэнэ.
// 2026-09-08 (2): asset join-д status/location_id/responsible_position_id
// нэмэв (Үндсэн хөрөнгийн жагсаалт таб-тай ижил Төлөв/Хариуцагч/Байршил
// шүүлтүүр хийхэд шаардлагатай). Мөн "Тооллогын түүх" дэд табанд
// дуусгасан тооллогуудын үр дүнг үзүүлэхийн тулд loadCountItems()
// нэмэв.
export function useInventoryCount(hoaId) {
  const [counts, setCounts] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const ITEM_SELECT = '*, asset:fixed_assets(id, name, barcode, status, location_id, responsible_position_id)';

  const load = useCallback(async () => {
    if (!hoaId) return;
    setLoading(true);
    const { data: countsData } = await fetchAllRows(() =>
      supabase.from('inventory_counts').select('*').eq('tenant_id', hoaId).order('started_at', { ascending: false })
    );
    setCounts(countsData || []);

    const active = (countsData || []).find((c) => c.status === 'in_progress');
    if (active) {
      const { data: itemsData } = await fetchAllRows(() =>
        supabase.from('inventory_count_items').select(ITEM_SELECT).eq('count_id', active.id)
      );
      setItems(itemsData || []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [hoaId]);

  useEffect(() => { load(); }, [load]);

  const activeCount = useMemo(() => counts.find((c) => c.status === 'in_progress') || null, [counts]);
  const completedCounts = useMemo(
    () => counts.filter((c) => c.status === 'completed').sort((a, b) => new Date(b.started_at) - new Date(a.started_at)),
    [counts]
  );

  async function startCount() {
    setStarting(true);
    const { error } = await supabase.rpc('start_inventory_count', { p_tenant_id: hoaId });
    setStarting(false);
    if (error) throw error;
    await load();
  }

  async function markFound(assetId) {
    if (!activeCount) return;
    const { error } = await supabase.from('inventory_count_items')
      .update({ found: true, found_at: new Date().toISOString() })
      .eq('count_id', activeCount.id)
      .eq('asset_id', assetId);
    if (error) throw error;
    await load();
  }

  async function completeCount() {
    if (!activeCount) return;
    const { error } = await supabase.from('inventory_counts')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', activeCount.id);
    if (error) throw error;
    await load();
  }

  async function loadCountItems(countId) {
    if (!countId) { setHistoryItems([]); return; }
    setHistoryLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('inventory_count_items').select(ITEM_SELECT).eq('count_id', countId)
    );
    setHistoryItems(data || []);
    setHistoryLoading(false);
  }

  const foundAssetIds = useMemo(() => new Set(items.filter((i) => i.found).map((i) => i.asset_id)), [items]);

  return {
    counts, items, activeCount, completedCounts, loading, starting,
    startCount, markFound, completeCount, foundAssetIds,
    historyItems, historyLoading, loadCountItems,
  };
}
