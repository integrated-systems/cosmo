import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import PropertyToolbar from '../components/PropertyToolbar';
import TabButton from '../components/TabButton';
import UnitGridCard from '../components/UnitGridCard';
import OwnerInfoModal from '../components/OwnerInfoModal';
import EditOwnerModal from '../components/EditOwnerModal';
import ClientInfoModal from '../components/ClientInfoModal';
import EditClientModal from '../components/EditClientModal';
import GridSpotsViewer from '../components/GridSpotsViewer';
import { useAlert } from '../hooks/useAlert';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatUnitCode } from '../lib/ownersFormat';

// "Тоот, Зогсоол, Агуулах" (/property) хуудас — Тоот таб: менежерийн
// зорилготой визуал grid (төлбөрийн үлдэгдэлтэй эсэхээр өнгө хувирна,
// өмчлөгчгүй нүүд саарал өнгөтэй). 2026-08-17 (2-р засвар): Тоот таб
// өмнө БУРУУ зөвхөн `owners`-оос л уншиж байсныг олж, `unit_layouts`
// (AddressConfig.jsx-д зохион байгуулсан) ЭХ СУРВАЛЖ болгож зассан.
// Зогсоол/Агуулах таб: Owners.jsx-ийн .ds-table загварыг дахин ашигласан
// хүснэгэл — Owners БОЛОН Clientele (ААН) хоёулангийн зогсоол/агуулахыг
// НИЙЛГЭЖ харуулна.
//
// 2026-08-17 (3-р засвар): өмчлөгчгүй тоот дарахад өмнө "бүртгэлгүй"
// гэсэн window.alert харуулдаг байснийг арилгаж, орондоо "Сууц өмчлөгч
// нэмэх" модалийг ШУУД (тоот/байр урьдчилан бүглэгдсэн байдлаар) нээдэг
// болгов — менежер хуудас солилгүйгээр өмчлөгч нэмэх боломжтой.
const TABS = [
  { key: 'household', label: 'Тоот' },
  { key: 'gridSpots', label: 'Зогсоол, Агуулах, Талбай' },
];

export default function Property() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { alert, AlertDialog } = useAlert();
  const [tab, setTab] = useState('household');
  const [search, setSearch] = useState('');
  const [owners, setOwners] = useState([]);
  const [clientele, setClientele] = useState([]);
  const [unitLayouts, setUnitLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [editingOwner, setEditingOwner] = useState(null);
  const [addingUnit, setAddingUnit] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  // 2026-09-02: "Зогсоол, Агуулах, Талбай" таб — грид дээрх слот/
  // агуулах/талбай дээр дарахад ашиглана. Эзэмшигчгүй слот дээр
  // дарвал "Сууц өмчлөгч vv, Талбай өмчлөгч vv?" сонголт харуулна
  // (полигон бол зөвхөн Талбай өмчлөгч л үзэмшдэг тул шууд нээнэ).
  const [addingGridSpot, setAddingGridSpot] = useState(null); // {kind, item}
  const [gridSpotChoice, setGridSpotChoice] = useState(null); // {kind, item} - сонголт хүлээж буй

  function resolveGridLink(floorKey, label, field) {
    const gid = `${floorKey}:${label}`;
    const o = owners.find((ow) => (ow[field] || []).some((sp) => sp.id === gid));
    if (o) return { type: 'owner', record: o };
    const c = clientele.find((cl) => (cl[field] || []).some((sp) => sp.id === gid));
    if (c) return { type: 'client', record: c };
    return null;
  }
  function resolveSlot(floorKey, label, kind) {
    return resolveGridLink(floorKey, label, kind === 'warehouse' ? 'grid_storages' : 'grid_parkings');
  }
  function resolvePolygon(floorKey, label) {
    return resolveGridLink(floorKey, label, 'grid_land_plots');
  }
  function handleGridSlotClick(floorKey, slot, link) {
    if (link?.type === 'owner') { setSelectedOwner(link.record); return; }
    if (link?.type === 'client') { setSelectedClient(link.record); return; }
    if (!slot.label) return; // label-гүй слотыг холбож болохгүй
    const item = { id: `${floorKey}:${slot.label}`, floorLevel: floorKey, code: slot.label };
    setGridSpotChoice({ kind: slot.kind === 'warehouse' ? 'storage' : 'parking', item });
  }
  function handleGridPolygonClick(floorKey, polygon, link) {
    if (link?.type === 'client') { setSelectedClient(link.record); return; }
    if (link?.type === 'owner') { setSelectedOwner(link.record); return; } // онолын хувьд гарахгүй ч, аюулгүйн үүднээс
    if (!polygon.label) return;
    const item = { id: `${floorKey}:${polygon.label}`, floorLevel: floorKey, code: polygon.label };
    setAddingGridSpot({ kind: 'land', item }); // Талбай зөвхөн Талбай өмчлөгчид харьяалагдана тул шууд нээнэ
  }

  async function loadAll() {
    setLoading(true);
    const [ownersRes, clienteleRes, layoutsRes] = await Promise.all([
      fetchAllRows(() => supabase.from('owners').select('*').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('clientele').select('*').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('unit_layouts').select('*').eq('tenant_id', hoaId).eq('hidden', false).order('building_no').order('floor').order('position')),
    ]);
    setOwners(ownersRes.data ?? []);
    setClientele(clienteleRes.data ?? []);
    setUnitLayouts(layoutsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [hoaId]);

  function ownerPayload(form) {
    return {
      building_no: form.buildingNo || null,
      floor: form.floor !== '' ? Number(form.floor) : null,
      door_no: form.doorNo !== '' ? Number(form.doorNo) : null,
      sqm: form.sqm !== '' ? Number(form.sqm) : null,
      firstname: form.firstname || null,
      lastname: form.lastname || null,
      regno: form.regno || null,
      own_date: form.ownDate || null,
      property_no: form.propertyNo || null,
      phones: form.phones.filter(Boolean),
      emails: form.emails.filter(Boolean),
      people_count: form.people !== '' ? Number(form.people) : null,
      child_0_5: form.child1 !== '' ? Number(form.child1) : 0,
      child_6_18: form.child2 !== '' ? Number(form.child2) : 0,
      has_grid_parking: form.hasGridParking,
      grid_parkings: form.gridParkings,
      has_grid_storage: form.hasGridStorage,
      grid_storages: form.gridStorages,
      has_vehicle: form.hasVehicle,
      vehicles: form.vehicles,
      note: form.note || null,
    };
  }

  async function handleSaveOwner(form) {
    if (editingOwner) {
      const { error } = await supabase.from('owners').update(ownerPayload(form)).eq('id', editingOwner.id);
      if (error) { alert(error.message); return; }
      setEditingOwner(null);
    } else if (addingUnit) {
      const { error } = await supabase.from('owners').insert({ tenant_id: hoaId, ...ownerPayload(form) });
      if (error) { alert(error.message); return; }
      setAddingUnit(null);
    } else if (addingGridSpot) {
      // 2026-09-02: "Зогсоол, Агуулах, Талбай" табаас эзэмшигчгүй
      // слот дээр дарж шинэ Сууц өмчлөгч үүсгэх үед байр/тоот сонгоогүй
      // байх тул unit_layouts-ийн эхний тоотыг л анхдагчаар авна
      // (EditOwnerModal-ийн form.buildingNo/floor/doorNo талбар).
      const { error } = await supabase.from('owners').insert({ tenant_id: hoaId, ...ownerPayload(form) });
      if (error) { alert(error.message); return; }
      setAddingGridSpot(null);
    }
    setSelectedOwner(null);
    await loadAll();
  }

  async function handleSaveClient(form) {
    const payload = {
      legal_entity_name: form.legalEntityName || null,
      reg_no: form.regNo || null,
      sqm: form.sqm !== '' ? Number(form.sqm) : null,
      property_no: form.propertyNo || null,
      ceo_first_name_last_name: form.ceoName || null,
      mobile: form.mobile || null,
      phone: form.phone || null,
      email: form.email || null,
      contract_no: form.contractNo || null,
      contract_start: form.contractStart || null,
      contract_end: form.contractEnd || null,
      has_grid_parking: form.hasGridParking,
      grid_parkings: form.gridParkings,
      has_grid_storage: form.hasGridStorage,
      grid_storages: form.gridStorages,
      has_grid_land: form.hasGridLand,
      grid_land_plots: form.gridLandPlots,
      has_vehicle: form.hasVehicle,
      vehicles: form.vehicles,
      note: form.note || null,
    };
    if (editingClient) {
      const { error } = await supabase.from('clientele').update(payload).eq('id', editingClient.id);
      if (error) { alert(error.message); return; }
      setEditingClient(null);
    } else if (addingGridSpot) {
      // 2026-09-02: "Зогсоол, Агуулах, Талбай" табаас шинэ Талбай
      // өмчлөгч үүсгэх үед (полигон эсвэл сонголтоор "Талбай өмчлөгч").
      const { error } = await supabase.from('clientele').insert({ tenant_id: hoaId, ...payload });
      if (error) { alert(error.message); return; }
      setAddingGridSpot(null);
    } else {
      return;
    }
    setSelectedClient(null);
    await loadAll();
  }

  const q = search.trim().toLowerCase();

  // Тоот таб — AddressConfig.jsx-д зохион байгуулсан `unit_layouts`-ыг
  // ЭХ СУРВАЛЖ болгоно. Тоот бүрд тохирох өмчлөгчийг байр/давхар/тоотоор
  // хайж олно — байвал OwnerInfoModal, үгүй бол "Сууц өмчлөгч нэмэх"
  // модалийг тэр тоот/байраар нь урьдчилан бүглэж шууд нээнэ.
  const householdCells = unitLayouts.map((row, idx) => {
    const owner = owners.find(
      (o) => o.building_no === row.building_no && o.floor === row.floor && o.door_no === row.door_no
    );
    return {
      id: row.id,
      buildingNo: row.building_no,
      floor: row.floor,
      doorNo: row.door_no,
      position: row.position,
      code: formatUnitCode(row.building_no, row.structure_type, row.floor, row.entrance_no, row.door_no),
      area: row.sqm,
      exampleIdx: idx,
      vacant: !owner,
      onClick: () => {
        if (owner) setSelectedOwner(owner);
        else setAddingUnit({ buildingNo: row.building_no, floor: row.floor, doorNo: row.door_no, sqm: row.sqm });
      },
    };
  }).filter((c) => !q || c.code.toLowerCase().includes(q));


  return (
    <>
      <PropertyToolbar search={search} onSearchChange={setSearch} />

      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {loading ? (
        <div className="ds-card p-8 text-center text-darktext text-sm">Ачаалж байна...</div>
      ) : (
        <>
          {tab === 'household' && (
            <UnitGridCard cells={householdCells} hint="Байр сонгоод тоот дээр дарж дэлгэрэнгүй харах" />
          )}
          {tab === 'gridSpots' && (
            <GridSpotsViewer
              hoaId={hoaId}
              resolveSlot={resolveSlot}
              resolvePolygon={resolvePolygon}
              onSlotClick={handleGridSlotClick}
              onPolygonClick={handleGridPolygonClick}
            />
          )}
        </>
      )}

      <OwnerInfoModal
        owner={selectedOwner}
        unitLayouts={unitLayouts}
        onClose={() => setSelectedOwner(null)}
        onEdit={(owner) => { setEditingOwner(owner); setSelectedOwner(null); }}
      />
      <EditOwnerModal
        key={editingOwner?.id}
        open={!!editingOwner}
        onClose={() => setEditingOwner(null)}
        owner={editingOwner}
        onSave={handleSaveOwner}
        hoaId={hoaId}
      />

      {/* Өмчлөгчгүй тоот дарахад ШУУД нээгдэх "Сууц өмчлөгч нэмэх" —
          тухайн тоотын байр/давхар/дугаар/м² урьдчилан бүглэгдсэн байна. */}
      <EditOwnerModal
        key={addingUnit ? `${addingUnit.buildingNo}-${addingUnit.floor}-${addingUnit.doorNo}` : 'add'}
        open={!!addingUnit}
        onClose={() => setAddingUnit(null)}
        owner={null}
        initialUnit={addingUnit}
        onSave={handleSaveOwner}
        hoaId={hoaId}
      />

      <ClientInfoModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onEdit={(client) => { setEditingClient(client); setSelectedClient(null); }}
      />
      <EditClientModal
        key={editingClient?.id}
        open={!!editingClient}
        onClose={() => setEditingClient(null)}
        client={editingClient}
        onSave={handleSaveClient}
        hoaId={hoaId}
      />

      {/* 2026-09-02: Эзэмшигчгүй грид слот дээр дарахад "Сууц өмчлөгч
          vv, Талбай өмчлөгч vv?" гэж сонгуулна (полигон бол шууд
          Талбай өмчлөгч тул сонголт үзүүлэхгүй). */}
      {gridSpotChoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,9,15,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250 }} onClick={() => setGridSpotChoice(null)}>
          <div className="ds-card p-4" style={{ width: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-1">{gridSpotChoice.item.code}</div>
            <div className="text-[11px] text-mutedtext mb-3">Энэ слотыг хэнд бүртгэх вэ?</div>
            <div className="flex flex-col gap-2">
              <button className="ds-btn-primary" onClick={() => { setAddingGridSpot({ ...gridSpotChoice, target: 'owner' }); setGridSpotChoice(null); }}>Сууц өмчлөгч нэмэх</button>
              <button className="ds-btn-secondary" onClick={() => { setAddingGridSpot({ ...gridSpotChoice, target: 'client' }); setGridSpotChoice(null); }}>Талбай өмчлөгч нэмэх</button>
            </div>
          </div>
        </div>
      )}
      <EditOwnerModal
        key={addingGridSpot?.target === 'owner' ? `grid-${addingGridSpot.item.id}` : 'grid-owner-add'}
        open={!!addingGridSpot && addingGridSpot.target !== 'client'}
        onClose={() => setAddingGridSpot(null)}
        owner={null}
        initialGridSpot={addingGridSpot?.target !== 'client' ? addingGridSpot : null}
        onSave={handleSaveOwner}
        hoaId={hoaId}
      />
      <EditClientModal
        key={addingGridSpot?.target === 'client' || addingGridSpot?.kind === 'land' ? `grid-${addingGridSpot.item.id}` : 'grid-client-add'}
        open={!!addingGridSpot && (addingGridSpot.target === 'client' || addingGridSpot.kind === 'land')}
        onClose={() => setAddingGridSpot(null)}
        client={null}
        initialGridSpot={addingGridSpot?.target === 'client' || addingGridSpot?.kind === 'land' ? addingGridSpot : null}
        onSave={handleSaveClient}
        hoaId={hoaId}
      />

      <AlertDialog />
    </>
  );
}
