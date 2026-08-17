import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import UnitEditModal from '../components/UnitEditModal';

// "Хаягжилт тохиргоо" (СИСАДМИН, /addressing) хуудас — 2026-08-17
// хэрэглэгчийн өгсөн screenshot-той тохируулан бүтээв. "Тоот, Зогсоол,
// Агуулах" хуудасны Тоот таб-тай ЯГ АДИЛ бүтэцтэй визуал grid, гэхдээ
// ЭНД түүнийг ЗОХИОДОГ (interactive, Excel/Word шиг мөр/багана нэмэх-
// хасах) СИСАДМИН хуудас юм.
//
// 2026-08-17: `unit_layouts` хүснэгэлтэй холбогдов (хэрэглэгч
// зөвшөөрсөн нэр). Excel/Word шиг: локал засвар хийгээд "Хадгалах"
// дарахад түүнийг СНЭПШОТ (delete+insert) байдлаар бүхэлд нь бичнэ —
// үйлдэл бүрийг тусад нь autosave хийхгүй, зорилготойгоор энгийн байлгав.
let nextId = 1000;
function genId() { return nextId++; }

function makeUnit(doorNo, sqm) {
  return { id: genId(), doorNo, sqm, hidden: false };
}
function makeFloor(floorNo, unitCount) {
  return { id: genId(), floorNo, units: Array.from({ length: unitCount }, (_, i) => makeUnit(i + 1, 55.04)) };
}
function makeEntrance(entranceNo) {
  return { id: genId(), entranceNo, floors: [makeFloor(1, 6)] };
}

function formatCode(buildingNo, floor, doorNo) {
  const f = String(floor ?? 0).padStart(2, '0');
  const d = String(doorNo ?? 0).padStart(2, '0');
  return `${buildingNo}${f}${d}`;
}

export default function AddressConfig() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [buildingNo, setBuildingNo] = useState('101');
  const [entrances, setEntrances] = useState([makeEntrance('1')]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadLayout(bNoRaw) {
    const bNo = Number(bNoRaw);
    if (!bNo) return;
    setLoading(true);
    const { data } = await supabase
      .from('unit_layouts')
      .select('*')
      .eq('tenant_id', hoaId)
      .eq('building_no', bNo);

    if (!data || data.length === 0) {
      setEntrances([makeEntrance('1')]);
      setLoading(false);
      return;
    }

    const byEntrance = {};
    data.forEach((row) => {
      byEntrance[row.entrance_no] = byEntrance[row.entrance_no] || {};
      byEntrance[row.entrance_no][row.floor] = byEntrance[row.entrance_no][row.floor] || [];
      byEntrance[row.entrance_no][row.floor].push(row);
    });
    const newEntrances = Object.keys(byEntrance).sort().map((entNo) => {
      const floorsObj = byEntrance[entNo];
      const floors = Object.keys(floorsObj).map(Number).sort((a, b) => b - a).map((floorNo) => ({
        id: genId(),
        floorNo,
        units: floorsObj[floorNo]
          .sort((a, b) => a.door_no - b.door_no)
          .map((row) => ({ id: genId(), doorNo: row.door_no, sqm: row.sqm, hidden: row.hidden })),
      }));
      return { id: genId(), entranceNo: entNo, floors };
    });
    setEntrances(newEntrances);
    setLoading(false);
  }

  useEffect(() => {
    loadLayout(buildingNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  async function handleSaveLayout() {
    const bNo = Number(buildingNo);
    if (!bNo) { window.alert('Байрны дугаар оруулна уу'); return; }
    setSaving(true);
    await supabase.from('unit_layouts').delete().eq('tenant_id', hoaId).eq('building_no', bNo);
    const rows = [];
    entrances.forEach((e) => {
      e.floors.forEach((f) => {
        f.units.forEach((u) => {
          rows.push({
            tenant_id: hoaId,
            building_no: bNo,
            entrance_no: e.entranceNo,
            floor: f.floorNo,
            door_no: u.doorNo,
            sqm: u.sqm,
            hidden: u.hidden,
          });
        });
      });
    });
    if (rows.length > 0) {
      const { error } = await supabase.from('unit_layouts').insert(rows);
      if (error) { window.alert(error.message); setSaving(false); return; }
    }
    setSaving(false);
    window.alert('Амжилттай хадгалагдлаа.');
  }

  function addFloor(entranceId) {
    setEntrances((prev) => prev.map((e) => {
      if (e.id !== entranceId) return e;
      const topFloor = e.floors[0];
      const unitCount = topFloor ? topFloor.units.length : 6;
      const nextFloorNo = topFloor ? topFloor.floorNo + 1 : 1;
      return { ...e, floors: [makeFloor(nextFloorNo, unitCount), ...e.floors] };
    }));
  }
  function removeFloor(entranceId) {
    setEntrances((prev) => prev.map((e) => {
      if (e.id !== entranceId || e.floors.length === 0) return e;
      return { ...e, floors: e.floors.slice(1) };
    }));
  }

  function addUnitColumn(entranceId) {
    setEntrances((prev) => prev.map((e) => {
      if (e.id !== entranceId) return e;
      return {
        ...e,
        floors: e.floors.map((f) => ({ ...f, units: [...f.units, makeUnit(f.units.length + 1, 55.04)] })),
      };
    }));
  }
  function removeUnitColumn(entranceId) {
    setEntrances((prev) => prev.map((e) => {
      if (e.id !== entranceId) return e;
      return {
        ...e,
        floors: e.floors.map((f) => ({ ...f, units: f.units.slice(0, -1) })),
      };
    }));
  }

  function addEntrance() {
    const nextNo = String(entrances.length + 1);
    setEntrances((prev) => [...prev, makeEntrance(nextNo)]);
  }
  function removeEntrance(entranceId) {
    setEntrances((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== entranceId) : prev));
  }
  function setEntranceNo(entranceId, val) {
    setEntrances((prev) => prev.map((e) => (e.id === entranceId ? { ...e, entranceNo: val } : e)));
  }

  function handleUnitSave(unitId, patch) {
    setEntrances((prev) => prev.map((e) => ({
      ...e,
      floors: e.floors.map((f) => ({
        ...f,
        units: f.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
      })),
    })));
    setEditing(null);
  }
  function handleUnitHide(unitId) {
    setEntrances((prev) => prev.map((e) => ({
      ...e,
      floors: e.floors.map((f) => ({
        ...f,
        units: f.units.map((u) => (u.id === unitId ? { ...u, hidden: true } : u)),
      })),
    })));
    setEditing(null);
  }

  return (
    <div className="ds-card p-4">
      <div className="flex items-end justify-between mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Байрны дугаар</label>
          <input
            className="ds-input w-32"
            value={buildingNo}
            onChange={(e) => setBuildingNo(e.target.value)}
            onBlur={(e) => loadLayout(e.target.value)}
          />
        </div>
        <button className="ds-btn-primary" onClick={handleSaveLayout} disabled={saving || loading}>
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-darktext text-sm py-8">Ачаалж байна...</div>
      ) : (
      <div className="flex items-start gap-4 overflow-x-auto pb-2">
        {entrances.map((entrance) => (
          <div key={entrance.id} className="shrink-0">
            <div className="flex items-center gap-1 mb-1">
              <button
                onClick={() => addFloor(entrance.id)}
                title="Давхар нэмэх"
                className="flex-1 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-blue-400 text-xs flex items-center justify-center"
              >
                ▲ Давхар нэмэх
              </button>
              <button
                onClick={() => removeFloor(entrance.id)}
                title="Давхар хасах"
                className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed text-xs"
              >
                −
              </button>
            </div>

            <div className="flex items-start gap-1">
              <div>
                {entrance.floors.map((floor) => (
                  <div key={floor.id} className="flex items-center gap-2 mb-1">
                    <div className="w-7 shrink-0 text-[11px] text-mutedtext">{floor.floorNo}F</div>
                    <div className="flex gap-1">
                      {floor.units.filter((u) => !u.hidden).map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setEditing({ entranceId: entrance.id, unit: u })}
                          style={{ width: '58px', height: '44px' }}
                          className="rounded flex flex-col items-center justify-center border border-blue-500/40 bg-blue-500/[0.12] text-customBlue hover:border-customBlue transition-colors shrink-0"
                        >
                          <div className="text-[11px] font-semibold leading-tight">{formatCode(buildingNo, floor.floorNo, u.doorNo)}</div>
                          {u.sqm != null && <div className="text-[9px] opacity-80 leading-tight">{u.sqm}м²</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1 self-stretch">
                <button
                  onClick={() => addUnitColumn(entrance.id)}
                  title="Давхарт байрлах тоот нэмэх"
                  className="flex-1 w-6 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-blue-400 text-xs"
                >
                  ▶
                </button>
                <button
                  onClick={() => removeUnitColumn(entrance.id)}
                  title="Тоот хасах"
                  className="w-6 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed text-xs"
                >
                  −
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <input
                className="ds-input w-24 text-center"
                value={entrance.entranceNo}
                onChange={(e) => setEntranceNo(entrance.id, e.target.value)}
                placeholder="Орц №"
              />
              {entrances.length > 1 && (
                <button
                  onClick={() => removeEntrance(entrance.id)}
                  title="Орц устгах"
                  className="px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={addEntrance}
          title="Орц нэмэх"
          className="shrink-0 self-stretch w-8 mt-7 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-blue-400 text-sm flex items-center justify-center"
        >
          ▶
        </button>
      </div>
      )}

      <UnitEditModal
        key={editing?.unit?.id}
        unit={editing?.unit}
        onClose={() => setEditing(null)}
        onSave={handleUnitSave}
        onHide={handleUnitHide}
      />
    </div>
  );
}
