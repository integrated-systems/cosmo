import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-09-09: Багц (Basic/Standard/Premium/Premium+)-ийн модулийн
// зөвшөөрлийг бодитоор хэрэгжүүлдэг (enforcement) hook —
// package_features хүснэгэлийн feature_key нь Sidebar/App.jsx-ийн
// route key-тэй яг тохирдог (жиш: 'hrm', 'accounting', 'invoice').
// Trial үед бүгд нээлттэй (үнэлэх боломж өгөх, стандарт SaaS
// практик), feature_key=null эсвэл package_features-д тохиргоогүй
// key үед анхдагчаар НЭЭЛТТЭЙ (шинэ модуль нэмэгдэхэд санамсаргүй
// хааж болохгүй байх зорилготой).
export function usePlanFeatures(hoaId) {
  const [planKey, setPlanKey] = useState(null);
  const [featureMap, setFeatureMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from('tenants').select('plan_key').eq('id', hoaId).single(),
      fetchAllRows(() => supabase.from('package_features').select('feature_key, basic, standard, premium, premium_plus')),
    ]).then(([{ data: tenantRow }, { data: featureRows }]) => {
      if (cancelled) return;
      setPlanKey(tenantRow?.plan_key || null);
      const map = {};
      (featureRows || []).forEach((f) => { if (f.feature_key) map[f.feature_key] = f; });
      setFeatureMap(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hoaId]);

  function hasFeature(key) {
    if (!key) return true;
    if (planKey === 'trial' || !planKey) return true;
    const row = featureMap[key];
    if (!row) return true;
    return !!row[planKey];
  }

  return { hasFeature, planKey, loading };
}
