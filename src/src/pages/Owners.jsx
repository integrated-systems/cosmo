import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { formatDoorNo, formatUnitCode } from '../lib/ownersFormat';
import EditOwnerModal from '../components/EditOwnerModal';
import EditOwnerSpotOnlyModal from '../components/EditOwnerSpotOnlyModal';
import OwnersToolbar from '../components/OwnersToolbar';
import OwnersTable from '../components/OwnersTable';
import OwnersSpotOnlyTable from '../components/OwnersSpotOnlyTable';
import OwnerInfoModal from '../components/OwnerInfoModal';
import OwnerSpotOnlyInfoModal from '../components/OwnerSpotOnlyInfoModal';
import TabButton from '../components/TabButton';
import { useConfirm } from '../hooks/useConfirm';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useAccessRules } from '../hooks/useAccessRules';
import { useInvoicePayments } from '../hooks/useInvoicePayments';

// 2026-08-15: Supabase-тай холбогдов — EXAMPLE_OWNERS mock массив
// арилж, "owners" хүснэгэлээс бодитоор унших/бичих боллоо. "Төлөв"
// (өмчлөгч/түрээслэгч) талбарыг хэрэглэгчийн тодорхой заасны дагуу
// БүРЭН устгасан. Хүснэгэл/түүлбэр/Инфо модалийг тусдаа дахин ашиглагдах
// компонент (OwnersTable/OwnersToolbar/OwnerInfoModal) болгож задлав —
// Rule of two, ирээдүйд бусад хүснэгэлт хуудсанд дахин ашиглана.
//
// 2026-09-13: Хэрэглэгчийн заасны дагуу 2 табтай болгов — "Сууц
// өмчлөгч" (тоот, давхар, байртай холбогдсон) БОЛОН "Дан зогсоол,
// агуулах өмчлөгч" (сууцгүй, зөвхөн зогсоол/агуулах эзэмшдэг хүн/
// ААН). owners хүснэгэл ЯГ АДИЛХАН хэвээр үлдэнэ — зөвхөн 2 дахь
// табны мврүүдэд building_no/floor/door_no/sqm/property_no/
// own_date/people_count/child_0_5/child_6_18 NULL байдлаар
// хадгалагдана. Төлбөрийн (invoices) холболтод ч ижил зарчим:
// сууцтай бол unit_layouts.id, сууцгүй бол grid_parkings/
// grid_storages-ийн 1-р задалсан UUID-г тогтвортой нэгж болгож
// ашиглана.
export default function Owners() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { confirm, ConfirmDialog } = useConfirm();
  const { can } = useAccessRules(hoaId);
  const [tab, setTab] = useState('unit');
  const [rows, setRows] = useState([]);
  const [unitLayouts, setUnitLayouts] = useState([]);
  const [search, setSearch] = useState('');
  const [spotSearch, setSpotSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const { getYearSummary, earliestYear } = useInvoicePayments(hoaId, 'owner');
  const yearOptions = Array.from({ length: Math.max(1, now.getFullYear() - earliestYear + 1) }, (_, i) => earliestYear + i);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingSpotOnly, setEditingSpotOnly] = useState(null);
  const [addingSpotOnly, setAddingSpotOnly] = useState(false);
  const [selectedSpotOnly, setSelectedSpotOnly] = useState(null);

  async function loadOwners() {
    setLoading(true);
    setLoadError('');
    const [ownersRes, layoutsRes] = await Promise.all([
      fetchAllRows(() => supabase.from('owners').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false })),
      fetchAllRows(() => supabase.from('unit_layouts').select('*').eq('tenant_id', hoaId)),
    ]);
    if (ownersRes.error) {
      setLoadError(ownersRes.error.message);
    } else {
      setRows(ownersRes.data ?? []);
    }
    setUnitLayouts(layoutsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOwners();
  }, [hoaId]);

  const buildingOptions = [...new Set(unitLayouts.map((u) => u.building_no?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // 2026-09-13: Тоотод холбогдсон (building_no бий) мвр "Сууц
  // өмчлөгч" табд, холбогдоогүй (building_no хоосон) мвр "Дан
  // зогсоол, агуулах өмчлөгч" табд орно.
  const unitOwnerRows = rows.filter((r) => !!r.building_no);
  const spotOnlyOwnerRows = rows.filter((r) => !r.building_no);

  const q = search.trim().toLowerCase();
  const filteredRows = unitOwnerRows.filter((r) => {
    if (buildingFilter && r.building_no?.trim() !== buildingFilter) return false;
    if (!q) return true;
    const doorNo = formatDoorNo(r.door_no).toLowerCase();
    const unitCode = formatUnitCode(r.building_no, null, r.floor, null, r.door_no).toLowerCase();
    const fullname = `${r.firstname || ''} ${r.lastname || ''}`.toLowerCase();
    const phones = (r.phones || []).join(' ').toLowerCase();
    const emails = (r.emails || []).join(' ').toLowerCase();
    return unitCode.includes(q) || unitCode.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      || doorNo.includes(q) || fullname.includes(q) || phones.includes(q) || emails.includes(q);
  });

  const spotQ = spotSearch.trim().toLowerCase();
  const filteredSpotOnlyRows = spotOnlyOwnerRows.filter((r) => {
    if (!spotQ) return true;
    const fullname = `${r.firstname || ''} ${r.lastname || ''}`.toLowerCase();
    const phones = (r.phones || []).join(' ').toLowerCase();
    const emails = (r.emails || []).join(' ').toLowerCase();
    const regno = (r.regno || '').toLowerCase();
    return fullname.includes(spotQ) || phones.includes(spotQ) || emails.includes(spotQ) || regno.includes(spotQ);
  });

  async function handleSave(form) {
    const payload = {
      tenant_id: hoaId,
      building_no: form.buildingNo || null,
      floor: form.floor !== '' ? Number(form.floor) : null,
      door_no: form.doorNo !== '' ? Number(form.doorNo) : null,
      sqm: form.sqm !== '' ? Number(form.sqm) : null,
      firstname: form.firstname || null,
      lastname: form.lastname || null,
      regno: form.regno || null,
      own_date: form.ownDate || null,
      property_no: form.propertyNo || null,
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

    if (editing) {
      const { data, error } = await supabase.from('owners').update(payload).eq('id', editing.id).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? data : r)));
    } else {
      const { data, error } = await supabase.from('owners').insert(payload).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => [data, ...prev]);
    }
    setEditing(null);
    setAdding(false);
  }

  // 2026-09-13: "Зогсоол, агуулах дангаар өмчлөгч" табны хадгалалт —
  // building_no/floor/door_no/sqm/property_no/own_date/
  // people_count/child_0_5/child_6_18 БүГДИЙГ NULL/0 болгож,
  // зөвхөн зогсоол/агуулах/машин/хувийн мэдээллийг л хадгална.
  async function handleSaveSpotOnly(form) {
    const payload = {
      tenant_id: hoaId,
      building_no: null,
      floor: null,
      door_no: null,
      sqm: null,
      firstname: form.firstname || null,
      lastname: form.lastname || null,
      regno: form.regno || null,
      own_date: null,
      property_no: null,
      child_0_5: 0,
      child_6_18: 0,
      has_grid_parking: form.hasGridParking,
      grid_parkings: form.gridParkings,
      has_grid_storage: form.hasGridStorage,
      grid_storages: form.gridStorages,
      has_vehicle: form.hasVehicle,
      vehicles: form.vehicles,
      note: form.note || null,
    };

    if (editingSpotOnly) {
      const { data, error } = await supabase.from('owners').update(payload).eq('id', editingSpotOnly.id).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => prev.map((r) => (r.id === editingSpotOnly.id ? data : r)));
    } else {
      const { data, error } = await supabase.from('owners').insert(payload).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => [data, ...prev]);
    }
    setEditingSpotOnly(null);
    setAddingSpotOnly(false);
  }

  async function handleDelete(row) {
    if (!(await confirm(`${row.firstname} ${row.lastname}-г устгах уу?`))) return;
    const { error } = await supabase.from('owners').delete().eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <>
      {tab === 'unit' ? (
        <OwnersToolbar
          search={search} onSearchChange={setSearch} onAddClick={() => setAdding(true)}
          buildingOptions={buildingOptions} buildingFilter={buildingFilter} onBuildingFilterChange={setBuildingFilter}
          year={year} yearOptions={yearOptions} onYearChange={setYear}
          canAdd={can('owners', 'add')}
        />
      ) : (
        <OwnersToolbar
          search={spotSearch} onSearchChange={setSpotSearch} onAddClick={() => setAddingSpotOnly(true)}
          year={year} yearOptions={yearOptions} onYearChange={setYear}
          showBuildingFilter={false}
          addLabel="+ Зогсоол, агуулах дангаар өмчлөгч нэмэх"
          searchPlaceholder="Хайх (нэр, регистр, утас, имэйл)..."
          canAdd={can('owners', 'add')}
        />
      )}

      <div className="flex gap-2">
        <TabButton active={tab === 'unit'} onClick={() => setTab('unit')}>Сууц өмчлөгч</TabButton>
        <TabButton active={tab === 'spot_only'} onClick={() => setTab('spot_only')}>Зогсоол, агуулах дангаар өмчлөгч</TabButton>
      </div>

      {tab === 'unit' ? (
        <OwnersTable
          rows={filteredRows}
          unitLayouts={unitLayouts}
          loading={loading}
          loadError={loadError}
          onRowClick={setSelected}
          onEdit={setEditing}
          onDelete={handleDelete}
          canEdit={can('owners', 'edit')}
          canDelete={can('owners', 'delete')}
          hoaId={hoaId}
          year={year}
          getYearSummary={getYearSummary}
        />
      ) : (
        <OwnersSpotOnlyTable
          rows={filteredSpotOnlyRows}
          loading={loading}
          loadError={loadError}
          onRowClick={setSelectedSpotOnly}
          onEdit={setEditingSpotOnly}
          onDelete={handleDelete}
          canEdit={can('owners', 'edit')}
          canDelete={can('owners', 'delete')}
          hoaId={hoaId}
          year={year}
          getYearSummary={getYearSummary}
        />
      )}

      <OwnerInfoModal
        owner={selected}
        unitLayouts={unitLayouts}
        onClose={() => setSelected(null)}
        onEdit={(owner) => { setEditing(owner); setSelected(null); }}
      />

      <OwnerSpotOnlyInfoModal
        owner={selectedSpotOnly}
        onClose={() => setSelectedSpotOnly(null)}
        onEdit={(owner) => { setEditingSpotOnly(owner); setSelectedSpotOnly(null); }}
      />

      <EditOwnerModal
        key={editing?.id}
        open={!!editing}
        onClose={() => setEditing(null)}
        owner={editing}
        onSave={handleSave}
        hoaId={hoaId}
      />

      <EditOwnerModal
        open={adding}
        onClose={() => setAdding(false)}
        owner={null}
        onSave={handleSave}
        hoaId={hoaId}
      />

      <EditOwnerSpotOnlyModal
        key={`spot-${editingSpotOnly?.id}`}
        open={!!editingSpotOnly}
        onClose={() => setEditingSpotOnly(null)}
        owner={editingSpotOnly}
        onSave={handleSaveSpotOnly}
        hoaId={hoaId}
      />

      <EditOwnerSpotOnlyModal
        open={addingSpotOnly}
        onClose={() => setAddingSpotOnly(false)}
        owner={null}
        onSave={handleSaveSpotOnly}
        hoaId={hoaId}
      />

      <ConfirmDialog />
    </>
  );
}
