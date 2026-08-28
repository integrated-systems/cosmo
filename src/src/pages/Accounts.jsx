import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import { SearchIcon, EyeIcon, EyeOffIcon, EditIcon, DeleteIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';
import { useAccessRules } from '../hooks/useAccessRules';
import { formatUnitCode } from '../lib/ownersFormat';
import { useAuth } from '../lib/AuthContext';

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

function AddUserModal({ open, onClose, onSave, editing, hoaId }) {
  const [role, setRole] = useState('manager');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [owners, setOwners] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [pickedOwnerId, setPickedOwnerId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setRole(editing?.role || 'manager');
    setFullname(editing?.fullname || '');
    setEmail(editing?.email || '');
    setAddress(editing?.address || '');
    setPassword('');
    setPickedOwnerId(null);
  }, [open, editing]);

  // 2026-08-19 хэрэглэгч тодорхой заасан: "Роль" нь "Сууц өмчлөгч" үед,
  // "Овог нэр" талбарт бичиж эхэлмэгц Owners хүснэгэлээс тохирох нэр
  // санал болгож, сонгоход "Тоот" талбар автоматаар дүүргэгддэг болов.
  // owners жагсаалтыг зүгээр НЭГ удаа (role='owner' болмогц) татна —
  // tenant-ийн хэмжээ жижиг тул client талд шүүх нь хялбар бвгввд хурдан.
  useEffect(() => {
    if (role !== 'owner' || !hoaId || owners.length > 0) return;
    supabase.from('owners').select('id,firstname,lastname,building_no,floor,door_no,emails').eq('tenant_id', hoaId).then(({ data }) => {
      setOwners(data ?? []);
    });
  }, [role, hoaId, owners.length]);

  const q = fullname.trim().toLowerCase();
  const ownerMatches = q
    ? owners.filter((o) => `${o.firstname || ''} ${o.lastname || ''}`.toLowerCase().startsWith(q)
        || (o.lastname || '').toLowerCase().startsWith(q)).slice(0, 20)
    : [];

  function pickOwner(o) {
    setFullname(`${o.firstname || ''} ${o.lastname || ''}`.trim());
    setAddress(formatUnitCode(o.building_no, null, o.floor, null, o.door_no));
    // 2026-08-28 хэрэглэгчийн олсон ноцтой цоорхой: сууц өмчлөгчийг
    // жагсаалтаас сонгоход имэйл автоматаар дүүргэгддэггүй, мвн гараар
    // сольж бичих боломжтой байсан тул үр дүнд нь "Хэрэглэгч нэмэх"-ээр
    // үүсгэсэн нэвтрэх эрх нь ямар ч owners мвртэй холбогддоггүй байв
    // (owners.user_id хэзээ ч бичигдээгүй). Одоо: имэйл автоматаар
    // дүүргэгдэж, READ-ONLY болно (доорх emailLocked/pickedOwnerId).
    setEmail((o.emails && o.emails[0]) || '');
    setPickedOwnerId(o.id);
    setSuggestOpen(false);
  }

  async function submit() {
    setSaving(true);
    await onSave({ role, fullname, email, address, password, ownerId: pickedOwnerId });
    setSaving(false);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Хэрэглэгч засах' : 'Хэрэглэгч нэмэх'} size="sm" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="ds-btn-primary" onClick={submit} disabled={saving}>{saving ? 'Хадгалж байна...' : (editing ? 'Хадгалах' : 'Үүсгэх')}</button>
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
        <div className="relative">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Овог нэр</label>
          <input
            className="ds-input w-full"
            placeholder="Овог Нэр"
            value={fullname}
            onChange={(e) => { setFullname(e.target.value); setSuggestOpen(true); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
          />
          {role === 'owner' && suggestOpen && q && ownerMatches.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-sidebg border border-slate-200 dark:border-bordercol rounded-lg shadow-lg p-1">
              {ownerMatches.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onMouseDown={() => pickOwner(o)}
                  className="block w-full text-left px-2 py-1.5 text-[12px] rounded hover:bg-slate-100 dark:hover:bg-appbg text-slate-900 dark:text-white"
                >
                  {o.firstname} {o.lastname}
                  <span className="text-slate-400 dark:text-mutedtext ml-1.5">{formatUnitCode(o.building_no, null, o.floor, null, o.door_no)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {role === 'owner' && (
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тоот</label>
            <input className="ds-input w-full" value={address} readOnly disabled title="Овог нэрээр сонгосон сууц өмчлөгчийн тоот автоматаар дүүргэгдэнэ, гараар өөрчлөх боломжгүй." />
          </div>
        )}
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">И-мэйл</label>
          <input
            className="ds-input w-full" placeholder="email@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!editing || !!pickedOwnerId}
          />
          {editing && <div className="text-[10px] text-mutedtext mt-1">И-мэйл үүсгэсний дараа солигдохгүй.</div>}
          {!editing && pickedOwnerId && (
            <div className="text-[10px] text-mutedtext mt-1 flex items-center gap-1.5">
              Сууц өмчлөгчийн бүртгэлтэй имэйл — гараар засах боломжгүй.
              <button type="button" className="underline" onClick={() => { setPickedOwnerId(null); setEmail(''); }}>ҮҮнийг арилгах</button>
            </div>
          )}
          {!editing && role === 'owner' && (
            <div className="text-[10px] text-customOrange mt-1">
              ⚠️ Сууц өмчлөгчийн хувьд БОДИТ, хандах боломжтой имэйл байх ёстой — нууц үг мартвал зөвхөн энэ имэйлээр л сэргээх боломжтой.
            </div>
          )}
          </div>
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
  const { can } = useAccessRules(hoaId);
  const { user, isSuperSysAdmin } = useAuth();
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

    // 2026-08-19 хэрэглэгчтэй тохиролцсон засвар: tenant_users.email
    // үүсгэсэн мөчийн snapshot тул хугацаа өнгөрэхэд хуучирч болзошгүй
    // ("4-р асуудал", tenant_users vs auth.users). Үүнээс сэргийлж,
    // үзүүлэлт бүрд Supabase-ээс "амьд" (live) имэйлийг нэмж дүүргэнэ —
    // хадгалагдсан snapshot-ыг ОГТ өөрчлөхгүй, зүгээр дэлгэцэн дээр
    // үзүүлэхдээ л live утгыг илүүд тавина.
    const { data: liveEmails } = await supabase.rpc('get_tenant_user_emails', { p_tenant_id: hoaId });
    const liveMap = {};
    (liveEmails ?? []).forEach((r) => { liveMap[r.user_id] = r.live_email; });
    const merged = (data ?? []).map((r) => ({ ...r, email: liveMap[r.user_id] || r.email }));

    setRows(merged);
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
      supabase.rpc('log_audit_event', { p_tenant_id: hoaId, p_action: 'edit_user', p_details: payload, p_target_name: data.fullname });
      if (form.password && form.password.trim()) {
        const { error: pwErr } = await supabase.functions.invoke('manage-tenant-user', {
          body: { action: 'reset_password', tenantId: hoaId, userId: editing.user_id, password: form.password },
        });
        if (pwErr) { alert(`Профайл шинэчлэгдсэн ч нууц үг солиход алдаа гарлаа: ${pwErr.message}`); }
        else supabase.rpc('log_audit_event', { p_tenant_id: hoaId, p_action: 'reset_password', p_target_name: data.fullname });
      }
    } else {
      const { data: result, error } = await supabase.functions.invoke('manage-tenant-user', {
        body: { action: 'create', tenantId: hoaId, email: form.email, password: form.password, fullname: form.fullname, role: form.role, address: form.address || null, ownerId: form.ownerId || null },
      });
      if (error || result?.error) { alert(result?.error || error.message); return; }
      setRows((rs) => [result.data, ...rs]);
      supabase.rpc('log_audit_event', { p_tenant_id: hoaId, p_action: 'create_user', p_details: { role: form.role, email: form.email }, p_target_name: form.fullname });
    }
    setAdding(false);
    setEditing(null);
  }

  // 2026-08-19 хэрэглэгчтэй тохиролцсон бодлого: admin ролийг энд солих
  // боломжгүй (зөвхөн Reassign үйлдлээр — user_roles-ийг ч мөн зэрэг
  // хамт өөрчилдэг). Мөн хэн ч (admin ч гэсэн) өөрийн мөрийг идэвхгүй
  // болгож чадахгүй — санамсаргүй өөрийгөө түгжихээс сэргийлнэ.
  // 2026-08-19 хэрэглэгчтэй тохиролцсон бодлого: tenant_admin (SISADMIN)
  // өврийгөө БОЛОН бусад admin ролийг идэвхгүй болгож чадахгүй. Харин
  // SUPERSYSADMIN бүх SISADMIN-ийг идэвхгүй болгох эрхтэй (энгийн
  // tenant_admin-ийн эрхээс тусдаа, илүү өндвр эрх мэдэл) — үүнийг
  // үмнвх засвар буруугаар БүГДЭД адилхан хориглосон байсныг олж зассан.
  async function handleToggleStatus(row) {
    if (row.role === 'admin' && !isSuperSysAdmin) return;
    if (row.user_id === user?.id) return;
    const status = row.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('tenant_users').update({ status }).eq('id', row.id);
    if (error) { alert(error.message); return; }
    supabase.rpc('log_audit_event', { p_tenant_id: hoaId, p_action: status === 'inactive' ? 'deactivate_user' : 'activate_user', p_target_name: row.fullname });
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)));
  }

  async function handleDelete(row) {
    if (!(await confirm(`"${row.fullname}"-г устгах уу? Үүнтэй хамт нэвтрэх эрх нь ч бүрмөсөн устана.`))) return;
    const { data: result, error } = await supabase.functions.invoke('manage-tenant-user', {
      body: { action: 'delete', tenantId: hoaId, rowId: row.id, userId: row.user_id },
    });
    if (error || result?.error) { alert(result?.error || error.message); return; }
    supabase.rpc('log_audit_event', { p_tenant_id: hoaId, p_action: 'delete_user', p_target_name: row.fullname });
    setRows((rs) => rs.filter((r) => r.id !== row.id));
  }

  return (
    <>
      <div className="ds-toolbar">
        <div className="relative min-w-[240px]">
          <input type="text" placeholder="Хайх..." className="ds-input w-full pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          <SearchIcon className="w-4 h-4 text-slate-400 dark:text-mutedtext absolute left-2.5 top-2" />
        </div>
        {can('accounts', 'add') && <button className="ds-btn-primary" onClick={() => setAdding(true)}>+ Хэрэглэгч нэмэх</button>}
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
                      disabled={(r.role === 'admin' && !isSuperSysAdmin) || r.user_id === user?.id}
                      title={r.role === 'admin' && !isSuperSysAdmin ? 'Admin ролийг зөвхөн SUPERSYSADMIN идэвхгүй болгож чадна' : r.user_id === user?.id ? 'өврийгөө идэвхгүй болгох боломжгүй' : ''}
                      className={`text-[11px] px-2 py-0.5 rounded-full border disabled:opacity-50 disabled:cursor-not-allowed ${
                        r.status === 'active'
                          ? 'text-customGreen border-customGreen/30 bg-customGreen/10'
                          : 'text-customRed border-customRed/30 bg-customRed/10'
                      }`}
                    >
                      {r.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                    </button>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {can('accounts', 'edit') && (
                      <button className="ds-icon-btn" title="Засах" onClick={() => setEditing(r)}><EditIcon /></button>
                    )}
                    {can('accounts', 'delete') && r.role !== 'admin' && (
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

      <AddUserModal open={adding || !!editing} editing={editing} hoaId={hoaId} onClose={() => { setAdding(false); setEditing(null); }} onSave={handleSave} />
      <ConfirmDialog />
      <AlertDialog />
    </>
  );
}
