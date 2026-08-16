import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PLANS } from '../data/plans';
import { EditIcon, DeleteIcon } from '../components/icons/Icons';
import EditTenantModal from '../components/EditTenantModal';
import { useConfirm } from '../hooks/useConfirm';

// SUPERSYSADMIN-ийн "Tenant Status" хуудас — Төлбөрийн 3-р алхмын
// "Гараар (invoice)" горим: бодит төлбөрийн шлюз (QPay/SocialPay г.м)
// хараахан холбогдоогүй тул SUPERSYSADMIN энд СӨХ бүрийн статусыг
// (trial→active г.м) гараар өөрчилдөг. `tenants.status`+RLS UPDATE/DELETE
// policy (0005/0006 migration) дээр суурилна.
//
// 2026-08-16: "Үйлдэл" багана (Засах/Устгах) нэмэв — тухайн СӨХ-ийн админ
// ажлаа өгөх/солигдоход шаардлагатай. "Админы нэвтрэх" багана RPC
// (`get_tenant_admin_emails`)-ээр ЗӨВХӨН имэйл харуулна — нууц үг ХЭЗЭЭ Ч
// харуулахгүй (Supabase bcrypt hash-аар хадгалдаг, эргэж унших боломжгүй).
const STATUS_OPTIONS = [
  { key: 'trial', label: 'Туршилт (trial)' },
  { key: 'active', label: 'Идэвхтэй' },
  { key: 'suspended', label: 'Түдгэлзүүлсэн' },
  { key: 'cancelled', label: 'Цуцалсан' },
];

const STATUS_COLOR = {
  trial: 'bg-blue-500/[0.18] text-customBlue border-blue-500/30',
  active: 'bg-green-500/[0.18] text-customGreen border-green-500/30',
  suspended: 'bg-orange-500/[0.18] text-customOrange border-orange-500/30',
  cancelled: 'bg-red-500/[0.18] text-customRed border-red-500/30',
};

function planLabel(planKey) {
  return PLANS.find((p) => p.key === planKey)?.name || planKey || '—';
}

export default function TenantStatus() {
  const [rows, setRows] = useState([]);
  const [adminEmails, setAdminEmails] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  async function loadTenants() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }
    setRows(data ?? []);

    const { data: adminData, error: adminError } = await supabase.rpc('get_tenant_admin_emails');
    if (!adminError) {
      const map = {};
      (adminData ?? []).forEach((r) => { map[r.tenant_id] = r.admin_email; });
      setAdminEmails(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTenants();
  }, []);

  async function handleStatusChange(tenantId, newStatus) {
    setSavingId(tenantId);
    const { data, error } = await supabase
      .from('tenants')
      .update({ status: newStatus })
      .eq('id', tenantId)
      .select()
      .single();
    setSavingId(null);
    if (error) {
      window.alert(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === tenantId ? data : r)));
  }

  async function handleEditSave(tenantId, payload) {
    const { data, error } = await supabase
      .from('tenants')
      .update(payload)
      .eq('id', tenantId)
      .select()
      .single();
    if (error) {
      window.alert(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === tenantId ? data : r)));
    setEditing(null);
  }

  async function handleDelete(row) {
    if (!(await confirm(`"${row.name}" СӨХ-ыг бүрмөсүн устгах уу? Энэ үйлдлийг буцаах боломжгүй (өмчлөгч/зах зээлийн дата хамт устана).`))) return;
    const { error } = await supabase.from('tenants').delete().eq('id', row.id);
    if (error) {
      window.alert(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3">СӨХ-НЫ НЭР</th>
              <th className="py-2.5 px-3">РЕГИСТР</th>
              <th className="py-2.5 px-3">ИМЭЙЛ</th>
              <th className="py-2.5 px-3">УТАС</th>
              <th className="py-2.5 px-3">БАГЦ</th>
              <th className="py-2.5 px-3">АДМИНЫ НЭВТРЭХ</th>
              <th className="py-2.5 px-3">СТАТУС</th>
              <th className="py-2.5 px-3 w-[160px]">ӨӨРЧЛӨХ</th>
              <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading && (
              <tr><td colSpan={9} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
            )}
            {!loading && loadError && (
              <tr><td colSpan={9} className="py-8 text-center text-customRed">{loadError}</td></tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
            )}
            {!loading && !loadError && rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                <td className="py-2.5 px-3">{r.registration_no || '—'}</td>
                <td className="py-2.5 px-3">{r.email || '—'}</td>
                <td className="py-2.5 px-3">{r.phone || '—'}</td>
                <td className="py-2.5 px-3">{planLabel(r.plan_key)}</td>
                <td className="py-2.5 px-3">{adminEmails[r.id] || '—'}</td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_COLOR[r.status] || ''}`}>
                    {STATUS_OPTIONS.find((s) => s.key === r.status)?.label || r.status}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <select
                    className="ds-select w-full"
                    value={r.status}
                    disabled={savingId === r.id}
                    onChange={(e) => handleStatusChange(r.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button className="ds-icon-btn" title="Засах" onClick={() => setEditing(r)}>
                    <EditIcon />
                  </button>
                  <button className="ds-icon-btn danger" title="Устгах" onClick={() => handleDelete(r)}>
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditTenantModal
        tenant={editing}
        adminEmail={editing ? adminEmails[editing.id] : ''}
        onClose={() => setEditing(null)}
        onSave={handleEditSave}
        onAdminChanged={loadTenants}
      />

      <ConfirmDialog />
    </div>
  );
}
