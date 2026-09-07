import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// FixedAssets.jsx (жагсаалт+модаль) болон FixedAssetConfig.jsx (тохиргоо)
// хоёулаа Ангилал/Терел/Байршил лавлах жагсаалтыг адилхан ашигладаг тул
// нэг л hook-оор дамжуулна (Rule of two).
export function useFixedAssetConfig(hoaId) {
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!hoaId) return;
    setLoading(true);
    // 2026-09-07 (6): Ангилал/Терел одоо ГЛОБАЛ стандарт өгөгдөл
    // (tenant_id=NULL) тул tenant-аар шүүхгүй — бүх tenant ижил
    // жагсаалт харна. Байршил хэвээрээ tenant-аар шүүгдэнэ.
    const [cats, tps, locs] = await Promise.all([
      fetchAllRows(() => supabase.from('fixed_asset_categories').select('*').order('name')),
      fetchAllRows(() => supabase.from('fixed_asset_types').select('*').order('name')),
      fetchAllRows(() => supabase.from('fixed_asset_locations').select('*').eq('tenant_id', hoaId).order('name')),
    ]);
    setCategories(cats.data || []);
    setTypes(tps.data || []);
    setLocations(locs.data || []);
    setLoading(false);
  }, [hoaId]);

  useEffect(() => { reload(); }, [reload]);

  return { categories, types, locations, loading, reload };
}
