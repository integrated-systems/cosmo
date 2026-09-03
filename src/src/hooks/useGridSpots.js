import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-09-02: Хэрэглэгчийн хүсэлт - "Конструктор (React)"-ээр зурсан
// слот/агуулах/талбай (полигон)-ийн label-үүдийг "Тоот" засах модал
// дахь SpotSelectField-той ЯГ АДИЛ dropdown-д ашиглана (Аль хэдийн
// байгаа unit_parking/unit_storage-той параллель, тусдаа эх сурвалж).
//
// 2026-09-02 (2): Хэрэглэгчийн хүсэлт - линкийн "id" (`${floor_key}:
// ${label}`)-г "{floor_key}:{slot.id}" болгож сольсон. ҮҮнээс өмнө
// label өөрчлөгдөхөд ХОЛБООС ТАСРАХ эрсдэлтэй байсан (жиш "G-001"-ийг
// "G-01" болгож нэрлэвэл, түүнд холбогдсон owner "алга" болно) -
// slot.id одоо GridConstructorReact.jsx-ийн crypto.randomUUID()-аар
// үүсдэг ТОГТМОЛ түлхүүр тул label хэдийг ч вврчилсэн ч холбоос
// тасрахгүй. "code" (дэлгэцэнд харагдах текст) хэвээрээ label-ийг
// л агуулна.
function toParkingWarehouse(floors) {
  const parking = [];
  const storage = [];
  floors.forEach((f) => {
    (f.layout_json?.slots || []).forEach((s) => {
      if (!s.label) return;
      // 2026-09-04: Хэрэглэгчийн хүсэлт - Агуулах (warehouse) нь
      // цаашид төлбөр тооцоход м2-ыг ашиглах магадлалтай тул, staff
      // гараар оруулсан м2-ыг код-т нь "(Nм2)" гэж нэмж үзүүлнэ
      // (Инфо/Засах модаль дотор аль хэдийн харагдана).
      const code = s.kind === 'warehouse' && s.sqm != null ? `${s.label} (${s.sqm}м2)` : s.label;
      const item = { id: `${f.floor_key}:${s.id}`, floorLevel: f.floor_key, code };
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
      const code = p.sqm != null ? `${p.label} (${p.sqm}м2)` : p.label;
      plots.push({ id: `${f.floor_key}:${p.id}`, floorLevel: f.floor_key, code });
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

// Tenant даяар аль хэдийн эзэмшигдсэн грид label-үүдийг owners БОЛОН
// clientele (Талбай үмчлвгч) хоёулаас цуглуулна (fetchTakenSpotIds-
// той адил зарчим) - Зогсоол/Агуулах/Талбай хүн, аж ахуйн нэгж
// хоёрын аль нэгэнд л ноогдож, ДАВХАРДАХГүй байх ёстой тул.
export async function fetchTakenGridIds(hoaId, field, excludeOwnerId, excludeClientId) {
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
