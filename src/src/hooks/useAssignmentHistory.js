import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// AssetInfoModal.jsx-ийн "Шилжилтийн түүх" хэсэг — Байршил/Хариуцагч
// солигдсон бүртгэлийг (APPEND-ONLY, fixed_asset_assignment_history)
// уншина.
export function useAssignmentHistory(assetId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assetId) { setHistory([]); setLoading(false); return; }
    setLoading(true);
    fetchAllRows(() =>
      supabase.from('fixed_asset_assignment_history')
        .select('*, old_location:fixed_asset_locations!old_location_id(name), new_location:fixed_asset_locations!new_location_id(name), old_responsible:job_positions!old_responsible_position_id(name), new_responsible:job_positions!new_responsible_position_id(name)')
        .eq('asset_id', assetId)
        .order('changed_at', { ascending: false })
    ).then(({ data }) => {
      setHistory(data || []);
      setLoading(false);
    });
  }, [assetId]);

  return { history, loading };
}
