import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PLANS } from '../data/plans';
import { EditIcon, DeleteIcon } from '../components/icons/Icons';
import EditTenantModal from '../components/EditTenantModal';
import { useConfirm } from '../hooks/useConfirm';

// SUPERSYSADMIN-ийн "Tenant Status" хуудас — Твлбврийн 3-р алхмын
// "Гараар (invoice)" горим: бодит твлбврийн шлюз (QPay/SocialPay г.м)
// хараахан холбогдоогүй тул SUPERSYSADMIN энд СӨХ бүрийн статусыг
// (trial→active г.м) гараар вврчилдвг. `tenants.status`+RLS UPDATE/DELETE
// policy (0005/0006 migration) дээр суурилна.
//
// 2026-08-19 (2-р засвар): "Хүлээн зөвшөөргвл" (approval_status: pending/
// approved/rejected, ГАНЦ УДААГИЙН, шинэ бүртгүүлэгчид зориулсан) БОЛОН
// "Твлбврийн статус" (status: trial/active/suspended/cancelled, зөвшөөрсний
// ДАРАА л хамааралтай) хоёрыг бүрэн ТУСГААРЛАВ — үмнв нь нэг баганад
// холилдож, аль хэдийн ажиллаж буй tenant-д "Татгалзсан" гэсэн сонголт ч
// харагддаг байсан будлиантай асуудлыг зассан. Trial 14 хоногийн хугацаа
// (trial_ends_at) ЗвВШвврСвН мвчээс л эхэлж тоологдоно.
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

const APPROVAL_LABEL = {
  pending: 'Хүлээгдэж байна',
  approved: 'Зввшвврсвн',
  rejected: 'Татгалзсан',
};
const APPROVAL_COLOR = {
  pending: 'bg-yellow-500/[0.18] text-customOrange border-yellow-500/30',
  approved: 'bg-green-500/[0.18] text-customGreen border-green-500/30',
  rejected: 'bg-red-500/[0.18] text-customRed border-red-500/30',
};

function planLabel(planKey) {
  return PLANS.find((p) => p.key === planKey)?.name || planKey || '—';
}

function formatTrialEnds(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
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

  // Твлбврийн статус (Trial/Идэвхтэй/Түдгэлзүүлсэн/Цуцалсан) — зөвхөн
  // approval_status='approved' үед л хамааралтай, "Хүлээн зөвшөөргвл"-д
  // ХАМААРАЛГүй.
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
    setRows((prev) => prev.map((r) => (r.id === tenantId ? data : r)));
  }

  // Зввшвврвх: approval_status='approved' болгож, ШИНЭЭР 14 хоногийн
  // Trial хугацаа эхлүүлнэ (зөвшөөрсвн мвчээс л тоологдоно — хүлээгдэж
  // байх үед хэрэглэгч ямар ч хуудас нээж чадаагүй тул тэр хугацаа
  // "үрэгдэхгүй").
  async function handleApprove(tenantId) {
    setSavingId(tenantId);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('tenants')
      .update({ approval_status: 'approved', status: 'trial', trial_ends_at: trialEndsAt })
      .eq('id', tenantId)
      .select()
      .single();
    setSavingId(null);
    if (error) { window.alert(error.message); return; }
    setRows((prev) => prev.map((r) => (r.id === tenantId ? data : r)));
  }

  // Татгалзах: approval_status='rejected' болгож, тухайн хэрэглэгчийн
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
    setSavingId(null);
    if (roleErr) window.alert(`Статус солигдсон ч эрх хасахад алдаа гарлаа: ${roleErr.message}`);
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
    if (!(await confirm(`"${row.name}" СӨХ-ыг бүрмвсвн устгах уу? Энэ үйлдлийг буцаах боломжгүй (вмчлвгч/зах зээлийн дата хамт устана).`))) return;
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
              <th className="py-2.5 px-3">ХүЛЭЭН ЗввШввРГвЛ</th>
              <th className="py-2.5 px-3">ТвЛБвРИЙН СТАТУС</th>
              <th className="py-2.5 px-3 w-[80px] text-right">үЙЛДЭЛ</th>
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
              <tr key={r.id} className={r.approval_status === 'pending' ? 'bg-yellow-500/[0.06]' : ''}>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                <td className="py-2.5 px-3">{r.registration_no || '—'}</td>
                <td className="py-2.5 px-3">{r.email || '—'}</td>
                <td className="py-2.5 px-3">{r.phone || '—'}</td>
                <td className="py-2.5 px-3">{planLabel(r.plan_key)}</td>
                <td className="py-2.5 px-3">{adminEmails[r.id] || '—'}</td>
                <td className="py-2.5 px-3">
                  {r.approval_status === 'pending' ? (
                    <div className="flex items-center gap-1.5">
                      <button className="ds-btn-primary !py-1 !px-2 text-[11px]" disabled={savingId === r.id} onClick={() => handleApprove(r.id)}>Зввшвврвх</button>
                      <button className="ds-btn-secondary !py-1 !px-2 text-[11px] text-customRed" disabled={savingId === r.id} onClick={() => handleReject(r.id)}>Татгалзах</button>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${APPROVAL_COLOR[r.approval_status] || ''}`}>
                      {APPROVAL_LABEL[r.approval_status] || r.approval_status}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  {r.approval_status !== 'approved' ? (
                    <span className="text-mutedtext text-[12px]">—</span>
                  ) : (
                    <div>
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
                      {r.status === 'trial' && r.trial_ends_at && (
                        <div className="text-[10px] text-mutedtext mt-1">Дуусах: {formatTrialEnds(r.trial_ends_at)}</div>
                      )}
                    </div>
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
