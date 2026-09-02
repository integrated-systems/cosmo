import { useEffect, useState } from 'react';
import Modal from './Modal';
import { SpotSelectField, VehicleListField } from './formFields/ListFields';
import { useGridSpots, fetchTakenGridIds } from '../hooks/useGridSpots';
import { useUnitSpots, fetchTakenSpotIds } from '../hooks/useUnitSpots';

// "Талбай өмчлөгч бүртгэл" (/clientele) хуудасны Нэмэх/Засах модаль —
// EditOwnerModal.jsx-ийн бүтэц/загварыг дахин ашигласан (Rule of two).
export default function EditClientModal({ open, onClose, client, onSave, hoaId, initialGridSpot }) {
  const { spots: parkingSpots, loading: parkingLoading } = useUnitSpots(hoaId, 'parking');
  const { spots: storageSpots, loading: storageLoading } = useUnitSpots(hoaId, 'storage');
  const { gridParkingSpots, gridStorageSpots, gridLandPlots, loading: gridSpotsLoading } = useGridSpots(hoaId);
  const [takenParkingIds, setTakenParkingIds] = useState(new Set());
  const [takenStorageIds, setTakenStorageIds] = useState(new Set());
  const [takenGridParkingIds, setTakenGridParkingIds] = useState(new Set());
  const [takenGridStorageIds, setTakenGridStorageIds] = useState(new Set());
  const [takenGridLandIds, setTakenGridLandIds] = useState(new Set());

  useEffect(() => {
    if (!open || !hoaId) return;
    fetchTakenSpotIds(hoaId, 'parkings', null, client?.id).then(setTakenParkingIds);
    fetchTakenSpotIds(hoaId, 'storages', null, client?.id).then(setTakenStorageIds);
    fetchTakenGridIds(hoaId, 'grid_parkings', null, client?.id).then(setTakenGridParkingIds);
    fetchTakenGridIds(hoaId, 'grid_storages', null, client?.id).then(setTakenGridStorageIds);
    fetchTakenGridIds(hoaId, 'grid_land_plots', null, client?.id).then(setTakenGridLandIds);
  }, [open, hoaId, client?.id]);

  const [form, setForm] = useState(() => ({
    legalEntityName: client?.legal_entity_name || '',
    regNo: client?.reg_no || '',
    sqm: client?.sqm ?? '',
    propertyNo: client?.property_no || '',
    ceoName: client?.ceo_first_name_last_name || '',
    mobile: client?.mobile || '',
    phone: client?.phone || '',
    email: client?.email || '',
    contractNo: client?.contract_no || '',
    contractStart: client?.contract_start || '',
    contractEnd: client?.contract_end || '',
    hasParking: client?.has_parking || false, parkings: client?.parkings || [],
    hasStorage: client?.has_storage || false, storages: client?.storages || [],
    hasGridParking: client?.has_grid_parking || (!client && initialGridSpot?.kind === 'parking') || false,
    gridParkings: client?.grid_parkings || (!client && initialGridSpot?.kind === 'parking' ? [initialGridSpot.item] : []),
    hasGridStorage: client?.has_grid_storage || (!client && initialGridSpot?.kind === 'storage') || false,
    gridStorages: client?.grid_storages || (!client && initialGridSpot?.kind === 'storage' ? [initialGridSpot.item] : []),
    hasGridLand: client?.has_grid_land || (!client && initialGridSpot?.kind === 'land') || false,
    gridLandPlots: client?.grid_land_plots || (!client && initialGridSpot?.kind === 'land' ? [initialGridSpot.item] : []),
    hasVehicle: client?.has_vehicle || false, vehicles: client?.vehicles || [],
    note: client?.note || '',
  }));

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Талбай өмчлөгч засах' : 'Талбай өмчлөгч нэмэх'}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
          <button className="ds-btn-primary" onClick={() => onSave?.(form)}>Хадгалах</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хуулийн этгээдийн нэр</label>
          <input className="ds-input w-full" value={form.legalEntityName} onChange={(e) => set('legalEntityName', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Регистрийн дугаар</label>
          <input className="ds-input w-full" value={form.regNo} onChange={(e) => set('regNo', e.target.value)} />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Талбай (м²)</label>
        <input type="number" step="0.01" className="ds-input w-full" value={form.sqm} onChange={(e) => set('sqm', e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Өмчийн Улсын бүртгэлийн дугаар</label>
        <input className="ds-input w-full" value={form.propertyNo} onChange={(e) => set('propertyNo', e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гүйцэтгэх удирдлага (Нэр Овог)</label>
        <input className="ds-input w-full" value={form.ceoName} onChange={(e) => set('ceoName', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гар утас</label>
          <input className="ds-input w-full" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Утас</label>
          <input className="ds-input w-full" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Имэйл</label>
        <input className="ds-input w-full" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гэрээ №</label>
          <input className="ds-input w-full" value={form.contractNo} onChange={(e) => set('contractNo', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гэрээ эхлэх</label>
          <input type="date" className="ds-input w-full" value={form.contractStart} onChange={(e) => set('contractStart', e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гэрээ дуусах</label>
          <input type="date" className="ds-input w-full" value={form.contractEnd} onChange={(e) => set('contractEnd', e.target.value)} />
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
      {/* 2026-09-02: Хэрэглэгчийн хүсэлт — "Талбай өмчлөгч" (аж ахуйн
          нэгж) л Зогсоол/Агуулах/Талбай (полигон) БүГДийг "Конструктор
          (React)"-оос сонгож холбож болно (Сууц өмчлөгчид зөвхөн
          Зогсоол/Агуулах-ыг л зөвшөөрнэ). */}
      <SpotSelectField
        label="Зогсоол (грид)" checked={form.hasGridParking}
        onToggle={(v) => setForm((f) => ({ ...f, hasGridParking: v, gridParkings: v && f.gridParkings.length === 0 ? [{ id: '', floorLevel: '', code: '' }] : f.gridParkings }))}
        items={form.gridParkings} onChange={(v) => set('gridParkings', v)} addLabel="+ Грид зогсоол нэмэх"
        spots={gridParkingSpots} takenIds={takenGridParkingIds} loading={gridSpotsLoading}
      />
      <SpotSelectField
        label="Агуулах (грид)" checked={form.hasGridStorage}
        onToggle={(v) => setForm((f) => ({ ...f, hasGridStorage: v, gridStorages: v && f.gridStorages.length === 0 ? [{ id: '', floorLevel: '', code: '' }] : f.gridStorages }))}
        items={form.gridStorages} onChange={(v) => set('gridStorages', v)} addLabel="+ Грид агуулах нэмэх"
        spots={gridStorageSpots} takenIds={takenGridStorageIds} loading={gridSpotsLoading}
      />
      <SpotSelectField
        label="Талбай (полигон)" checked={form.hasGridLand}
        onToggle={(v) => setForm((f) => ({ ...f, hasGridLand: v, gridLandPlots: v && f.gridLandPlots.length === 0 ? [{ id: '', floorLevel: '', code: '' }] : f.gridLandPlots }))}
        items={form.gridLandPlots} onChange={(v) => set('gridLandPlots', v)} addLabel="+ Талбай нэмэх"
        spots={gridLandPlots} takenIds={takenGridLandIds} loading={gridSpotsLoading}
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
