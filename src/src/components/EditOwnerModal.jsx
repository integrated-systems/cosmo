import { useEffect, useState } from 'react';
import Modal from './Modal';
import { SimpleListField, SpotSelectField, VehicleListField } from './formFields/ListFields';
import { useUnitLayouts } from '../hooks/useUnitLayouts';
import { useUnitSpots, fetchTakenSpotIds } from '../hooks/useUnitSpots';

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

export default function EditOwnerModal({ open, onClose, owner, onSave, hoaId, initialUnit }) {
  const { buildings, loading: layoutsLoading } = useUnitLayouts(hoaId);
  const { spots: parkingSpots, loading: parkingLoading } = useUnitSpots(hoaId, 'parking');
  const { spots: storageSpots, loading: storageLoading } = useUnitSpots(hoaId, 'storage');
  const [takenParkingIds, setTakenParkingIds] = useState(new Set());
  const [takenStorageIds, setTakenStorageIds] = useState(new Set());

  useEffect(() => {
    if (!open || !hoaId) return;
    fetchTakenSpotIds(hoaId, 'parkings', owner?.id, null).then(setTakenParkingIds);
    fetchTakenSpotIds(hoaId, 'storages', owner?.id, null).then(setTakenStorageIds);
  }, [open, hoaId, owner?.id]);

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
    hasStorage: owner?.has_storage || false, storages: owner?.storages || [],
    hasParking: owner?.has_parking || false, parkings: owner?.parkings || [],
    hasVehicle: owner?.has_vehicle || false, vehicles: owner?.vehicles || [],
    note: owner?.note || '',
  }));

  // Шинээр нэмэх үед (owner=null) хаягжилт ачаалагдмагц анхны байр+тоот
  // автоматаар сонгогдоно (хэрэглэгч заавал ГАРААР сонгох шаардлагагүй)
  // — гэхдээ `initialUnit`-аар аль хэдийн тодорхой тоот бүглэгдсэн бол
  // (form.buildingNo аль хэдийн хоосон биш) энэ автомат сонголт ажиллахгүй.
  useEffect(() => {
    if (owner || layoutsLoading || buildings.length === 0 || form.buildingNo !== '') return;
    const firstBuilding = buildings[0];
    const firstUnit = firstBuilding.units[0];
    setForm((f) => ({
      ...f,
      buildingNo: firstBuilding.buildingNo,
      floor: firstUnit?.floor ?? '',
      doorNo: firstUnit?.doorNo ?? '',
      sqm: firstUnit?.sqm ?? f.sqm,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutsLoading, buildings]);

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  const currentBuilding = buildings.find((b) => b.buildingNo === form.buildingNo);
  const unitOptions = currentBuilding?.units || [];
  const selectedUnitKey = form.floor !== '' && form.doorNo !== '' ? `${form.floor}|${form.doorNo}` : '';

  function handleBuildingChange(val) {
    const b = buildings.find((x) => x.buildingNo === val);
    const firstUnit = b?.units[0];
    setForm((f) => ({
      ...f,
      buildingNo: val,
      floor: firstUnit?.floor ?? '',
      doorNo: firstUnit?.doorNo ?? '',
      sqm: firstUnit?.sqm ?? f.sqm,
    }));
  }
  function handleUnitChange(val) {
    if (!val) return;
    const [floor, doorNo] = val.split('|').map(Number);
    const unit = unitOptions.find((u) => u.floor === floor && u.doorNo === doorNo);
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
          <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
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
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Өмчийн Улсын бүртгэлийн дугаар</label>
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

      <div className="grid grid-cols-3 gap-2 mb-4">
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
      </div>

      <SpotSelectField
        label="Зогсоол" checked={form.hasParking}
        onToggle={(v) => setForm((f) => ({ ...f, hasParking: v, parkings: v && f.parkings.length === 0 ? [{ id: '', floorLevel: '', code: '' }] : f.parkings }))}
        items={form.parkings} onChange={(v) => set('parkings', v)} addLabel="+ Зогсоол нэмэх"
        spots={parkingSpots} takenIds={takenParkingIds} loading={parkingLoading}
      />
      <SpotSelectField
        label="Агуулах" checked={form.hasStorage}
        onToggle={(v) => setForm((f) => ({ ...f, hasStorage: v, storages: v && f.storages.length === 0 ? [{ id: '', floorLevel: '', code: '' }] : f.storages }))}
        items={form.storages} onChange={(v) => set('storages', v)} addLabel="+ Агуулах нэмэх"
        spots={storageSpots} takenIds={takenStorageIds} loading={storageLoading}
      />
      <VehicleListField
        checked={form.hasVehicle}
        onToggle={(v) => setForm((f) => ({ ...f, hasVehicle: v, vehicles: v && f.vehicles.length === 0 ? [{ digits: '', letters: '' }] : f.vehicles }))}
        items={form.vehicles} onChange={(v) => set('vehicles', v)}
      />
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тайлбар</label>
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
