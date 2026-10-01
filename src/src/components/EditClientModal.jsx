import { useEffect, useState } from 'react';
import Modal from './Modal';
import { SpotSelectField, VehicleListField } from './formFields/ListFields';
import { useGridSpots, fetchTakenGridIds, sumLinkedSqm } from '../hooks/useGridSpots';
import { supabase } from '../lib/supabaseClient';
import { mergeGridSpotLists } from '../lib/spotVehicleFormat';

// "Талбай өмчлөгч бүртгэл" (/clientele) хуудасны Нэмэх/Засах модаль —
// EditOwnerModal.jsx-ийн бүтэц/загварыг дахин ашигласан (Rule of two).
export default function EditClientModal({ open, onClose, client, onSave, hoaId, initialGridSpot }) {
  // Зогсоол/Агуулахын хоосон слотыг шинээр нэмж буй (client=null) үед л
  // холбогдох — Хуулийн этгээдийн нэрээр аль хэдийн бүртгэлтэй Талбай
  // өмчлөгчийг хайж, сонговол түүнийх рүү формыг автоматаар ачаална.
  const isGridSpotNewFlow = !client && !!initialGridSpot;
  const [existingClientId, setExistingClientId] = useState(null);
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { gridParkingSpots, gridStorageSpots, gridLandPlots, loading: gridSpotsLoading } = useGridSpots(hoaId);
  const [takenGridParkingIds, setTakenGridParkingIds] = useState(new Set());
  const [takenGridStorageIds, setTakenGridStorageIds] = useState(new Set());
  const [takenGridLandIds, setTakenGridLandIds] = useState(new Set());

  useEffect(() => {
    if (!open || !hoaId) return;
    fetchTakenGridIds(hoaId, 'grid_parkings', null, client?.id).then(setTakenGridParkingIds);
    fetchTakenGridIds(hoaId, 'grid_storages', null, client?.id).then(setTakenGridStorageIds);
    fetchTakenGridIds(hoaId, 'grid_land_plots', null, client?.id).then(setTakenGridLandIds);
  }, [open, hoaId, client?.id]);

  // 2026-09-03: EditOwnerModal.jsx-той ижил засвар — грид слотын
  // "code" snapshot-ыг useGridSpots-ийн LIVE жагсаалттай тааруулж
  // шинэчилнэ (дахин нэрлэсэн слотын шинэ нэрийг харуулна).
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
      gridLandPlots: f.gridLandPlots.map((it) => {
        const live = gridLandPlots.find((g) => g.id === it.id);
        return live ? { ...it, code: live.code, floorLevel: live.floorLevel } : it;
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSpotsLoading]);

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
    hasGridParking: client?.has_grid_parking || (!client && initialGridSpot?.kind === 'parking') || false,
    gridParkings: client?.grid_parkings || (!client && initialGridSpot?.kind === 'parking' ? [initialGridSpot.item] : []),
    hasGridStorage: client?.has_grid_storage || (!client && initialGridSpot?.kind === 'storage') || false,
    gridStorages: client?.grid_storages || (!client && initialGridSpot?.kind === 'storage' ? [initialGridSpot.item] : []),
    hasGridLand: client?.has_grid_land || (!client && initialGridSpot?.kind === 'land') || false,
    gridLandPlots: client?.grid_land_plots || (!client && initialGridSpot?.kind === 'land' ? [initialGridSpot.item] : []),
    hasVehicle: client?.has_vehicle || false, vehicles: client?.vehicles || [],
    note: client?.note || '',
  }));

  // 2026-09-04: Хэрэглэгчийн хүсэлт - "Талбай (м2)" талбарыг гараар
  // засварлахгүй, харин Конструктор дээр холбогдсон полигоны бодит
  // хэмжээгээр АВТОМАТААР бүглэнэ (талбай ховор л өөрчлөгддөг тул
  // ЯГ НЭГ л газар - Конструктор дээр - засвар хийгдэж, үлдсэн бүх
  // модаль/хүснэгэл автоматаар шинэчлэгдэнэ - төлбөр тооцоход ч
  // тохиромжтой, зөрчилдөөнгүй болно).
  useEffect(() => {
    setForm((f) => {
      const raw = sumLinkedSqm(f.gridLandPlots, gridLandPlots);
      const next = raw != null ? Number(raw).toFixed(2) : '';
      if (next === f.sqm) return f; // 2026-09-04: үнэн eeрчлөлт байхгүй л бол state-г бариулгүй (setForm/re-render саатуулж, эффектийн давталтаас урьдчилан сэргийлнэ).
      return { ...f, sqm: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridLandPlots, form.gridLandPlots]);


  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  // 2026-09-30: "Хуулийн этгээдийн нэр" талбарт бичиж эхэлмэгц "Талбай
  // өмчлөгч бүртгэл" хүснэгэлээс тохирох нэр (эхний үсгээр таарсан)
  // autocomplete-ээр санал болгоно — VotingEditPage.jsx-ийн нэр
  // дэвшигчийн autocomplete-той ижил зарчим (Rule of two).
  useEffect(() => {
    if (!isGridSpotNewFlow || existingClientId) { setClientSuggestions([]); return; }
    const q = form.legalEntityName.trim();
    if (!q) { setClientSuggestions([]); return; }
    let cancelled = false;
    supabase.from('clientele').select('*').eq('tenant_id', hoaId)
      .ilike('legal_entity_name', `${q}%`).limit(8)
      .then(({ data }) => { if (!cancelled) setClientSuggestions(data || []); });
    return () => { cancelled = true; };
  }, [form.legalEntityName, isGridSpotNewFlow, existingClientId, hoaId]);

  function pickExistingClient(c) {
    setExistingClientId(c.id);
    setClientSuggestions([]);
    setSuggestOpen(false);
    setForm((f) => ({
      ...f,
      legalEntityName: c.legal_entity_name || '',
      regNo: c.reg_no || '',
      propertyNo: c.property_no || '',
      ceoName: c.ceo_first_name_last_name || '',
      mobile: c.mobile || '',
      phone: c.phone || '',
      email: c.email || '',
      contractNo: c.contract_no || '',
      contractStart: c.contract_start || '',
      contractEnd: c.contract_end || '',
      hasGridParking: c.has_grid_parking || f.hasGridParking,
      gridParkings: mergeGridSpotLists(c.grid_parkings, f.gridParkings),
      hasGridStorage: c.has_grid_storage || f.hasGridStorage,
      gridStorages: mergeGridSpotLists(c.grid_storages, f.gridStorages),
      hasGridLand: c.has_grid_land || f.hasGridLand,
      gridLandPlots: mergeGridSpotLists(c.grid_land_plots, f.gridLandPlots),
      hasVehicle: c.has_vehicle || f.hasVehicle,
      vehicles: c.vehicles?.length ? c.vehicles : f.vehicles,
      note: c.note || '',
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Талбай өмчлөгч засах' : 'Талбай өмчлөгч нэмэх'}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
          <button className="ds-btn-primary" onClick={() => onSave?.(form, existingClientId)}>Хадгалах</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="relative">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хуулийн этгээдийн нэр</label>
          <input
            className="ds-input w-full"
            value={form.legalEntityName}
            onChange={(e) => {
              set('legalEntityName', e.target.value);
              if (existingClientId) setExistingClientId(null);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
          />
          {isGridSpotNewFlow && suggestOpen && clientSuggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-sidebg border border-slate-200 dark:border-bordercol rounded-lg shadow-lg p-1">
              {clientSuggestions.map((c) => (
                <button
                  key={c.id} type="button"
                  onMouseDown={() => pickExistingClient(c)}
                  className="block w-full text-left px-2 py-1.5 text-[12px] rounded hover:bg-slate-100 dark:hover:bg-appbg text-slate-900 dark:text-white"
                >
                  {c.legal_entity_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Регистрийн дугаар</label>
          <input className="ds-input w-full" value={form.regNo} onChange={(e) => set('regNo', e.target.value)} />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Талбай (м²) - Конструктороос автоматаар</label>
        <input type="number" step="0.01" readOnly className="ds-input w-full opacity-70 cursor-not-allowed" value={form.sqm} title="Энэ талбарыг зөвхөн Конструктор дээр өөрчилнэ" />
      </div>
      <div className="mb-4">
        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Өмчийн Улсын бүртгэлийн дугаар (ӨУБД Талбай)</label>
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

      {/* 2026-09-02: Хэрэглэгчийн хүсэлт — "Талбай өмчлөгч" (аж ахуйн
          нэгж) л Зогсоол/Агуулах/Талбай (полигон) БҮГДийг "Конструктор
          (React)"-оос сонгож холбож болно (Сууц өмчлөгчид зөвхөн
          Зогсоол/Агуулах-ыг л зөвшөөрнэ). */}
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
      <SpotSelectField
        label="Талбай" checked={form.hasGridLand}
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
