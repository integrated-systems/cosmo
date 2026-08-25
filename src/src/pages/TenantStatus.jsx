import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PLANS } from '../data/plans';
import { EditIcon, DeleteIcon } from '../components/icons/Icons';
import EditTenantModal from '../components/EditTenantModal';
import { useConfirm } from '../hooks/useConfirm';

// SUPERSYSADMIN-ийн "Tenant Status" хуудас — Төлбөрийн 3-р алхмын
// "Гараар (invoice)" горим: бодит твлбврийн шлюз (QPay/SocialPay г.м)
// хараахан холбогдоогүй тул SUPERSYSADMIN энд СӨХ бүрийн статусыг
// (trial→active г.м) гараар өөрчилдөг. `tenants.status`+RLS UPDATE/DELETE
// policy (0005/0006 migration) дээр суурилна.
//
// 2026-08-19 (3-р засвар): "Approval" (Хүлээн зөвшөөргвл) БОЛОН
// "Tenant status" (Төлбөрийн статус) баганы нэр/үтгүүдийг Англи болгов
// (SaaS платформуудын нийтлэг конвенц). Approval-ийн баруун талд Багц
// шууд dropdown болгож шилжүүлэв (өмнв нь Засах модаль дотор л
// солигддог байсныг ойртуулав). Мвн: EditTenantModal нь key prop
// дутуу байсан тул хуучин tenant-ийн дата үлдэж (дахин пре-fill
// хийгддэггүй) байсан bug-ийг олж зассан.
const STATUS_OPTIONS = [
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Paused' },
  { key: 'cancelled', label: 'Stopped' },
];

const STATUS_COLOR = {
  active: 'bg-green-500/[0.18] text-customGreen border-green-500/30',
  suspended: 'bg-orange-500/[0.18] text-customOrange border-orange-500/30',
  cancelled: 'bg-red-500/[0.18] text-customRed border-red-500/30',
};

const APPROVAL_LABEL = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};
const APPROVAL_COLOR = {
  pending: 'bg-yellow-500/[0.18] text-customOrange border-yellow-500/30',
  approved: 'bg-green-500/[0.18] text-customGreen border-green-500/30',
  rejected: 'bg-red-500/[0.18] text-customRed border-red-500/30',
};

function formatTrialEnds(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
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

  // Tenant status (Trial/Active/Paused/Stopped) — зөвхөн approval_status
  // ='approved' үед л хамааралтай, "Approval"-д ХАМААРАЛГүй.
  async function handleStatusChange(tenantId, newStatus) {
    setSavingId(tenantId);
    const { data, error } = await supabase
      .from('tenants')
      .update({ status: newStatus })
      .eq('id', tenantId)
      .select()
      .single();
    setSavingId(null);
    if (error) { window.alert(error.message); return; }
    supabase.rpc('log_audit_event', { p_tenant_id: tenantId, p_action: 'change_status', p_details: { new_status: newStatus }, p_target_name: data.name });
    setRows((prev) => prev.map((r) => (r.id === tenantId ? data : r)));
  }

  // 2026-08-19 (3-р засвар): Багцыг шууд мвр дотор нь (Засах модаль
  // нээхгүйгээр) солих боломжтой болгов.
  async function handlePlanChange(tenantId, newPlanKey) {
    setSavingId(tenantId);
    const { data, error } = await supabase
      .from('tenants')
      .update({ plan_key: newPlanKey, plan_activated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select()
      .single();
    setSavingId(null);
    if (error) { window.alert(error.message); return; }
    supabase.rpc('log_audit_event', { p_tenant_id: tenantId, p_action: 'change_plan', p_details: { new_plan: newPlanKey }, p_target_name: data.name });
    setRows((prev) => prev.map((r) => (r.id === tenantId ? data : r)));
  }

  // Approve: approval_status='approved' болгож, ШИНЭЭР 14 хоногийн
  // Trial хугацаа эхлvулнэ (зөвшөөрсвн мөчээс л тоологдоно).
  async function handleApprove(tenantId) {
    setSavingId(tenantId);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('tenants')
      .update({ approval_status: 'approved', status: 'active', plan_key: 'trial', plan_activated_at: now.toISOString(), trial_ends_at: trialEndsAt })
      .eq('id', tenantId)
      .select()
      .single();
    setSavingId(null);
    if (error) { window.alert(error.message); return; }
    supabase.rpc('log_audit_event', { p_tenant_id: tenantId, p_action: 'approve_tenant', p_target_name: data.name });
    setRows((prev) => prev.map((r) => (r.id === tenantId ? data : r)));
  }

  // Reject: approval_status='rejected' болгож, тухайн хэрэглэгчийн
  // tenant_admin эрхийг ч хамт хасна — эс тгвл орфон эрх үлдэнэ.
  async function handleReject(tenantId) {
    if (!(await confirm('Энэ бүртгүүлэх хүсэлтийг татгалзах уу? Хэрэглэгчийн эрх ч хамт хасагдана.'))) return;
    setSavingId(tenantId);
    const { data, error } = await supabase
      .from('tenants')
      .update({ approval_status: 'rejected' })
      .eq('id', tenantId)
      .select()
      .single();
    if (error) { setSavingId(null); window.alert(error.message); return; }
    const { error: roleErr } = await supabase.from('user_roles').delete().eq('tenant_id', tenantId).eq('role', 'tenant_admin');
    // 2026-08-19 (2-р засвар): tenant_users-ийн "admin" мөрийг ч хамт
    // цэвэрлнэ — эс тгүл татгалзсан tenant-д "фантом админ" мөр үлдэж,
    // "Хэрэглэгчийн удирдлага" хуудсанд буруу үзүүлэлт үүсгэдэг байв.
    const { error: tuErr } = await supabase.from('tenant_users').delete().eq('tenant_id', tenantId).eq('role', 'admin');
    setSavingId(null);
    if (roleErr || tuErr) window.alert(`Статус солигдсон ч эрх/бүртгэл хасахад алдаа гарлаа: ${(roleErr || tuErr).message}`);
    supabase.rpc('log_audit_event', { p_tenant_id: tenantId, p_action: 'reject_tenant', p_target_name: data.name });
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
    supabase.rpc('log_audit_event', { p_tenant_id: tenantId, p_action: 'edit_tenant_info', p_details: payload, p_target_name: data.name });
    setRows((prev) => prev.map((r) => (r.id === tenantId ? data : r)));
    setEditing(null);
  }

  async function handleDelete(row) {
    if (!(await confirm(`"${row.name}" СӨХ-ыг бүрмөсөн устгах уу? Энэ үйлдлийг буцаах боломжгүй (өмчлөгч/зах зээлийн дата хамт устана).`))) return;
    await supabase.rpc('log_audit_event', { p_tenant_id: row.id, p_action: 'delete_tenant', p_target_name: row.name });
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
              <th className="py-2.5 px-3">СӘХ-НЫ НЭР</th>
              <th className="py-2.5 px-3">РЕГИСТР</th>
              <th className="py-2.5 px-3">ИМЭЙЛ</th>
              <th className="py-2.5 px-3">УТАС</th>
              <th className="py-2.5 px-3">АДМИН НЭВТРЭХ ИМЭЙЛ</th>
              <th className="py-2.5 px-3">APPROVAL</th>
              <th className="py-2.5 px-3">БАГЦ</th>
              <th className="py-2.5 px-3">БАГЦ ИДЭВХЖСЭН</th>
              <th className="py-2.5 px-3">БАГЦ ДУУСАХ</th>
              <th className="py-2.5 px-3">TENANT STATUS</th>
              <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading && (
              <tr><td colSpan={11} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
            )}
            {!loading && loadError && (
              <tr><td colSpan={11} className="py-8 text-center text-customRed">{loadError}</td></tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr><td colSpan={11} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
            )}
            {!loading && !loadError && rows.map((r) => (
              <tr key={r.id} className={r.approval_status === 'pending' ? 'bg-yellow-500/[0.06]' : ''}>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                <td className="py-2.5 px-3">{r.registration_no || '—'}</td>
                <td className="py-2.5 px-3">{r.email || '—'}</td>
                <td className="py-2.5 px-3">{r.phone || '—'}</td>
                <td className="py-2.5 px-3">{adminEmails[r.id] || '—'}</td>
                <td className="py-2.5 px-3">
                  {r.approval_status === 'pending' ? (
                    <div className="flex items-center gap-1.5">
                      <button className="ds-btn-primary !py-1 !px-2 text-[11px]" disabled={savingId === r.id} onClick={() => handleApprove(r.id)}>Approve</button>
                      <button className="ds-btn-secondary !py-1 !px-2 text-[11px] text-customRed" disabled={savingId === r.id} onClick={() => handleReject(r.id)}>Reject</button>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${APPROVAL_COLOR[r.approval_status] || ''}`}>
                      {APPROVAL_LABEL[r.approval_status] || r.approval_status}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <select
                    className="ds-select w-full"
                    value={r.plan_key || PLANS[0].key}
                    disabled={savingId === r.id}
                    onChange={(e) => handlePlanChange(r.id, e.target.value)}
                  >
                    {PLANS.map((p) => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">{r.plan_activated_at ? formatTrialEnds(r.plan_activated_at) : '—'}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">{r.trial_ends_at ? formatTrialEnds(r.trial_ends_at) : '—'}</td>
                <td className="py-2.5 px-3">
                  {r.approval_status !== 'approved' ? (
                    <span className="text-mutedtext text-[12px]">—</span>
                  ) : (
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
                  )}
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
        key={editing?.id}
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
