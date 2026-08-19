import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// Sidebar-ийн доод инфо карт БОЛОН Dashboard-ийн "Нийт оршин суугч"
// карт хоёулаа энэ НЭГ hook-оос уншина (Rule of two) — 2026-08-19
// хэрэглэгчийн хvсэлтээр статик жишээ тооноос бодит Supabase дата руу
// шилжvvлэв.
//
// Тооцоолол:
// - buildingCount/entranceCount: unit_layouts-аас (structure_type=
//   'entrance' vед орцны тоог entrance_no-оор ялгаж тоолно, 'floor'
//   vед байр бvр 1 орцтой гэж vзнэ)
// - residentCount/child05/child618: owners.people_count/child_0_5/
//   child_6_18-ийн нийлбэр
// - storageCount/parkingCount/vehicleCount: owners БОЛОН clientele-ийн
//   storages/parkings/vehicles jsonb массивын нийт урт (хоёулангийнх
//   нийлvvлж)
// - talbaiOwnerCount: clientele мврийн тоо ("Талбай өмчлөгч")
// - harilzagchCount: clientele-ийн ДАВХАРДААГvй байгууллагын тоо
//   (reg_no-оор ялгана, "Харилцагч байгууллага" — нэг байгууллага
//   хэд хэдэн талбай эзэмшиж болдог тул talbaiOwnerCount-оос бага
//   эсвэл тэнцvv байна)
export function useTenantStats(hoaId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchAllRows(() => supabase.from('owners').select('people_count,child_0_5,child_6_18,storages,parkings,vehicles').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('clientele').select('reg_no,storages,parkings,vehicles').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('unit_layouts').select('building_no,structure_type,entrance_no').eq('tenant_id', hoaId).eq('hidden', false)),
    ]).then(([ownersRes, clienteleRes, unitsRes]) => {
      if (cancelled) return;
      const owners = ownersRes.data ?? [];
      const clientele = clienteleRes.data ?? [];
      const units = unitsRes.data ?? [];

      const arrLen = (v) => (Array.isArray(v) ? v.length : 0);

      const residentCount = owners.reduce((s, o) => s + (o.people_count || 0), 0);
      const child05 = owners.reduce((s, o) => s + (o.child_0_5 || 0), 0);
      const child618 = owners.reduce((s, o) => s + (o.child_6_18 || 0), 0);

      const storageCount = owners.reduce((s, o) => s + arrLen(o.storages), 0)
        + clientele.reduce((s, c) => s + arrLen(c.storages), 0);
      const parkingCount = owners.reduce((s, o) => s + arrLen(o.parkings), 0)
        + clientele.reduce((s, c) => s + arrLen(c.parkings), 0);
      const vehicleCount = owners.reduce((s, o) => s + arrLen(o.vehicles), 0)
        + clientele.reduce((s, c) => s + arrLen(c.vehicles), 0);

      const buildingNos = [...new Set(units.map((u) => u.building_no))];
      let entranceCount = 0;
      for (const b of buildingNos) {
        const rowsForB = units.filter((u) => u.building_no === b);
        if (rowsForB[0]?.structure_type === 'entrance') {
          entranceCount += new Set(rowsForB.map((u) => u.entrance_no)).size;
        } else {
          entranceCount += 1;
        }
      }

      setStats({
        buildingCount: buildingNos.length,
        entranceCount,
        residentCount,
        child05,
        child618,
        storageCount,
        parkingCount,
        vehicleCount,
        talbaiOwnerCount: clientele.length,
        harilzagchCount: new Set(clientele.map((c) => c.reg_no).filter(Boolean)).size,
      });
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [hoaId]);

  return { stats, loading };
}
