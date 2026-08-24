import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import ProvidersToolbar from '../components/ProvidersToolbar';
import ProvidersTable from '../components/ProvidersTable';
import EditProviderModal from '../components/EditProviderModal';
import { useConfirm } from '../hooks/useConfirm';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useAccessRules } from '../hooks/useAccessRules';

// "Харилцагчийн бүртгэл" (/providers, "Дотоод үйл ажиллагаа" бүлэг) —
// Clientele.jsx-ийн бүтэц/компонент задаргааны загварыг яг дахин
// ашигласан (Rule of two). Supabase "providers" хүснэгэлээс tenant_id-
// аар шүүж унших/бичих/устгах. 2026-08-19 хэрэглэгч тодорхой заасны
// дагуу: зввхүн үйлчилгээ үзүүлэгч (provider) байгууллагын бүртгэл,
// Owners/Clientele-тэй одоогоор ХОЛБООГүй.
export default function Providers() {
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

  async function loadProviders() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await fetchAllRows(() =>
      supabase.from('providers').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false })
    );
    if (error) {
      setLoadError(error.message);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProviders();
  }, [hoaId]);

  const q = search.trim().toLowerCase();
  const filteredRows = !q ? rows : rows.filter((r) => {
    const name = (r.legal_entity_name || '').toLowerCase();
    const mobile = (r.mobile || '').toLowerCase();
    const phone = (r.phone || '').toLowerCase();
    const email = (r.email || '').toLowerCase();
    return name.includes(q) || mobile.includes(q) || phone.includes(q) || email.includes(q);
  });

  async function handleSave(form) {
    const payload = {
      tenant_id: hoaId,
      legal_entity_name: form.legalEntityName || null,
      certificate_no: form.certificateNo || null,
      ceo_name: form.ceoName || null,
      mobile: form.mobile || null,
      phone: form.phone || null,
      email: form.email || null,
      contract_no: form.contractNo || null,
      contract_start: form.contractStart || null,
      contract_end: form.contractEnd || null,
      bank_name: form.bankName || null,
      bank_iban: form.bankIban || null,
      bank_account: form.bankAccount || null,
      note: form.note || null,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { data, error } = await supabase.from('providers').update(payload).eq('id', editing.id).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? data : r)));
    } else {
      const { data, error } = await supabase.from('providers').insert(payload).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => [data, ...prev]);
    }
    setEditing(null);
    setAdding(false);
  }

  async function handleDelete(row) {
    if (!(await confirm(`"${row.legal_entity_name}"-г устгах уу?`))) return;
    const { error } = await supabase.from('providers').delete().eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <>
      <ProvidersToolbar search={search} onSearchChange={setSearch} onAddClick={() => setAdding(true)} canAdd={can('providers', 'add')} />

      <ProvidersTable
        rows={filteredRows}
        loading={loading}
        loadError={loadError}
        onRowClick={setEditing}
        onEdit={setEditing}
        onDelete={handleDelete}
        canEdit={can('providers', 'edit')}
        canDelete={can('providers', 'delete')}
      />

      <EditProviderModal
        key={editing?.id}
        open={!!editing}
        onClose={() => setEditing(null)}
        provider={editing}
        onSave={handleSave}
      />

      <EditProviderModal
        open={adding}
        onClose={() => setAdding(false)}
        provider={null}
        onSave={handleSave}
      />

      <ConfirmDialog />
    </>
  );
}
