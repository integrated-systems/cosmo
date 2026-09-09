import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// "Засвар, үйлчилгээ" таб (FixedAssets.jsx)-ийн өгөгдөл+үйлдэл.
// 2026-09-08 (2): repair_date -> start_date, end_date шинээр нэмэв.
// 2026-09-08 (4): Капиталжуулах засвар — is_capitalized=true үед
// үнэ дүнг fixed_assets.capitalized_amount-д нэмж, сунгах сар зааж
// үгвэл useful_life_months-ийг ч нэмэгдүүлнэ. Мвн totalSpentByAsset
// (хөрөнгэ тус бүрийн нийт зарцуулсан дүн) нэмэв — Засвар үйлчилгээний
// хүснэгэлийн "НИЙТ ЗАРЦУУЛСАН" баганад ашиглана.
export function useAssetRepairs(hoaId) {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hoaId) return;
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('asset_repairs')
        .select('*, asset:fixed_assets(id, name, barcode, purchase_price)')
        .eq('tenant_id', hoaId)
        .order('start_date', { ascending: false })
    );
    setRepairs(data || []);
    setLoading(false);
  }, [hoaId]);

  useEffect(() => { load(); }, [load]);

  async function addRepair({ assetId, startDate, endDate, amount, description, providerOrg, isCapitalized, extendMonths }) {
    const amountNum = amount !== '' ? Number(amount) : 0;
    const { error } = await supabase.from('asset_repairs').insert({
      tenant_id: hoaId,
      asset_id: assetId,
      start_date: startDate,
      end_date: endDate || null,
      amount: amountNum,
      description: description || null,
      provider_org: providerOrg || null,
      is_capitalized: !!isCapitalized,
      extend_months: isCapitalized && extendMonths !== '' ? Number(extendMonths) : null,
    });
    if (error) throw error;

    if (isCapitalized) {
      const { data: asset, error: fetchErr } = await supabase.from('fixed_assets')
        .select('capitalized_amount, useful_life_months')
        .eq('id', assetId)
        .single();
      if (!fetchErr && asset) {
        const extra = extendMonths !== '' ? Number(extendMonths) : 0;
        const { error: updateErr } = await supabase.from('fixed_assets').update({
          capitalized_amount: (Number(asset.capitalized_amount) || 0) + amountNum,
          useful_life_months: extra > 0 ? (Number(asset.useful_life_months) || 0) + extra : asset.useful_life_months,
        }).eq('id', assetId);
        if (updateErr) throw updateErr;
      }
    }

    await load();
  }

  async function markRepairComplete(repairId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('asset_repairs').update({ end_date: todayStr }).eq('id', repairId);
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

  // Хөрөнгэ тус бүрийн НИЙТ зарцуулсан засварын дүн — Худалдан авсан
  // үнээс давсан хандлагыг эртнээс анзаарахад ашиглана (2026-09-08 (4)).
  const totalSpentByAsset = useMemo(() => {
    const map = new Map();
    repairs.forEach((r) => {
      map.set(r.asset_id, (map.get(r.asset_id) || 0) + (Number(r.amount) || 0));
    });
    return map;
  }, [repairs]);

  // Одоо идэвхтэй (эхэлсэн - дууссан хугацаанд, дуусаагүй бол
  // хугацаагүй үргэлжилсэнд тооцно) засвартай хөрөнгийн ID-ийн Set —
  // FixedAssetsTable/AssetInfoModal-ийн "Төлөв" баганад "Засварт"
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

  return { repairs, loading, addRepair, markRepairComplete, stats, activeRepairAssetIds, totalSpentByAsset, reload: load };
}
