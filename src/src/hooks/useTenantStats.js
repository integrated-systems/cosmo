import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// "owned/total" индикатор форматлагч — 100% дүүрмэгц ("owned"="total")
// зүгээр НИЙТ тоог л үзүүлнэ (дүүрэн үед харагдах "мэдээлэл"-ийг
// хялбарчилна), дутуу үед "owned/total" (жиш "10/100") — уншихад амар
// боловч бүртгэл дутуу/устсаныг индикатор мэт нүдэнд шууд тусгана.
export function formatOwnedRatio(owned, total) {
  if (total === 0) return '0';
  if (owned >= total) return String(total);
  return `${owned}/${total}`;
}

// Sidebar-ийн доод инфо карт БОЛОН Dashboard-ийн "Нийт оршин суугч"
// карт хоёулаа энэ НЭГ hook-оос уншина (Rule of two) — 2026-08-19
// хэрэглэгчийн хүсэлтээр статик жишээ тооноос бодит Supabase дата руу
// шилжүүлэв.
//
// Тооцоолол:
// - buildingCount/entranceCount: unit_layouts-аас (structure_type=
//   'entrance' үед орцны тоог entrance_no-оор ялгаж тоолно, 'floor'
//   үед байр бүр 1 орцтой гэж үзнэ)
// - residentCount/child05/child618: owners.people_count-ийн НИЙЛБЭР л
//   (child_0_5/child_6_18 нь тэр НИЙТ дотор аль хэдийн ОРСОН дэд бүлэг —
//   дахин нэмдэггүй)
// - toot/parking/storage: {owned, total} обьект — total нь "Хаягжилт
//   тохиргоо" хуудсаар үүссэн НИЙТ грид/бүсчлэлийн тоо (unit_layouts/
//   unit_parking/unit_storage), owned нь эзэмшигчтэй тоо (owners
//   бүгд+clientele-ийн parkings/storages массив). Sidebar-т "owned/total"
//   индикатор хэлбэрээр (100% дүүрмэгц зүгээр "total") үзүүлнэ — менежерт
//   бүртгэл хэр гүйцэд байгааг харуулна (2026-08-19 хэрэглэгч тодорхой
//   заасан).
// - vehicleCount: owners БОЛОН clientele-ийн vehicles jsonb массивын
//   нийт урт (энэ бол мвн адил "нийт" үзүүлэлт үгүй, зүвхүн бодитоор
//   бүртгэгдсэн машины тоо тул хэвээр үлдэв)
// - talbaiOwnerCount: clientele мврийн тоо ("Талбай өмчлөгч")
// - harilzagchCount: 2026-08-19 хэрэглэгч олсон алдаа: өмнө нь
//   clientele.reg_no-ийн ДАВХАРДААГүй тоог "Харилцагч байгууллага" гэж
//   таамагласан байсан (Харилцагчийн бүртгэл /providers хуудас үүсэхээс
//   ӨМНв бичигдсэн). Одоо жинхэнэ "providers" хүснэгэл (үйлчилгээ
//   үзүүлэгч байгууллагууд) байгаа тул TvvНИЙ мврийн тоог шууд ашиглана.
export function useTenantStats(hoaId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchAllRows(() => supabase.from('owners').select('people_count,child_0_5,child_6_18,storages,parkings,vehicles').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('clientele').select('storages,parkings,vehicles').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('unit_layouts').select('building_no,structure_type,entrance_no').eq('tenant_id', hoaId).eq('hidden', false)),
      fetchAllRows(() => supabase.from('unit_parking').select('id').eq('tenant_id', hoaId).eq('hidden', false)),
      fetchAllRows(() => supabase.from('unit_storage').select('id').eq('tenant_id', hoaId).eq('hidden', false)),
      fetchAllRows(() => supabase.from('providers').select('id').eq('tenant_id', hoaId)),
    ]).then(([ownersRes, clienteleRes, unitsRes, parkingRes, storageRes, providersRes]) => {
      if (cancelled) return;
      const owners = ownersRes.data ?? [];
      const clientele = clienteleRes.data ?? [];
      const units = unitsRes.data ?? [];
      const parkingSpots = parkingRes.data ?? [];
      const storageUnits = storageRes.data ?? [];
      const providers = providersRes.data ?? [];

      const arrLen = (v) => (Array.isArray(v) ? v.length : 0);

      const residentCount = owners.reduce((s, o) => s + (o.people_count || 0), 0);
      const child05 = owners.reduce((s, o) => s + (o.child_0_5 || 0), 0);
      const child618 = owners.reduce((s, o) => s + (o.child_6_18 || 0), 0);

      const vehicleCount = owners.reduce((s, o) => s + arrLen(o.vehicles), 0)
        + clientele.reduce((s, c) => s + arrLen(c.vehicles), 0);

      const storagesOwned = owners.reduce((s, o) => s + arrLen(o.storages), 0)
        + clientele.reduce((s, c) => s + arrLen(c.storages), 0);
      const parkingsOwned = owners.reduce((s, o) => s + arrLen(o.parkings), 0)
        + clientele.reduce((s, c) => s + arrLen(c.parkings), 0);

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
        toot: { owned: owners.length, total: units.length },
        parking: { owned: parkingsOwned, total: parkingSpots.length },
        storage: { owned: storagesOwned, total: storageUnits.length },
        vehicleCount,
        talbaiOwnerCount: clientele.length,
        harilzagchCount: providers.length,
      });
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [hoaId]);

  return { stats, loading };
}
