import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import ClienteleToolbar from '../components/ClienteleToolbar';
import ClienteleTable from '../components/ClienteleTable';
import ClientInfoModal from '../components/ClientInfoModal';
import EditClientModal from '../components/EditClientModal';
import { useConfirm } from '../hooks/useConfirm';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useAccessRules } from '../hooks/useAccessRules';

// "Талбай өмчлөгч бүртгэл" (/clientele) хуудас — Owners.jsx-ийн бүтэц/
// компонент задаргааны загварыг яг дахин ашигласан (Rule of two). Supabase
// "clientele" хүснэгэлээс tenant_id-аар шүүж унших/бичих/устгах.
export default function Clientele() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { can } = useAccessRules(hoaId);
  const { confirm, ConfirmDialog } = useConfirm();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  async function loadClientele() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await fetchAllRows(() =>
      supabase.from('clientele').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false })
    );
    if (error) {
      setLoadError(error.message);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadClientele();
  }, [hoaId]);

  const q = search.trim().toLowerCase();
  const filteredRows = !q ? rows : rows.filter((r) => {
    const name = (r.legal_entity_name || '').toLowerCase();
    const reg = (r.reg_no || '').toLowerCase();
    const mobile = (r.mobile || '').toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    const email = (r.email || '').toLowerCase();
    return name.includes(q) || reg.includes(q) || mobile.includes(q) || phone.includes(q) || email.includes(q);
  });

  async function handleSave(form) {
    const payload = {
      tenant_id: hoaId,
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
      has_parking: form.hasParking,
      parkings: form.parkings,
      has_storage: form.hasStorage,
      storages: form.storages,
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

    if (editing) {
      const { data, error } = await supabase.from('clientele').update(payload).eq('id', editing.id).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? data : r)));
    } else {
      const { data, error } = await supabase.from('clientele').insert(payload).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => [data, ...prev]);
    }
    setEditing(null);
    setAdding(false);
  }

  async function handleDelete(row) {
    if (!(await confirm(`"${row.legal_entity_name}"-г устгах уу?`))) return;
    const { error } = await supabase.from('clientele').delete().eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <>
      <ClienteleToolbar search={search} onSearchChange={setSearch} onAddClick={() => setAdding(true)} canAdd={can('clientele', 'add')} />

      <ClienteleTable
        rows={filteredRows}
        loading={loading}
        loadError={loadError}
        onRowClick={setSelected}
        onEdit={setEditing}
        onDelete={handleDelete}
        canEdit={can('clientele', 'edit')}
        canDelete={can('clientele', 'delete')}
      />

      <ClientInfoModal
        client={selected}
        onClose={() => setSelected(null)}
        onEdit={(c) => { setEditing(c); setSelected(null); }}
      />

      <EditClientModal
        key={editing?.id}
        open={!!editing}
        onClose={() => setEditing(null)}
        client={editing}
        onSave={handleSave}
        hoaId={hoaId}
      />

      <EditClientModal
        open={adding}
        onClose={() => setAdding(false)}
        client={null}
        onSave={handleSave}
        hoaId={hoaId}
      />

      <ConfirmDialog />
    </>
  );
}
