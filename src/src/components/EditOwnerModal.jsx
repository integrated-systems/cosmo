import { useEffect, useState } from 'react';
import Modal from './Modal';
import { SimpleListField, SpotSelectField, VehicleListField } from './formFields/ListFields';
import { useUnitLayouts, fetchTakenUnitKeys } from '../hooks/useUnitLayouts';
import { useGridSpots, fetchTakenGridIds } from '../hooks/useGridSpots';

// suh.html-ийн загварт тулгуурласан "Сууц өмчлөгч засах" модал —
// 2026-08-13 хэрэглэгчийн өгсөн 2 screenshot-той тулгаж бүтээв. Хэдэн ч
// утас/имэйл/агуулах/зогсоол/машинтай байж болох тул давтагдах жагсаалт
// хэсгүүдийг (SimpleListField/SpotListField/VehicleListField) "Rule of
// two"-ийн дагуу тусад нь задалж (formFields/ListFields.jsx, 2026-08-16
// EditClientModal.jsx-д ч дахин ашиглав), 5+ газарт дахин ашиглав.
//
// 2026-08-17 (3-р засвар): "Байр"+"Тоот" hardcode dropdown-ыг арилгаж
// `unit_layouts`-аас (AddressConfig.jsx-д зохион байгуулсан бодит
// хаягжилт) ЛИНКЭД dropdown болгов — "Давхар" dropdown бүрмөсүн
// устгав (Тоот сонгомогц давхар нь автоматаар тодорхойлогдоно). "Байр
// ба тоот дугаарууд хаягжилтын голлох мэдээлэл" гэдгийг тусгав.

function SectionTitle({ children }) {
  return (
    <div className="text-[11px] font-semibold text-slate-500 dark:text-mutedtext uppercase tracking-[0.4px] mb-3 mt-5 first:mt-0">
      {children}
    </div>
  );
}

export default function EditOwnerModal({ open, onClose, owner, onSave, hoaId, initialUnit, initialGridSpot }) {
  const { buildings, loading: layoutsLoading } = useUnitLayouts(hoaId);
  const [takenUnitKeys, setTakenUnitKeys] = useState(new Set());
  const [takenLoading, setTakenLoading] = useState(true);

  // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — доор "unitOptions"-ыг шүүж, автомат
  // сонголтыг ч зөвхөн СУЛ тоот руу л чиглүүлэхэд ашиглана (аль хэдийн
  // эзэмшигдсэн тоотыг dropdown-оос бүрэн хасна).
  useEffect(() => {
    if (!hoaId) return;
    setTakenLoading(true);
    fetchTakenUnitKeys(hoaId, owner?.id).then((s) => { setTakenUnitKeys(s); setTakenLoading(false); });
  }, [hoaId, owner?.id]);
  const { gridParkingSpots, gridStorageSpots, loading: gridSpotsLoading } = useGridSpots(hoaId);
  const [takenGridParkingIds, setTakenGridParkingIds] = useState(new Set());
  const [takenGridStorageIds, setTakenGridStorageIds] = useState(new Set());

  useEffect(() => {
    if (!open || !hoaId) return;
    fetchTakenGridIds(hoaId, 'grid_parkings', owner?.id, null).then(setTakenGridParkingIds);
    fetchTakenGridIds(hoaId, 'grid_storages', owner?.id, null).then(setTakenGridStorageIds);
  }, [open, hoaId, owner?.id]);

  // 2026-09-03 ОЛСОН БОДИТ АЛДАА — грид (Конструктор)-оос сонгосон
  // слотын "code" (дэлгэцэнд харагдах текст) нь СОНГОСОН үеийн
  // snapshot тул слотыг хожим дахин нэрлэвэл ("A 333" -> "A 336")
  // Засах модал нээхэд хуучин нэр хэвээр харагддаг байв (холбоос
  // үнэн хэрэгтээ id-аар зөв хэвээрээ, зөвхөн ТЕКСТ л сэргээгдэхгүй
  // байсан). ҮҮнийг useGridSpots-ийн LIVE жагсаалттай тааруулж
  // шинэчилнэ (ачаалагдаж дуусмагц НЭГ удаа).
  useEffect(() => {
    if (gridSpotsLoading) return;
    setForm((f) => ({
      ...f,
      gridParkings: f.gridParkings.map((it) => {
        const live = gridParkingSpots.find((g) => g.id === it.id);
        return live ? { ...it, code: live.code, floorLevel: live.floorLevel } : it;
      }),
      gridStorages: f.gridStorages.map((it) => {
        const live = gridStorageSpots.find((g) => g.id === it.id);
        return live ? { ...it, code: live.code, floorLevel: live.floorLevel } : it;
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSpotsLoading]);

  // 2026-08-15: owner нь одоо Supabase-ийн бодит мөр (snake_case багана)
  // — өмнө mock EXAMPLE_OWNERS-ийн бүтэц (building/phone/email г.м)
  // ашигладаг байсныг бодит DB талбарын нэртэй уялдуулав. 2026-08-17:
  // `initialUnit` prop-оор (Property.jsx-ийн өмчлөгчгүй тоот дарахад)
  // тодорхой байр/давхар/тоот/м²-ийг урьдчилан бүглэж болно.
  const [form, setForm] = useState(() => ({
    buildingNo: owner?.building_no ?? initialUnit?.buildingNo ?? '',
    floor: owner?.floor ?? initialUnit?.floor ?? '',
    doorNo: owner?.door_no ?? initialUnit?.doorNo ?? '',
    sqm: owner?.sqm ?? initialUnit?.sqm ?? '',
    propertyNo: owner?.property_no || '',
    firstname: owner?.firstname || '',
    lastname: owner?.lastname || '',
    regno: owner?.regno || '',
    ownDate: owner?.own_date || '',
    phones: owner?.phones?.length ? owner.phones : [''],
    emails: owner?.emails?.length ? owner.emails : [''],
    people: owner?.people_count ?? '',
    child1: owner?.child_0_5 ?? '',
    child2: owner?.child_6_18 ?? '',
    petCount: owner?.pet_count ?? '',
    hasGridParking: owner?.has_grid_parking || (!owner && initialGridSpot?.kind === 'parking') || false,
    gridParkings: owner?.grid_parkings || (!owner && initialGridSpot?.kind === 'parking' ? [initialGridSpot.item] : []),
    hasGridStorage: owner?.has_grid_storage || (!owner && initialGridSpot?.kind === 'storage') || false,
    gridStorages: owner?.grid_storages || (!owner && initialGridSpot?.kind === 'storage' ? [initialGridSpot.item] : []),
    hasVehicle: owner?.has_vehicle || false, vehicles: owner?.vehicles || [],
    note: owner?.note || '',
  }));

  // Шинээр нэмэх үед (owner=null) хаягжилт ачаалагдмагц анхны байр+тоот
  // автоматаар сонгогдоно (хэрэглэгч заавал ГАРААР сонгох шаардлагагүй)
  // — гэхдээ `initialUnit`-аар аль хэдийн тодорхой тоот бүглэгдсэн бол
  // (form.buildingNo аль хэдийн хоосон биш) энэ автомат сонголт ажиллахгүй.
  useEffect(() => {
    if (owner || layoutsLoading || takenLoading || buildings.length === 0 || form.buildingNo !== '') return;
    // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — эхний СУЛ (эзэмшигдээгүй) байр+тоотыг
    // хайж сонгоно (eмнe нь unitOptions[0]-ыг үргүйгээр сонгодог байсан
    // тул, эзэмшигдсэн тоот АНХДАГЧААР сонгогдож, шинэ өмчлөгч давхар
    // бүртгэгдэх эрсдэлтэй байв).
    let picked = null;
    for (const b of buildings) {
      const freeUnit = b.units.find((u) => !takenUnitKeys.has(`${b.buildingNo}|${u.floor}|${u.doorNo}`));
      if (freeUnit) { picked = { buildingNo: b.buildingNo, unit: freeUnit }; break; }
    }
    if (!picked) { picked = { buildingNo: buildings[0].buildingNo, unit: buildings[0].units[0] }; }
    setForm((f) => ({
      ...f,
      buildingNo: picked.buildingNo,
      floor: picked.unit?.floor ?? '',
      doorNo: picked.unit?.doorNo ?? '',
      sqm: picked.unit?.sqm ?? f.sqm,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutsLoading, takenLoading, buildings, takenUnitKeys]);

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  const currentBuilding = buildings.find((b) => b.buildingNo === form.buildingNo);
  const allUnitOptions = currentBuilding?.units || [];
  const selectedUnitKey = form.floor !== '' && form.doorNo !== '' ? `${form.floor}|${form.doorNo}` : '';
  // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — эзэмшигдсэн тоотыг dropdown-оос
  // хасна, гэхдээ ОДООГИЙН сонгогдсон (Засах үед eeрийнхee) тоотыг
  // хэвээр үзүүлнэ.
  const isUnitTaken = (buildingNo, floor, doorNo) => takenUnitKeys.has(`${buildingNo}|${floor}|${doorNo}`);
  const unitOptions = allUnitOptions.filter((u) => !isUnitTaken(form.buildingNo, u.floor, u.doorNo) || (u.floor === form.floor && u.doorNo === form.doorNo));

  function handleBuildingChange(val) {
    const b = buildings.find((x) => x.buildingNo === val);
    const freeUnit = b?.units.find((u) => !isUnitTaken(val, u.floor, u.doorNo)) ?? b?.units[0];
    setForm((f) => ({
      ...f,
      buildingNo: val,
      floor: freeUnit?.floor ?? '',
      doorNo: freeUnit?.doorNo ?? '',
      sqm: freeUnit?.sqm ?? f.sqm,
    }));
  }
  function handleUnitChange(val) {
    if (!val) return;
    const [floor, doorNo] = val.split('|').map(Number);
    const unit = allUnitOptions.find((u) => u.floor === floor && u.doorNo === doorNo);
    setForm((f) => ({ ...f, floor, doorNo, sqm: unit?.sqm ?? f.sqm }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={owner ? 'Сууц өмчлөгч засах' : 'Сууц өмчлөгч нэмэх'}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
          <button className="ds-btn-primary" onClick={() => onSave?.(form)}>Хадгалах</button>
        </>
      }
    >
      <SectionTitle>Тоотын мэдээлэл</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Байр</label>
          <select className="ds-select w-full" value={form.buildingNo} onChange={(e) => handleBuildingChange(e.target.value)}>
            {buildings.length === 0 && <option value="">{layoutsLoading ? 'Ачаалж байна...' : 'Хаягжилт тохируулаагүй'}</option>}
            {buildings.map((b) => <option key={b.buildingNo} value={b.buildingNo}>{b.buildingNo}-р байр</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тоот</label>
          <select className="ds-select w-full" value={selectedUnitKey} onChange={(e) => handleUnitChange(e.target.value)}>
            <option value="">Сонгоно уу</option>
            {unitOptions.map((u) => (
              <option key={`${u.floor}-${u.doorNo}`} value={`${u.floor}|${u.doorNo}`}>{u.code}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Талбай (м²) — тоотоос автоматаар</label>
        <input
          type="text"
          readOnly
          disabled
          className="ds-input w-full bg-slate-100 dark:bg-appbg text-darktext cursor-not-allowed"
          value={form.sqm}
          title="Барилгын тоотын талбай үл хувьсагч — Хаягжилт тохиргоо (AddressConfig) хуудаснаас СИСАДМИН л засна"
        />
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Өмчийн Улсын бүртгэлийн дугаар (ӨУБД Сууц)</label>
        <input className="ds-input w-full" value={form.propertyNo} onChange={(e) => set('propertyNo', e.target.value)} />
      </div>

      <SectionTitle>Сууц өмчлөгчийн мэдээлэл</SectionTitle>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Нэр</label>
          <input className="ds-input w-full" value={form.firstname} onChange={(e) => set('firstname', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Овог</label>
          <input className="ds-input w-full" value={form.lastname} onChange={(e) => set('lastname', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Регистрийн дугаар</label>
          <input className="ds-input w-full" value={form.regno} onChange={(e) => set('regno', e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Өмчилсөн огноо</label>
        <input type="date" className="ds-input w-full" value={form.ownDate} onChange={(e) => set('ownDate', e.target.value)} />
      </div>

      <SimpleListField label="Утасны дугаар" items={form.phones} onChange={(v) => set('phones', v)} placeholder="99001122" />
      <SimpleListField label="Имэйл" items={form.emails} onChange={(v) => set('emails', v)} placeholder="email@example.com" />

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Ам бүл</label>
          <input type="number" className="ds-input w-full" value={form.people} onChange={(e) => set('people', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">0-6 насны хүүхэд</label>
          <input type="number" className="ds-input w-full" value={form.child1} onChange={(e) => set('child1', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">6-18 насны хүүхэд</label>
          <input type="number" className="ds-input w-full" value={form.child2} onChange={(e) => set('child2', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тэжээвэр амьтан</label>
          <input type="number" className="ds-input w-full" value={form.petCount} onChange={(e) => set('petCount', e.target.value)} />
        </div>
      </div>

      {/* 2026-09-02 (2): "Зогсоол"/"Агуулах" (хуучин, unit_parking/
          unit_storage-д тулгуурласан) талбарыг үл мврг үй устгав —
          эдгээрийг удирддаг байсан "Хаягжилт тохиргоо" табыг арилгасан
          тул холбоосгүй чекбокс болж хувирсан байв. */}
      {/* 2026-09-02: Хэрэглэгчийн хүсэлт — "Конструктор (React)"-ээр
          зурсан слот/агуулах/талбайг owners-той холбох 3 шинэ талбар
          (аль хэдийн байгаа "Зогсоол"/"Агуулах"-аас тусдаа эх сурвалж). */}
      <SpotSelectField
        label="Зогсоол" checked={form.hasGridParking}
        onToggle={(v) => setForm((f) => ({ ...f, hasGridParking: v, gridParkings: v && f.gridParkings.length === 0 ? [{ id: '', floorLevel: '', code: '', propertyNo: '' }] : f.gridParkings }))}
        items={form.gridParkings} onChange={(v) => set('gridParkings', v)} addLabel="+ Грид зогсоол нэмэх"
        spots={gridParkingSpots} takenIds={takenGridParkingIds} loading={gridSpotsLoading}
        propertyLabel="ӨУБД Зогсоол"
      />
      <SpotSelectField
        label="Агуулах" checked={form.hasGridStorage}
        onToggle={(v) => setForm((f) => ({ ...f, hasGridStorage: v, gridStorages: v && f.gridStorages.length === 0 ? [{ id: '', floorLevel: '', code: '', propertyNo: '' }] : f.gridStorages }))}
        items={form.gridStorages} onChange={(v) => set('gridStorages', v)} addLabel="+ Грид агуулах нэмэх"
        spots={gridStorageSpots} takenIds={takenGridStorageIds} loading={gridSpotsLoading}
        propertyLabel="ӨУБД Агуулах"
      />
      <VehicleListField
        checked={form.hasVehicle}
        onToggle={(v) => setForm((f) => ({ ...f, hasVehicle: v, vehicles: v && f.vehicles.length === 0 ? [{ digits: '', letters: '' }] : f.vehicles }))}
        items={form.vehicles} onChange={(v) => set('vehicles', v)}
      />
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тэмдэглэл</label>
        <textarea
          className="ds-input w-full resize-none"
          style={{ height: '52px' }}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>
    </Modal>
  );
}
