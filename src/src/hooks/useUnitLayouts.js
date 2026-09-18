import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatUnitCode } from '../lib/ownersFormat';

// AddressConfig.jsx-д зохион байгуулсан `unit_layouts`-ыг байраар
// бүлэглэж, EditOwnerModal.jsx-ийн "Байр"+"Тоот" линкэд dropdown-д
// үгдүг hook. 2026-08-17 хэрэглэгчийн заасны дагуу: сисадмин эхлээд
// хаягжилт зохиож хадгалснаас үүсдэг жинхэнэ жагсаалт — hardcode
// BUILDING_OPTIONS-ийг сольсон.
export function useUnitLayouts(hoaId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    setLoading(true);
    fetchAllRows(() =>
      supabase.from('unit_layouts').select('*').eq('tenant_id', hoaId).eq('hidden', false)
    ).then(({ data }) => {
      setRows(data ?? []);
      setLoading(false);
    });
  }, [hoaId]);

  const buildingNos = [...new Set(rows.map((r) => r.building_no))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const buildings = buildingNos.map((buildingNo) => {
    const buildingRows = rows.filter((r) => r.building_no === buildingNo);
    const units = buildingRows
      .slice()
      .sort((a, b) => (b.floor - a.floor) || (a.door_no - b.door_no))
      .map((r) => ({
        floor: r.floor,
        doorNo: r.door_no,
        sqm: r.sqm,
        code: formatUnitCode(buildingNo, r.structure_type, r.floor, r.entrance_no, r.door_no),
      }));
    return { buildingNo, units };
  });

  return { buildings, loading };
}

// 2026-09-13 БОДИТ АЛДАА ЗАСАВ — хэрэглэгчийн олсон цоорхой: "Тоот"
// dropdown нь зөвхөн физик бүтцийг (аль тоот оршин байгааг) уншдаг
// байсан бөгөөд, аль тоот АЛЬ ХЭДИЙН ЭЗЭМШИГДСЭН эсэхийг ОГТ шалгадаг
// байгаагүй тул, НЭГ тоотод 2 eeр эмчлэгч давхар бүртгэгдэх боломжтой
// байв. ҮҮнийг засахын тулд, `owners` хүснэгэлээс АЛЬ ХЭДИЙН
// эзэмшигдсэн (Байр|Давхар|Тоот) хослолуудыг татаж, dropdown-оос хасна.
export async function fetchTakenUnitKeys(hoaId, excludeOwnerId) {
  const { data } = await fetchAllRows(() =>
    supabase.from('owners').select('id, building_no, floor, door_no').eq('tenant_id', hoaId).not('building_no', 'is', null)
  );
  const taken = new Set();
  (data || []).forEach((o) => {
    if (o.id === excludeOwnerId) return;
    taken.add(`${o.building_no}|${o.floor}|${o.door_no}`);
  });
  return taken;
}
