import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import { SearchIcon, EyeIcon, EyeOffIcon, EditIcon, DeleteIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';

// "Хэрэглэгчийн удирдлага" (/accounts) — 2026-08-19 хэрэглэгчийн
// screenshot-оор өгсөн бүтэц. 2026-08-19 (2-р засвар): нууц үг
// бодит Supabase Auth-тай ("manage-tenant-user" Edge Function,
// service_role key ашиглана) холбогдов — шинэ хэрэглэгч үүсгэхэд
// бодит нэвтрэх эрх (auth.admin.createUser) үүсгэж, user_roles-т
// ролийг нь бичнэ. Устгахад Auth-аас ч хамт хасна. Нууц үг сэргээх
// боломжтой (Засах модальд шинэ нууц үг бичвэл л шинэчлэгдэнэ, хоосон
// үлдээвэл өвчлвгдвхгүй).
const ROLE_LABELS = {
  admin: 'Админ',
  board: 'Удирдах зөвлөл',
  supervisory_board: 'Хяналтын зөвлөл',
  executive_director: 'Гүйцэтгэх захирал',
  accountant: 'Нягтлан бодогч',
  manager: 'Менежер',
  owner: 'Сууц өмчлөгч',
};
const ROLE_OPTIONS = ['manager', 'accountant', 'executive_director', 'supervisory_board', 'board', 'owner', 'admin'];

function AddUserModal({ open, onClose, onSave, editing }) {
  const [role, setRole] = useState('manager');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRole(editing?.role || 'manager');
    setFullname(editing?.fullname || '');
    setEmail(editing?.email || '');
    setAddress(editing?.address || '');
    setPassword('');
  }, [open, editing]);

  async function submit() {
    setSaving(true);
    await onSave({ role, fullname, email, address, password });
    setSaving(false);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Хэрэглэгч засах' : 'Хэрэглэгч нэмэх'} size="sm" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="ds-btn-primary" onClick={submit} disabled={saving}>{saving ? 'Хадгалж байна...' : (editing ? 'Хадгалах' : 'үүсгэх')}</button>
      </>
    }>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Роль</label>
          <select className="ds-select w-full" value={role} onChange={(e) => setRole(e.target.value)} disabled={editing?.role === 'admin'}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          {editing?.role === 'admin' && <div className="text-[10px] text-mutedtext mt-1">ҮҮсгэсэн Админ ролийг энд солих боломжгүй (Tenant Status хуудсаас "Reassign" хийнэ).</div>}
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Бүтэн нэр</label>
          <input className="ds-input w-full" placeholder="Овог Нэр" value={fullname} onChange={(e) => setFullname(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">И-мэйл</label>
          <input className="ds-input w-full" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!editing} />
          {editing && <div className="text-[10px] text-mutedtext mt-1">И-мэйл үүсгэсний дараа солигдохгүй.</div>}
        </div>
        {role === 'owner' && (
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хаяг (тоотын код)</label>
            <input className="ds-input w-full" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        )}
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Нууц үг{editing && ' (солихгүй бол хоосон үлдээнэ vv)'}</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="ds-input w-full pr-8"
              placeholder="Хамгийн багадаа 6 тэмдэгт"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="absolute right-2 top-1.5 text-mutedtext" onClick={() => setShowPw((v) => !v)}>
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Accounts() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { confirm, ConfirmDialog } = useConfirm();
  const { alert, AlertDialog } = useAlert();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    const { data, error } = await fetchAllRows(() =>
      supabase.from('tenant_users').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false })
    );
    if (error) { alert(error.message); setLoading(false); return; }
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hoaId]);

  const q = search.trim().toLowerCase();
  const filtered = !q ? rows : rows.filter((r) =>
    r.fullname.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.address || '').toLowerCase().includes(q)
  );

  async function handleSave(form) {
    if (editing) {
      const payload = { role: form.role, fullname: form.fullname, address: form.address || null };
      const { data, error } = await supabase.from('tenant_users').update(payload).eq('id', editing.id).select().single();
      if (error) { alert(error.message); return; }
      setRows((rs) => rs.map((r) => (r.id === editing.id ? data : r)));
      if (form.password && form.password.trim()) {
        const { error: pwErr } = await supabase.functions.invoke('manage-tenant-user', {
          body: { action: 'reset_password', tenantId: hoaId, userId: editing.user_id, password: form.password },
        });
        if (pwErr) { alert(`Профайл шинэчлэгдсэн ч нууц үг солиход алдаа гарлаа: ${pwErr.message}`); }
      }
    } else {
      const { data: result, error } = await supabase.functions.invoke('manage-tenant-user', {
        body: { action: 'create', tenantId: hoaId, email: form.email, password: form.password, fullname: form.fullname, role: form.role, address: form.address || null },
      });
      if (error || result?.error) { alert(result?.error || error.message); return; }
      setRows((rs) => [result.data, ...rs]);
    }
    setAdding(false);
    setEditing(null);
  }

  async function handleToggleStatus(row) {
    const status = row.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('tenant_users').update({ status }).eq('id', row.id);
    if (error) { alert(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)));
  }

  async function handleDelete(row) {
    if (!(await confirm(`"${row.fullname}"-г устгах уу? Үүнтэй хамт нэвтрэх эрх нь ч бүрмөсөн устана.`))) return;
    const { data: result, error } = await supabase.functions.invoke('manage-tenant-user', {
      body: { action: 'delete', tenantId: hoaId, rowId: row.id, userId: row.user_id },
    });
    if (error || result?.error) { alert(result?.error || error.message); return; }
    setRows((rs) => rs.filter((r) => r.id !== row.id));
  }

  return (
    <>
      <div className="ds-toolbar">
        <div className="relative min-w-[240px]">
          <input type="text" placeholder="Хайх..." className="ds-input w-full pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          <SearchIcon className="w-4 h-4 text-slate-400 dark:text-mutedtext absolute left-2.5 top-2" />
        </div>
        <button className="ds-btn-primary" onClick={() => setAdding(true)}>+ Хэрэглэгч нэмэх</button>
      </div>

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th>РОЛЬ</th><th>НЭР</th><th>МЭЙЛ</th><th>ОНЛАЙН</th><th>ХАЯГ</th><th>ТӨЛӨВ</th><th className="text-right">ҮЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading && <tr><td colSpan={7} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>}
              {!loading && filtered.map((r) => (
                <tr key={r.id}>
                  <td>{ROLE_LABELS[r.role] || r.role}</td>
                  <td className="font-medium text-slate-900 dark:text-white">{r.fullname}</td>
                  <td>{r.email}</td>
                  <td>—</td>
                  <td>{r.address || '—'}</td>
                  <td>
                    <button
                      onClick={() => handleToggleStatus(r)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        r.status === 'active'
                          ? 'text-customGreen border-customGreen/30 bg-customGreen/10'
                          : 'text-customRed border-customRed/30 bg-customRed/10'
                      }`}
                    >
                      {r.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                    </button>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button className="ds-icon-btn" title="Засах" onClick={() => setEditing(r)}><EditIcon /></button>
                    {r.role !== 'admin' && (
                      <button className="ds-icon-btn danger" title="Устгах" onClick={() => handleDelete(r)}><DeleteIcon /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ds-table-summary"><div>Нийт: <span className="text-slate-900 dark:text-white font-medium">{filtered.length}</span></div></div>
      </div>

      <AddUserModal open={adding || !!editing} editing={editing} onClose={() => { setAdding(false); setEditing(null); }} onSave={handleSave} />
      <ConfirmDialog />
      <AlertDialog />
    </>
  );
}
