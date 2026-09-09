import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
// "Элэгдэл" таб (FixedAssets.jsx)-ийн өгөгдөл+үйлдэл — hook болгож
// гаргасан нь Toolbar/Таб товч/Статистик карт/Хүснэгэл дарааллыг
// FixedAssets.jsx дотор чөлөөтэй зохион байгуулах боломж өгнө (Rule
// of two — DepreciationTab.jsx компонент дотор шигтгэвэл дараалал
// өөрчлөхөд хэцүү болно).
// 2026-09-08 (9): Хэрэглэгчийн заасны дагуу "Элэгдлийг тооцоолох"
// товчийг бүрэн арилгаж, ЭНЭ hook нь mount бүрт чимээгүй (идэмпотэнт)
// автоматаар тухайн сарыг шалгаж, хараахан батлагдаагүй бол шууд
// батлана. Posting/ledger архитектур (audit trail, хаагдсан үе дахин
// өөрчлөгддөггүй зарчим) бүрэн хэвээр үлдэнэ — зөвхөн үйлдлийг
// автоматжуулсан (харна уу: FixedAssets.jsx-д товч байхгүй болсон).
export function useDepreciationPostings(hoaId, onPosted) {
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hoaId) return;
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('depreciation_postings')
        .select('*, asset:fixed_assets(id, name, barcode, location_id, responsible_position_id)')
        .eq('tenant_id', hoaId)
        .order('period', { ascending: false })
        .order('created_at', { ascending: false })
    );
    setPostings(data || []);
    setLoading(false);
  }, [hoaId]);

  async function postCurrentMonth() {
    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const { data, error } = await supabase.rpc('post_monthly_depreciation', { p_tenant_id: hoaId, p_period: period });
    if (error) throw error;
    await load();
    if (data?.length > 0) onPosted?.();
    return data?.length || 0;
  }

  useEffect(() => {
    if (!hoaId) return;
    // Чимээгүй, автомат — амжилтгүй болвол (жиш эрхийн хүрээнд биш
    // хэрэглэгч) алдаа үзүүлэхгүй, зүгээр л одоо байгаа мэдээллийг
    // ачаална.
    (async () => {
      try {
        await postCurrentMonth();
      } catch {
        await load();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  return { postings, loading, postCurrentMonth, reload: load };
}
