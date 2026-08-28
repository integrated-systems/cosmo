import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-08-19: EditOwnerModal/EditClientModal-ийн "Зогсоол"/"Агуулах"
// талбарыг чөлөөт бичвэрээс (Давхар dropdown 1-5 hardcode+гар бичих
// дугаар) "Хаягжилт тохиргоо" хуудсаар бодитоор үүсгэсэн unit_parking/
// unit_storage-аас сонгодог dropdown болгов — давхардал, алдаатай
// бичилт бүрмөсөн зайлсхийнэ.
function toDisplay(row) {
  return {
    id: row.id,
    floorLevel: row.floor_level,
    code: `${row.zone_label}${row.separator}${row.spot_no}${row.suffix || ''}`,
  };
}

export function useUnitSpots(hoaId, kind) {
  const table = kind === 'parking' ? 'unit_parking' : 'unit_storage';
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    setLoading(true);
    fetchAllRows(() => supabase.from(table).select('*').eq('tenant_id', hoaId).eq('hidden', false)).then(({ data }) => {
      if (cancelled) return;
      setSpots((data || []).map(toDisplay));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hoaId, table]);

  return { spots, loading };
}

// Tenant даяар аль хэдийн ЭЗЭМШИГДСЭН spot ID-нуудыг owners+clientele-ээс
// цуглуулна (давхардлаас сэргийлнэ). excludeOwnerId/excludeClientId нь
// одоо засварлаж буй мврийг тооцохоос хасна (тэдний үвлдвг сонголт
// үргэлж үзэгдэх хэвээр байна).
export async function fetchTakenSpotIds(hoaId, field, excludeOwnerId, excludeClientId) {
  const [{ data: owners }, { data: clientele }] = await Promise.all([
    fetchAllRows(() => supabase.from('owners').select(`id, ${field}`).eq('tenant_id', hoaId)),
    fetchAllRows(() => supabase.from('clientele').select(`id, ${field}`).eq('tenant_id', hoaId)),
  ]);
  const taken = new Set();
  (owners || []).forEach((o) => {
    if (o.id === excludeOwnerId) return;
    (o[field] || []).forEach((sp) => sp?.id && taken.add(sp.id));
  });
  (clientele || []).forEach((c) => {
    if (c.id === excludeClientId) return;
    (c[field] || []).forEach((sp) => sp?.id && taken.add(sp.id));
  });
  return taken;
}
