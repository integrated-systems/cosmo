import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { ChevronUpIcon, ChevronRightIcon, DeleteIcon } from '../components/icons/Icons';
import UnitEditModal from '../components/UnitEditModal';
import ParkingZoneDesigner from '../components/ParkingZoneDesigner';
import GridConstructorReact from '../components/GridConstructorReact';
import StorageZoneDesigner from '../components/StorageZoneDesigner';
import TabButton from '../components/TabButton';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import { fetchAllRows } from '../lib/fetchAllRows';

// "Хаягжилт тохиргоо" (СИСАДМИН, /addressing) хуудас — Property.jsx-ийн
// Тоот tab-ийн grid-ийг ЗОХИОДОГ interactive designer.
//
// 2026-08-17 (5-р засвар, хэрэглэгчийн заасны дагуу):
// - "Spacer" талбар БҮРМӨСӨН устгав — Байрны дугаар талбар v/тэмдэгт
//   аль хэдийн шууд зөвшөөрдөг (жиш "58/1") тул тусдаа тэмдэгт хэрэггүй.
// - БҮХ байрын grid-ийг НЭГ дэлгэцэнд зэрэгцүүлэн (баруун тийш цувуулж,
//   дэлгэцний өргөнөөс хэтэрвэл шинэ мөр) харуулна — таб/сонголт
//   БҮРМӨСӨН арилав. Байрын дугаарыг ГАРААР шууд энд засна ("+ Шинэ
//   байр" товчоор нэмнэ, DeleteIcon-оор устгана).
// - "Орц нэмэх" товчийг Орцны дугаарын мөрний баруун талд жижиг товч
//   болгож, түүнийг Орцны дугаарын мөртэй хамт байрны гридийн өргөнөөр
//   голлуулав (өмнөх тусдаа өндөр багана арилав).
// - НЭГ глобал "Хадгалах" товч БҮХ байрыг зэрэг хадгална (delete all+
//   insert all snapshot).
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
function makeBuilding(buildingNo = '') {
  return { id: genId(), buildingNo, structureType: 'floor', entrances: [makeEntrance('1')] };
}

function formatCode(buildingNo, floor, doorNo) {
  const f = String(floor ?? 0).padStart(2, '0');
  const d = String(doorNo ?? 0).padStart(2, '0');
  return `${buildingNo}${f}${d}`;
}

// 2026-08-19: "Хаягжилт тохиргоо" хуудсыг 3 таб (Тоот/Зогсоол/Агуулах)
// болгож задлахад энэ бүхэл grid designer-ыг ЭНД ГЭМТЭЭЛГүй, ЯГ ХЭВЭЭР
// нь "Тоот" табын доторх компонент болгов (доор AddressConfig() wrapper
// л шинээр нэмэгдсэн — доторх логик/UI бүгд хвндөгдөөгүй).
function UnitLayoutDesigner() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { confirm, ConfirmDialog } = useConfirm();
  const { alert, AlertDialog } = useAlert();
  const [buildings, setBuildings] = useState([]);
  const [editing, setEditing] = useState(null); // { buildingId, unit }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadAllBuildings() {
    setLoading(true);
    const { data } = await fetchAllRows(() => supabase.from('unit_layouts').select('*').eq('tenant_id', hoaId).order('building_no').order('floor').order('position'));
    if (!data || data.length === 0) {
      setBuildings([]);
      setLoading(false);
      return;
    }
    const byBuilding = {};
    data.forEach((row) => {
      byBuilding[row.building_no] = byBuilding[row.building_no] || { structureType: row.structure_type || 'floor', entrances: {} };
      const ent = byBuilding[row.building_no].entrances;
      ent[row.entrance_no] = ent[row.entrance_no] || {};
      ent[row.entrance_no][row.floor] = ent[row.entrance_no][row.floor] || [];
      ent[row.entrance_no][row.floor].push(row);
    });
    const newBuildings = Object.keys(byBuilding)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((buildingNo) => {
        const b = byBuilding[buildingNo];
        const entrances = Object.keys(b.entrances).sort().map((entNo) => {
          const floorsObj = b.entrances[entNo];
          const floors = Object.keys(floorsObj).map(Number).sort((a, c) => c - a).map((floorNo) => ({
            id: genId(),
            floorNo,
            units: floorsObj[floorNo]
              .sort((a, c) => a.position - c.position)
              .map((row) => ({ id: genId(), doorNo: row.door_no, sqm: row.sqm, hidden: row.hidden })),
          }));
          return { id: genId(), entranceNo: entNo, floors };
        });
        return { id: genId(), buildingNo, structureType: b.structureType, entrances };
      });
    setBuildings(newBuildings);
    setLoading(false);
  }

  useEffect(() => {
    loadAllBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  function updateBuilding(buildingId, updater) {
    setBuildings((prev) => prev.map((b) => (b.id === buildingId ? updater(b) : b)));
  }

  function addNewBuilding() {
    setBuildings((prev) => [...prev, makeBuilding('')]);
  }

  async function removeBuilding(buildingId) {
    const b = buildings.find((x) => x.id === buildingId);
    if (!b) return;
    if (!(await confirm(`"${b.buildingNo || '(нэргүй)'}" байрыг устгах уу?`))) return;
    if (b.buildingNo.trim()) {
      await supabase.from('unit_layouts').delete().eq('tenant_id', hoaId).eq('building_no', b.buildingNo);
    }
    setBuildings((prev) => prev.filter((x) => x.id !== buildingId));
  }

  async function handleSaveAll() {
    setSaving(true);
    const rows = [];
    const seenKeys = new Set();
    let duplicateInfo = null;
    let hasAnyValidBuilding = false;
    buildings.forEach((bld) => {
      // 2026-08-18: .trim() зөвхөн ХООСОН эсэхийг шалгахад л ашиглана —
      // Байрны дугаарт хэрэглэгч зориудаар оруулсан хоосон зай (spacer
      // болгон ашиглах зорилготой) хадгалахдаа арилахгүй байх ёстой.
      const bNo = bld.buildingNo;
      if (!bNo || !bNo.trim()) return;
      hasAnyValidBuilding = true;
      bld.entrances.forEach((e) => {
        e.floors.forEach((f) => {
          f.units.forEach((u, unitIdx) => {
            const key = `${bNo}\u0000${e.entranceNo}\u0000${f.floorNo}\u0000${u.doorNo}`;
            if (seenKeys.has(key) && !duplicateInfo) {
              duplicateInfo = { building: bNo, floor: f.floorNo, doorNo: u.doorNo };
            }
            seenKeys.add(key);
            rows.push({
              tenant_id: hoaId,
              building_no: bNo,
              entrance_no: e.entranceNo,
              floor: f.floorNo,
              door_no: u.doorNo,
              position: unitIdx,
              sqm: u.sqm,
              hidden: u.hidden,
              structure_type: bld.structureType,
            });
          });
        });
      });
    });

    // 2026-08-19 ЧУХАЛ засвар: хадгалахаас ҮМНӘ бүрэн шалгана —
    // энээс ҮМНӘ .delete()-ийг шууд эхлж, дараа нь .insert() давхцсан
    // (тэндэй байр, орц, давхар, тоот) key-тэй мөртэй мөргүлдэж
    // БтҮЛГүй болвол DELETE аль хэдийн гүйцэтгэгдсэн байсан тул
    // БҮХ мэдээлэл бүрмөсвөн алдагддаг байсан (өмнө хэрэглэгч бодитоор
    // мэдээлэл алдсан) — одоо ЭХЛЭЭД шалгаж, алдаа олдвол DELETE-ийг ОГТ
    // дуудахгүй, одоо байгаа мэдээлэл хэвээр үлдэнэ.
    if (duplicateInfo) {
      alert(`"${duplicateInfo.building}" байрны ${duplicateInfo.floor}-р давхарт ${duplicateInfo.doorNo}-р тоот ХОЁР ДАВТАГСАН байна (жиш дуплекс давхар үүсгэхдээ давхарын дугаарыг санамсаргүй давхарласан байж болзошгүй) — хадгалахаас ӨМНӘ давхцлыг арилгана уу. Одоо байгаа мэдээлэл хэвээр үлдлээ.`);
      setSaving(false);
      return;
    }
    if (buildings.length > 0 && !hasAnyValidBuilding) {
      alert('Ямар ч байранд Байрны дугаар бөглөгдөөгүй тул хадгалах зүйл алга. Байрны дугаараа бөглөнө уу.');
      setSaving(false);
      return;
    }

    await supabase.from('unit_layouts').delete().eq('tenant_id', hoaId);
    // Их хэмжээний мөрийг (олон байр*давхар) НЭГ insert хүсэлтэд илгээхээс
    // зайлсхийж 500-аар багцлана (хүсэлтийн хэмжээ/тоо хязгаараас найдвартай байлгах).
    if (rows.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from('unit_layouts').insert(rows.slice(i, i + BATCH));
        if (error) { alert(`Хадгалахад алдаа гарлаа: ${error.message}\n\n⚠️ Хуучин мэдээлэл аль хэдийн уссан байж болзошгүй — хуудасыг дахин ачаалж шалгана уу.`); setSaving(false); await loadAllBuildings(); return; }
      }
    }
    setSaving(false);
    alert('Амжилттай хадгалагдлаа.');
    await loadAllBuildings();
  }

  function addFloor(buildingId, entranceId) {
    updateBuilding(buildingId, (b) => ({
      ...b,
      entrances: b.entrances.map((e) => {
        if (e.id !== entranceId) return e;
        const topFloor = e.floors[0];
        const unitCount = topFloor ? topFloor.units.length : 6;
        const nextFloorNo = topFloor ? topFloor.floorNo + 1 : 1;
        return { ...e, floors: [makeFloor(nextFloorNo, unitCount), ...e.floors] };
      }),
    }));
  }
  function removeFloor(buildingId, entranceId) {
    updateBuilding(buildingId, (b) => ({
      ...b,
      entrances: b.entrances.map((e) => (e.id === entranceId && e.floors.length > 0 ? { ...e, floors: e.floors.slice(1) } : e)),
    }));
  }
  function addUnitColumn(buildingId, entranceId) {
    updateBuilding(buildingId, (b) => ({
      ...b,
      entrances: b.entrances.map((e) => (e.id === entranceId
        ? { ...e, floors: e.floors.map((f) => ({ ...f, units: [...f.units, makeUnit(f.units.length + 1, 55.04)] })) }
        : e)),
    }));
  }
  function removeUnitColumn(buildingId, entranceId) {
    updateBuilding(buildingId, (b) => ({
      ...b,
      entrances: b.entrances.map((e) => (e.id === entranceId
        ? { ...e, floors: e.floors.map((f) => ({ ...f, units: f.units.slice(0, -1) })) }
        : e)),
    }));
  }
  function addEntrance(buildingId) {
    updateBuilding(buildingId, (b) => ({ ...b, entrances: [...b.entrances, makeEntrance(String(b.entrances.length + 1))] }));
  }
  function removeEntrance(buildingId, entranceId) {
    updateBuilding(buildingId, (b) => (b.entrances.length > 1 ? { ...b, entrances: b.entrances.filter((e) => e.id !== entranceId) } : b));
  }
  function setEntranceNo(buildingId, entranceId, val) {
    updateBuilding(buildingId, (b) => ({ ...b, entrances: b.entrances.map((e) => (e.id === entranceId ? { ...e, entranceNo: val } : e)) }));
  }
  function setBuildingNo(buildingId, val) {
    updateBuilding(buildingId, (b) => ({ ...b, buildingNo: val }));
  }
  function setStructureType(buildingId, val) {
    updateBuilding(buildingId, (b) => ({ ...b, structureType: val }));
  }

  function handleUnitSave(unitId, patch) {
    if (!editing) return;
    updateBuilding(editing.buildingId, (b) => ({
      ...b,
      entrances: b.entrances.map((e) => ({
        ...e,
        floors: e.floors.map((f) => ({ ...f, units: f.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)) })),
      })),
    }));
    setEditing(null);
  }
  function handleUnitHide(unitId) {
    if (!editing) return;
    updateBuilding(editing.buildingId, (b) => ({
      ...b,
      entrances: b.entrances.map((e) => ({
        ...e,
        floors: e.floors.map((f) => ({ ...f, units: f.units.map((u) => (u.id === unitId ? { ...u, hidden: true } : u)) })),
      })),
    }));
    setEditing(null);
  }
  // 2026-08-19 хэрэглэгч тодорхой заасан: нуугдсан тоотыг Тоот таб дээр
  // саарал өнгөтэй харуулж, дахин дарж "Ил болгох" боломжтой болгов —
  // үмнв нь нуугдсан тоот бүрмөсөн харагдахгүй (SISADMIN үвврвв ч
  // олж чадахгүй, буцаах боломжгүй) болдог байсныг олж зассан.
  function handleUnitUnhide(unitId) {
    if (!editing) return;
    updateBuilding(editing.buildingId, (b) => ({
      ...b,
      entrances: b.entrances.map((e) => ({
        ...e,
        floors: e.floors.map((f) => ({ ...f, units: f.units.map((u) => (u.id === unitId ? { ...u, hidden: false } : u)) })),
      })),
    }));
    setEditing(null);
  }

  const editingBuilding = editing ? buildings.find((b) => b.id === editing.buildingId) : null;

  return (
    <div className="ds-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Байрууд</div>
        <button className="ds-btn-primary" onClick={handleSaveAll} disabled={saving || loading}>
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-darktext text-sm py-8">Ачаалж байна...</div>
      ) : (
      <div className="flex flex-wrap items-end gap-6">
        {buildings.map((bld) => (
          <div key={bld.id} className="shrink-0 flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <input
                className="ds-input w-32"
                value={bld.buildingNo}
                onChange={(e) => setBuildingNo(bld.id, e.target.value)}
                placeholder="жиш: 58/1"
              />
              <button
                onClick={() => removeBuilding(bld.id)}
                title="Байр устгах"
                style={{ height: '32px', width: '32px' }}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed flex items-center justify-center shrink-0"
              >
                <DeleteIcon />
              </button>
            </div>

            <div className="flex items-end gap-3">
              {bld.entrances.map((entrance) => (
                <div key={entrance.id} className="shrink-0 flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <button
                      onClick={() => addFloor(bld.id, entrance.id)}
                      title="Давхар нэмэх"
                      style={{ height: '24px' }}
                      className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-blue-400 flex items-center justify-center"
                    >
                      <ChevronUpIcon />
                    </button>
                    <button
                      onClick={() => removeFloor(bld.id, entrance.id)}
                      title="Давхар хасах"
                      style={{ height: '24px', width: '24px' }}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed flex items-center justify-center text-xs"
                    >
                      −
                    </button>
                  </div>

                  <div className="flex items-stretch gap-1">
                    <div className="flex flex-col gap-1">
                      {entrance.floors.map((floor) => (
                        <div key={floor.id} className="flex items-center gap-2">
                          <div className="w-7 shrink-0 text-[11px] text-mutedtext">{floor.floorNo}F</div>
                          <div className="flex gap-1">
                            {floor.units.map((u) => (
                              <button
                                key={u.id}
                                onClick={() => setEditing({ buildingId: bld.id, unit: u })}
                                style={{ width: '58px', height: '44px' }}
                                className={
                                  u.hidden
                                    ? 'rounded flex flex-col items-center justify-center border border-slate-400/40 dark:border-mutedtext/40 bg-slate-200/40 dark:bg-white/[0.03] text-slate-400 dark:text-mutedtext hover:border-slate-500 dark:hover:border-mutedtext transition-colors shrink-0'
                                    : 'rounded flex flex-col items-center justify-center border border-blue-500/40 bg-blue-500/[0.12] text-customBlue hover:border-customBlue transition-colors shrink-0'
                                }
                              >
                                <div className="text-[11px] font-semibold leading-tight">{formatCode(bld.buildingNo, floor.floorNo, u.doorNo)}</div>
                                {u.sqm != null && <div className="text-[9px] opacity-80 leading-tight">{u.sqm}м²</div>}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => addUnitColumn(bld.id, entrance.id)}
                        title="Давхарт байрлах тоот нэмэх"
                        style={{ width: '24px' }}
                        className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-blue-400 flex items-center justify-center"
                      >
                        <ChevronRightIcon />
                      </button>
                      <button
                        onClick={() => removeUnitColumn(bld.id, entrance.id)}
                        title="Тоот хасах"
                        style={{ width: '24px', height: '24px' }}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed text-xs flex items-center justify-center"
                      >
                        −
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Орцны дугаарууд+"Орц нэмэх" товч — байрны гридийн өргөнөөр голлуулсан */}
            <div className="w-full flex items-center justify-center gap-1.5 mt-2">
              {bld.entrances.map((entrance) => (
                <div key={entrance.id} className="flex items-center gap-1">
                  <input
                    className="ds-input w-20 text-center"
                    value={entrance.entranceNo}
                    onChange={(e) => setEntranceNo(bld.id, entrance.id, e.target.value)}
                    placeholder="Орц №"
                  />
                  {bld.entrances.length > 1 && (
                    <button
                      onClick={() => removeEntrance(bld.id, entrance.id)}
                      title="Орц устгах"
                      style={{ height: '24px', width: '24px' }}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addEntrance(bld.id)}
                title="Орц нэмэх"
                style={{ height: '24px', width: '24px' }}
                className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded text-blue-400 flex items-center justify-center"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addNewBuilding}
          title="Шинэ байр нэмэх"
          className="shrink-0 self-start px-3 py-1.5 rounded text-xs font-semibold border border-blue-500/40 text-blue-400 hover:bg-blue-500/20"
        >
          + Шинэ байр
        </button>
      </div>
      )}

      <UnitEditModal
        key={editing?.unit?.id}
        unit={editing?.unit}
        structureType={editingBuilding?.structureType || 'floor'}
        onStructureTypeChange={(val) => editing && setStructureType(editing.buildingId, val)}
        onClose={() => setEditing(null)}
        onSave={handleUnitSave}
        onHide={handleUnitHide}
        onUnhide={handleUnitUnhide}
      />

      <ConfirmDialog />
      <AlertDialog />
    </div>
  );
}

const ADDRESSING_TABS = [
  { key: 'unit', label: 'Тоот' },
  { key: 'parking', label: 'Зогсоол' },
  { key: 'storage', label: 'Агуулах' },
  { key: 'constructor', label: 'Конструктор' },
  { key: 'constructorReact', label: 'Конструктор (React)' },
];

// "Хаягжилт тохиргоо" (/addressing) — 2026-08-19 хэрэглэгчийн заасны
// дагуу 3 таб (Тоот/Зогсоол/Агуулах) болов. "Тоот" таб = дээрхи
// UnitLayoutDesigner (өмнөх бүрэн бүтээгдсэн grid хуудас, хвндөгдөөгүй).
// Зогсоол/Агуулах — дугаарлалтын дүрэм суулгах ирээдүйн ажил (одоогоор
// зүгээр placeholder, grid шаардлагагүй гэдгийг хэрэглэгч тодорхой
// заасан).
// "Хаягжилт тохиргоо" (/addressing) — 2026-08-19 хэрэглэгчийн заасны
// дагуу 3 таб (Тоот/Зогсоол/Агуулах) болов. "Тоот" таб = дээрхи
// UnitLayoutDesigner (өмнөх бүрэн бүтээгдсэн grid хуудас, хвндөгдөөгүй).
// "Зогсоол" таб = ParkingZoneDesigner (grid БИШ, давхар→бүс жагсаалт,
// tenant даяар нэг нийтлэг сан — 2026-08-19 хэрэглэгч тодорхой заасан).
// "Агуулах" — дугаарлалтын дүрэм суулгах ирээдүйн ажил (placeholder).
export default function AddressConfig() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('unit');

  return (
    <>
      <div className="flex gap-2">
        {ADDRESSING_TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'unit' && <UnitLayoutDesigner />}
      {tab === 'parking' && <ParkingZoneDesigner hoaId={hoaId} />}
      {tab === 'storage' && <StorageZoneDesigner hoaId={hoaId} />}
      {tab === 'constructor' && (
        // 2026-08-31: Хэрэглэгчийн хүсэлт — зогсоол/агуулах/эзэмшлийн
        // хилийг периметрээр нь зурж, давхарга давхаргаар JSON файл
        // болгож гаргах бүрэн бие даасан (standalone) HTML/JS хэрэгсэл.
        // ОДООГООР ямар ч бусад хуудас/датагүй ТУСГААРЛАГДСАН туршилт
        // (iframe) байдлаар холбов — өврийн CSS/JS-тэй бүрэн бие даасан
        // тул React/Tailwind-той зврчилдвхгүй байхын тулд iframe
        // ашигласан. Туршилт амжилттай болвол дараагийн шатанд бодит
        // сан (Supabase)-тай холбоно.
        <div className="ds-card p-0 overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
          <iframe
            src={`${import.meta.env.BASE_URL}parking-grid-drawer.html`}
            title="Зогсоолын грид конструктор"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </div>
      )}
      {tab === 'constructorReact' && (
        // 2026-08-31 (2): Хэрэглэгчийн даалгавар — "Cosmo хвгжүүлэгчийн
        // байр сууринаас" iframe-ийн ОРОНД React-т зохимжтой
        // (idiomatic) архитектураар дахин бичсэн хувилбар. Үзнэ vv
        // GridConstructorReact.jsx-ийн эхлэлийн comment-ийн дэлгэрэнгүй
        // архитектурын тайлбарыг.
        <GridConstructorReact />
      )}
    </>
  );
}
