import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';

// "Logs" (/logs, СИСАДМИН бүлэг) — 2026-08-19 хэрэглэгчтэй тохиролцсон
// Audit log хуудас. Тухайн tenant-ийн хэмжээнд гарсан чухал үйлдлүүдийг
// (Approve/Reject, статус/багц өөрчлөлт, хэрэглэгч үүсгэх/устгах, роль
// солих гэх мэт) `log_audit_event()` RPC-ээр бичсэн `audit_log`
// хүснэгэлээс уншиж үзүүлнэ. Огноогоор шүүдэг dropdown түүлбартай.
const ACTION_LABELS = {
  approve_tenant: 'СӨХ зөвшөөрсөн',
  reject_tenant: 'СӨХ татгалзсан',
  change_status: 'Төлбөрийн статус өөрчилсөн',
  change_plan: 'Багц өөрчилсөн',
  edit_tenant_info: 'СӨХ-ийн мэдээлэл зассан',
  delete_tenant: 'СӨХ устгасан',
  reassign_admin: 'Админ сольсон',
  create_user: 'Хэрэглэгч үүсгэсэн',
  edit_user: 'Хэрэглэгч засасан',
  delete_user: 'Хэрэглэгч устгасан',
  reset_password: 'Нууц үг сэргээсэн',
};

const DATE_FILTERS = [
  { key: 'today', label: 'Үнөөдөр' },
  { key: '7d', label: 'Сүүлийн 7 хоног' },
  { key: '30d', label: 'Сүүлийн 30 хоног' },
  { key: 'all', label: 'Бүгд' },
];

function filterStartDate(key) {
  const now = new Date();
  if (key === 'today') { now.setHours(0, 0, 0, 0); return now; }
  if (key === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (key === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Logs() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dateFilter, setDateFilter] = useState('7d');

  async function load() {
    setLoading(true);
    setLoadError('');
    let query = supabase.from('audit_log').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false });
    const startDate = filterStartDate(dateFilter);
    if (startDate) query = query.gte('created_at', startDate.toISOString());
    const { data, error } = await fetchAllRows(() => query);
    if (error) { setLoadError(error.message); setLoading(false); return; }
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hoaId, dateFilter]);

  return (
    <>
      <div className="ds-toolbar">
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white">Аудит лог</span>
        <select className="ds-select w-[180px]" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          {DATE_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">ОГНОО</th>
                <th className="py-2.5 px-3">ХЭРЭГЛЭГЧ</th>
                <th className="py-2.5 px-3">ҮЙЛДЭЛ</th>
                <th className="py-2.5 px-3">ЗОРИЛТ</th>
                <th className="py-2.5 px-3">ДЭЛГЭРЭНГҮЙ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading && (
                <tr><td colSpan={5} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
              )}
              {!loading && loadError && (
                <tr><td colSpan={5} className="py-8 text-center text-customRed">{loadError}</td></tr>
              )}
              {!loading && !loadError && rows.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-darktext">Сонгосон хугацаанд бүртгэл олдсонгүй</td></tr>
              )}
              {!loading && !loadError && rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  <td className="py-2.5 px-3">{r.actor_email || '—'}</td>
                  <td className="py-2.5 px-3">{ACTION_LABELS[r.action] || r.action}</td>
                  <td className="py-2.5 px-3">{r.target_name || '—'}</td>
                  <td className="py-2.5 px-3 text-[11px] text-mutedtext max-w-[280px] truncate" title={r.details ? JSON.stringify(r.details) : ''}>
                    {r.details ? JSON.stringify(r.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ds-table-summary"><div>Нийт: <span className="text-slate-900 dark:text-white font-medium">{rows.length}</span></div></div>
      </div>
    </>
  );
}
