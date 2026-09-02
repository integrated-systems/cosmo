import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-09-02: Хэрэглэгчийн хүсэлт — "Конструктор (React)"-ээр зурсан
// слот/агуулах/талбай (полигон)-ийн label-үүдийг "Тоот" засах модал
// дахь SpotSelectField-той ЯГ АДИЛ dropdown-д ашиглана (Аль хэдийн
// байгаа unit_parking/unit_storage-той параллель, тусдаа эх сурвалж).
//
// `id` талбарт "{floor_key}:{label}" хэлбэрийн НЭГТГЭСЭН мвр ашиглана
// (учир нь Grid Constructor-ийн дотоод React id үе бүрд өөрчлвгддвг
// тул тогтвортой холбоос болж чадахгүй — харин label+floor_key
// хослол л бизнесийн хувьд тогтвортой, давхцахгүй.
function toParkingWarehouse(floors) {
  const parking = [];
  const storage = [];
  floors.forEach((f) => {
    (f.layout_json?.slots || []).forEach((s) => {
      if (!s.label) return;
      const item = { id: `${f.floor_key}:${s.label}`, floorLevel: f.floor_key, code: `${f.floor_key} ${s.label}` };
      if (s.kind === 'warehouse') storage.push(item);
      else parking.push(item);
    });
  });
  return { parking, storage };
}
function toLandPlots(floors) {
  const plots = [];
  floors.forEach((f) => {
    (f.layout_json?.polygons || []).forEach((p) => {
      if (!p.label) return;
      plots.push({ id: `${f.floor_key}:${p.label}`, floorLevel: f.floor_key, code: `${f.floor_key} ${p.label}` });
    });
  });
  return plots;
}

export function useGridSpots(hoaId) {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    setLoading(true);
    fetchAllRows(() => supabase.from('basement_floors').select('floor_key, layout_json').eq('tenant_id', hoaId)).then(({ data }) => {
      if (cancelled) return;
      setFloors(data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hoaId]);

  const { parking, storage } = toParkingWarehouse(floors);
  const landPlots = toLandPlots(floors);
  return { gridParkingSpots: parking, gridStorageSpots: storage, gridLandPlots: landPlots, loading };
}

// Tenant даяар аль хэдийн эзэмшигдсэн грид label-үүдийг owners-ээс
// цуглуулна (fetchTakenSpotIds-той адил зарчим, гэхдээ энд зөвхөн
// owners-д л хамаарна — clientele-д грид холболт одоогоор нэмэгдээгүй).
export async function fetchTakenGridIds(hoaId, field, excludeOwnerId) {
  const { data: owners } = await fetchAllRows(() => supabase.from('owners').select(`id, ${field}`).eq('tenant_id', hoaId));
  const taken = new Set();
  (owners || []).forEach((o) => {
    if (o.id === excludeOwnerId) return;
    (o[field] || []).forEach((sp) => sp?.id && taken.add(sp.id));
  });
  return taken;
}
