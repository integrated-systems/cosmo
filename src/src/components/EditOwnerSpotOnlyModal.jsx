import { useEffect, useState } from 'react';
import Modal from './Modal';
import { SimpleListField, SpotSelectField, VehicleListField } from './formFields/ListFields';
import { useGridSpots, fetchTakenGridIds } from '../hooks/useGridSpots';

// 2026-09-13: "Зогсоол, агуулах дангаар өмчлөгч" таб — сууцгүй боловч
// (өөр хотхонд амьдардаг ч гэсэн) зөвхөн зогсоол/агуулах эзэмшдэг
// хүн/ААН-д зориулав. EditOwnerModal.jsx-ийн Тоотын мэдээлэл (Байр/
// Тоот/Талбай/Үл хөдлөх хөрөнгийн дугаар/Ам бүл/хүүхэд) хэсгийг
// БүРЭН арилгаж, зөвхөн Овог/Нэр/Регистр/Утас/Имэйл/Зогсоол/Агуулах/
// Машин/Тэмдэглэл л үлдээв. Хадгалахдаа building_no/floor/door_no
// зэргийг NULL болгож owners хүснэгэлд бичнэ (яг ижил хүснэгэл,
// зөвхөн тоотын холбоосгүй мөр) — Rule of two: SpotSelectField/
// VehicleListField зэргийг EditOwnerModal.jsx-тэй ижил дахин ашиглав.
export default function EditOwnerSpotOnlyModal({ open, onClose, owner, onSave, hoaId }) {
  const { gridParkingSpots, gridStorageSpots, loading: gridSpotsLoading } = useGridSpots(hoaId);
  const [takenGridParkingIds, setTakenGridParkingIds] = useState(new Set());
  const [takenGridStorageIds, setTakenGridStorageIds] = useState(new Set());

  useEffect(() => {
    if (!open || !hoaId) return;
    fetchTakenGridIds(hoaId, 'grid_parkings', owner?.id, null).then(setTakenGridParkingIds);
    fetchTakenGridIds(hoaId, 'grid_storages', owner?.id, null).then(setTakenGridStorageIds);
  }, [open, hoaId, owner?.id]);

  const [form, setForm] = useState(() => ({
    firstname: owner?.firstname || '',
    lastname: owner?.lastname || '',
    regno: owner?.regno || '',
    phones: owner?.phones?.length ? owner.phones : [''],
    emails: owner?.emails?.length ? owner.emails : [''],
    hasGridParking: owner?.has_grid_parking || false,
    gridParkings: owner?.grid_parkings || [],
    hasGridStorage: owner?.has_grid_storage || false,
    gridStorages: owner?.grid_storages || [],
    hasVehicle: owner?.has_vehicle || false, vehicles: owner?.vehicles || [],
    note: owner?.note || '',
  }));

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

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={owner ? 'Зогсоол, агуулах дангаар өмчлөгч засах' : 'Зогсоол, агуулах дангаар өмчлөгч нэмэх'}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
          <button className="ds-btn-primary" onClick={() => onSave?.(form)}>Хадгалах</button>
        </>
      }
    >
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

      <SimpleListField label="Утасны дугаар" items={form.phones} onChange={(v) => set('phones', v)} placeholder="99001122" />
      <SimpleListField label="Имэйл" items={form.emails} onChange={(v) => set('emails', v)} placeholder="email@example.com" />

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
