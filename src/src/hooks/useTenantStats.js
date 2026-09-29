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
// - residentCount/child05/child618/petCount: owners.people_count/
//   pet_count-ийн НИЙЛБЭР л (child_0_5/child_6_18 нь тэр НИЙТ дотор
//   аль хэдийн ОРСОН дэд бүлэг — дахин нэмдэггүй, харин pet_count нь
//   бие даасан тоо, "Ам бүл" дотор ороогүй)
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
//   clientele.reg_no-ийн ДАВХАРДААГҮй тоог "Харилцагч байгууллага" гэж
//   таамагласан байсан (Харилцагчийн бүртгэл /providers хуудас үүсэхээс
//   ӨМНв бичигдсэн). Одоо жинхэнэ "providers" хүснэгэл (үйлчилгээ
//   үзүүлэгч байгууллагууд) байгаа тул TvvНИЙ мврийн тоог шууд ашиглана.
// 2026-09-08 (32): Тооцооллын цөм логикийг (Sidebar/Dashboard-ийн
// хийдэг зүйл) экспортолж, Usage.jsx хуудсанд БүХ tenant-ийг
// нэгтгэн харуулахад дахин ашиглав (Rule of two). building_no-г
// tenant_id-тэй хамт (composite key) бүлэглэсэн тул нэг л tenant-
// ийн scope-д ч, олон tenant-ийг нэгтгэхэд ч зөв ажиллана (өөр
// tenant-ийн ижил building_no санамсаргүй нийлэхгүй).
export function computeTenantStats(owners, clientele, units, basementFloors, providers) {
  const arrLen = (v) => (Array.isArray(v) ? v.length : 0);

  const residentCount = owners.reduce((s, o) => s + (o.people_count || 0), 0);
  const child05 = owners.reduce((s, o) => s + (o.child_0_5 || 0), 0);
  const child618 = owners.reduce((s, o) => s + (o.child_6_18 || 0), 0);
  const petCount = owners.reduce((s, o) => s + (o.pet_count || 0), 0);

  const vehicleCount = owners.reduce((s, o) => s + arrLen(o.vehicles), 0)
    + clientele.reduce((s, c) => s + arrLen(c.vehicles), 0);

  const storagesOwned = owners.reduce((s, o) => s + arrLen(o.storages), 0)
    + clientele.reduce((s, c) => s + arrLen(c.storages), 0);
  const parkingsOwned = owners.reduce((s, o) => s + arrLen(o.parkings), 0)
    + clientele.reduce((s, c) => s + arrLen(c.parkings), 0);

  const buildingKey = (u) => `${u.tenant_id}:${u.building_no}`;
  const buildingKeys = [...new Set(units.map(buildingKey))];
  let entranceCount = 0;
  for (const key of buildingKeys) {
    const rowsForB = units.filter((u) => buildingKey(u) === key);
    if (rowsForB[0]?.structure_type === 'entrance') {
      entranceCount += new Set(rowsForB.map((u) => u.entrance_no)).size;
    } else {
      entranceCount += 1;
    }
  }

  // 2026-09-27 (92): Зогсоол/Агуулахын НИЙТ тоо нь unit_parking/
  // unit_storage хүснэгэл (хэрэглэгддэггүй, хуучирсан) БИШ, харин
  // "Хаягжилт тохиргоо > Зогсоол, Агуулах, Талбай" таб-ын GridConstructorReact
  // компонент eөрийн БүХ давхаргын (floor_key) дэд таб-д (basement_floors.
  // layout_json.slots) зурсан бодит слотуудын нийлбэр байх ёстойг
  // хэрэглэгч олж заав. kind==='slot' → зогсоол, kind==='warehouse' → агуулах.
  let parkingTotal = 0;
  let storageTotal = 0;
  basementFloors.forEach((f) => {
    const slots = f.layout_json?.slots || [];
    slots.forEach((s) => {
      if (s.kind === 'slot') parkingTotal += 1;
      else if (s.kind === 'warehouse') storageTotal += 1;
    });
  });

  return {
    buildingCount: buildingKeys.length,
    entranceCount,
    residentCount,
    child05,
    child618,
    petCount,
    // 2026-09-27 (92): "Тоот" эзэмшигчийн тоо нь ЗӨВХӨН building_no-тэй
    // (`Сууц өмчлөгч` таб) өмчлөгчид байх ёстой — "Зогсоол, агуулах
    // дангаар өмчлөгч" (building_no=null) нэмж тооцох үед тоот бүхий
    // өмчлөгчээс илүү тоо гаргадаг байсныг хэрэглэгч олж заав.
    toot: { owned: owners.filter((o) => o.building_no).length, total: units.length },
    parking: { owned: parkingsOwned, total: parkingTotal },
    storage: { owned: storagesOwned, total: storageTotal },
    vehicleCount,
    talbaiOwnerCount: clientele.length,
    harilzagchCount: providers.length,
  };
}

export function useTenantStats(hoaId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchAllRows(() => supabase.from('owners').select('building_no,people_count,child_0_5,child_6_18,pet_count,storages,parkings,vehicles').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('clientele').select('storages,parkings,vehicles').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('unit_layouts').select('tenant_id,building_no,structure_type,entrance_no').eq('tenant_id', hoaId).eq('hidden', false)),
      fetchAllRows(() => supabase.from('basement_floors').select('layout_json').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('providers').select('id').eq('tenant_id', hoaId)),
    ]).then(([ownersRes, clienteleRes, unitsRes, basementRes, providersRes]) => {
      if (cancelled) return;
      setStats(computeTenantStats(
        ownersRes.data ?? [],
        clienteleRes.data ?? [],
        unitsRes.data ?? [],
        basementRes.data ?? [],
        providersRes.data ?? [],
      ));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [hoaId]);

  return { stats, loading };
}
