import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

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
        code: `${buildingNo}${String(r.floor).padStart(2, '0')}${String(r.door_no).padStart(2, '0')}`,
      }));
    return { buildingNo, units };
  });

  return { buildings, loading };
}
