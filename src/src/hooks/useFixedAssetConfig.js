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
    const [cats, tps, locs] = await Promise.all([
      fetchAllRows(() => supabase.from('fixed_asset_categories').select('*').eq('tenant_id', hoaId).order('name')),
      fetchAllRows(() => supabase.from('fixed_asset_types').select('*').eq('tenant_id', hoaId).order('name')),
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
