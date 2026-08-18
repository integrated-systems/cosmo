import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { formatDoorNo } from '../lib/ownersFormat';
import EditOwnerModal from '../components/EditOwnerModal';
import OwnersToolbar from '../components/OwnersToolbar';
import OwnersTable from '../components/OwnersTable';
import OwnerInfoModal from '../components/OwnerInfoModal';
import { useConfirm } from '../hooks/useConfirm';

// 2026-08-15: Supabase-тай холбогдов — EXAMPLE_OWNERS mock массив
// арилж, "owners" хүснэгэлээс бодитоор унших/бичих боллоо. "Төлөв"
// (өмчлөгч/түрээслэгч) талбарыг хэрэглэгчийн тодорхой заасны дагуу
// БҮРЭН устгасан. Хүснэгэл/түүлбэр/Инфо модалийг тусдаа дахин ашиглагдах
// компонент (OwnersTable/OwnersToolbar/OwnerInfoModal) болгож задлав —
// Rule of two, ирээдүйд бусад хүснэгэлт хуудсанд дахин ашиглана.
export default function Owners() {
  // Sidebar-ийн HoaSwitcher-ээр сонгосон СӨХ (:hoaId) — Dashboard/бусад
  // хуудастай ижил урсгал. DEFAULT_TENANT_ID нь зөвхөн :hoaId алга байх
  // (боломжгүй ч гэсэн) нөхцөлд зориулсан нөөц утга.
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { confirm, ConfirmDialog } = useConfirm();
  const [rows, setRows] = useState([]);
  const [unitLayouts, setUnitLayouts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  async function loadOwners() {
    setLoading(true);
    setLoadError('');
    const [ownersRes, layoutsRes] = await Promise.all([
      supabase.from('owners').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false }),
      supabase.from('unit_layouts').select('*').eq('tenant_id', hoaId),
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

  // Хайлтын талбар: тоот, нэр (нэр+овог), утас, имэйл-ээр НЭГЭН ЗЭРЭГ хайна
  const q = search.trim().toLowerCase();
  const filteredRows = !q ? rows : rows.filter((r) => {
    const doorNo = formatDoorNo(r.door_no).toLowerCase();
    const fullname = `${r.firstname || ''} ${r.lastname || ''}`.toLowerCase();
    const phones = (r.phones || []).join(' ').toLowerCase();
    const emails = (r.emails || []).join(' ').toLowerCase();
    return doorNo.includes(q) || fullname.includes(q) || phones.includes(q) || emails.includes(q);
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
      phones: form.phones.filter(Boolean),
      emails: form.emails.filter(Boolean),
      people_count: form.people !== '' ? Number(form.people) : null,
      child_0_5: form.child1 !== '' ? Number(form.child1) : 0,
      child_6_18: form.child2 !== '' ? Number(form.child2) : 0,
      has_storage: form.hasStorage,
      storages: form.storages,
      has_parking: form.hasParking,
      parkings: form.parkings,
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

  async function handleDelete(row) {
    if (!(await confirm(`${row.firstname} ${row.lastname}-г устгах уу?`))) return;
    const { error } = await supabase.from('owners').delete().eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <>
      <OwnersToolbar search={search} onSearchChange={setSearch} onAddClick={() => setAdding(true)} />

      <OwnersTable
        rows={filteredRows}
        unitLayouts={unitLayouts}
        loading={loading}
        loadError={loadError}
        onRowClick={setSelected}
        onEdit={setEditing}
        onDelete={handleDelete}
      />

      <OwnerInfoModal
        owner={selected}
        onClose={() => setSelected(null)}
        onEdit={(owner) => { setEditing(owner); setSelected(null); }}
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

      <ConfirmDialog />
    </>
  );
}
