import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DeleteIcon } from './icons/Icons';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import { fetchAllRows } from '../lib/fetchAllRows';

// "Хаягжилт тохиргоо" (/addressing) — "Агуулах" таб. ParkingZoneDesigner
// ("Зогсоол" таб)-тай ЯГ ИЖИЛ бvтэц/зарчим (дугаарлах систем адил
// гэдгийг 2026-08-19 хэрэглэгч тодорхой заасан — Rule of two,
// код давхардлаас сэргийлэхийн тулд ирээдvйд эдгээр хоёрыг НЭГ
// параметржvvлсэн component болгож нэгтгэж болно). СИСАДМИН эдитор,
// локал state зохион байгуулаад НЭГ глобал "Хадгалах" товчоор snapshot
// save хийнэ — grid огт БИШ, энгийн жагсаалт: Давхар(чөлөөт текст,
// "B1"/"F2" гэх мэт) → тус бvрд нь Бvс(тэмдэглэл+холбогч тэмдэг+
// дугаарын хvрээ). ЯГ ИЖИЛ бvс+дугаар өөр өөр давхарт ДАВТАГДАЖ болно.
//
// Агуулах tenant (хотхон) даяар НЭГ нийтлэг сан — байртай холбоогvй.
const SEPARATORS = [
  { value: '', label: 'vгvй' },
  { value: '-', label: '-' },
  { value: '/', label: '/' },
  { value: ' ', label: 'зай' },
];

let nextId = 5000;
function genId() { return nextId++; }

function makeZone() {
  return { id: genId(), zoneLabel: '', separator: '', startNo: 1, endNo: 50 };
}
function makeFloor() {
  return { id: genId(), floorLevel: '', zones: [makeZone()] };
}

function formatSpotCode(zoneLabel, separator, spotNo) {
  return `${zoneLabel}${separator}${spotNo}`;
}

export default function StorageZoneDesigner({ hoaId }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const { alert, AlertDialog } = useAlert();
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('storage_units').select('*').eq('tenant_id', hoaId).eq('hidden', false)
    );
    if (!data || data.length === 0) {
      setFloors([makeFloor()]);
      setLoading(false);
      return;
    }
    const byFloor = new Map();
    for (const row of data) {
      if (!byFloor.has(row.floor_level)) byFloor.set(row.floor_level, new Map());
      const zoneKey = `${row.zone_label}\u0000${row.separator}`;
      const zones = byFloor.get(row.floor_level);
      if (!zones.has(zoneKey)) {
        zones.set(zoneKey, { id: genId(), zoneLabel: row.zone_label, separator: row.separator, startNo: row.spot_no, endNo: row.spot_no });
      } else {
        const z = zones.get(zoneKey);
        z.startNo = Math.min(z.startNo, row.spot_no);
        z.endNo = Math.max(z.endNo, row.spot_no);
      }
    }
    const loadedFloors = [...byFloor.entries()].map(([floorLevel, zones]) => ({
      id: genId(),
      floorLevel,
      zones: [...zones.values()],
    }));
    setFloors(loadedFloors);
    setLoading(false);
  }

  useEffect(() => {
    if (hoaId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  function addFloor() {
    setFloors((fs) => [...fs, makeFloor()]);
  }
  async function removeFloor(floorId) {
    if (!(await confirm('Энэ давхрыг vvнд байгаа бvх бvстэй нь устгах уу?'))) return;
    setFloors((fs) => fs.filter((f) => f.id !== floorId));
  }
  function setFloorLevel(floorId, value) {
    setFloors((fs) => fs.map((f) => (f.id === floorId ? { ...f, floorLevel: value } : f)));
  }
  function addZone(floorId) {
    setFloors((fs) => fs.map((f) => (f.id === floorId ? { ...f, zones: [...f.zones, makeZone()] } : f)));
  }
  function removeZone(floorId, zoneId) {
    setFloors((fs) => fs.map((f) => (f.id === floorId ? { ...f, zones: f.zones.filter((z) => z.id !== zoneId) } : f)));
  }
  function setZoneField(floorId, zoneId, field, value) {
    setFloors((fs) => fs.map((f) => (
      f.id !== floorId ? f : { ...f, zones: f.zones.map((z) => (z.id === zoneId ? { ...z, [field]: value } : z)) }
    )));
  }

  async function handleSaveAll() {
    for (const f of floors) {
      if (!f.floorLevel.trim()) { alert('Бvх давхрын нэрийг бөглөнө vv.'); return; }
      for (const z of f.zones) {
        if (!z.zoneLabel.trim()) { alert('Бvх бvсийн тэмдэглэлийг бөглөнө vv.'); return; }
        if (Number(z.endNo) < Number(z.startNo)) { alert(`"${f.floorLevel}" давхрын "${z.zoneLabel}" бvсэд төгсгөл эхлэлээс бага байна.`); return; }
      }
    }

    setSaving(true);
    const rows = [];
    for (const f of floors) {
      for (const z of f.zones) {
        for (let n = Number(z.startNo); n <= Number(z.endNo); n++) {
          rows.push({
            tenant_id: hoaId,
            floor_level: f.floorLevel.trim(),
            zone_label: z.zoneLabel.trim(),
            separator: z.separator,
            spot_no: n,
          });
        }
      }
    }

    const { error: delError } = await supabase.from('storage_units').delete().eq('tenant_id', hoaId);
    if (delError) { alert(delError.message); setSaving(false); return; }

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('storage_units').insert(rows.slice(i, i + 500));
      if (error) { alert(error.message); setSaving(false); return; }
    }

    setSaving(false);
    alert('Хадгаллаа.');
    loadAll();
  }

  return (
    <div className="ds-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулахын бvсчлэл</div>
        <button className="ds-btn-primary" onClick={handleSaveAll} disabled={saving || loading}>
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-darktext text-sm py-8">Ачаалж байна...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {floors.map((f) => (
            <div key={f.id} className="ds-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  className="ds-input w-32"
                  value={f.floorLevel}
                  onChange={(e) => setFloorLevel(f.id, e.target.value)}
                  placeholder="жиш: B1, F2"
                />
                <button
                  onClick={() => removeFloor(f.id)}
                  title="Давхар устгах"
                  style={{ height: '32px', width: '32px' }}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed flex items-center justify-center shrink-0"
                >
                  <DeleteIcon />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {f.zones.map((z) => (
                  <div key={z.id} className="flex items-center gap-2 flex-wrap">
                    <input
                      className="ds-input w-20"
                      value={z.zoneLabel}
                      onChange={(e) => setZoneField(f.id, z.id, 'zoneLabel', e.target.value)}
                      placeholder="жиш: B, G"
                    />
                    <select
                      className="ds-select w-24"
                      value={z.separator}
                      onChange={(e) => setZoneField(f.id, z.id, 'separator', e.target.value)}
                    >
                      {SEPARATORS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <span className="text-[11px] text-mutedtext">Эхлэх:</span>
                    <input
                      type="number"
                      className="ds-input w-20"
                      value={z.startNo}
                      onChange={(e) => setZoneField(f.id, z.id, 'startNo', e.target.value)}
                    />
                    <span className="text-[11px] text-mutedtext">Төгсгөл:</span>
                    <input
                      type="number"
                      className="ds-input w-20"
                      value={z.endNo}
                      onChange={(e) => setZoneField(f.id, z.id, 'endNo', e.target.value)}
                    />
                    <span className="text-[11px] text-mutedtext">
                      → {formatSpotCode(z.zoneLabel || '?', z.separator, z.startNo)}...{formatSpotCode(z.zoneLabel || '?', z.separator, z.endNo)}
                      {' '}({Math.max(0, Number(z.endNo) - Number(z.startNo) + 1)}ш)
                    </span>
                    <button
                      onClick={() => removeZone(f.id, z.id)}
                      title="Бvс устгах"
                      style={{ height: '28px', width: '28px' }}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-customRed flex items-center justify-center shrink-0"
                    >
                      −
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addZone(f.id)}
                  className="ds-btn-secondary self-start"
                >
                  + Бvс нэмэх
                </button>
              </div>
            </div>
          ))}
          <button onClick={addFloor} className="ds-btn-secondary self-start">+ Давхар нэмэх</button>
        </div>
      )}

      <ConfirmDialog />
      <AlertDialog />
    </div>
  );
}
