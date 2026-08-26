import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useAccessRules } from '../hooks/useAccessRules';

// "Сонгууль, санал асуулга" (/voting) — 2026-08-19 хэрэглэгчтэй
// тохиролцсоны дагуу шинээр үүсгэв. Жагсаалт (энэ хуудас) + "Шинээр
// үүсгэх" (тусдаа бүтэн хуудас, модаль БИШ — VotingEditPage.jsx) гэсэн
// 2 хэсгээс бүрдэнэ.
const TYPE_LABELS = {
  poll: 'Санал асуулга',
  rating: 'Үнэлгээ вгвх',
  election: 'Ээлжит сонгууль',
  discussion: 'Хэлэлцүүлэг',
};

const STATUS_LABELS = { draft: 'Ноорог', active: 'Идэвхтэй', closed: 'Дууссан' };
const STATUS_COLORS = {
  draft: 'bg-slate-500/[0.18] text-slate-400 border-slate-500/30',
  active: 'bg-green-500/[0.18] text-customGreen border-green-500/30',
  closed: 'bg-red-500/[0.18] text-customRed border-red-500/30',
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function VotingPage() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const navigate = useNavigate();
  const { can, bypass } = useAccessRules(hoaId);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // 2026-08-19 hэрэглэгч олсон бодит цоорхойг засав: үмнв нь СТАТУС үл
  // хамааран бүх зүйл ЗАСВАРЛАХ хуудас руу чиглүүлдэг байсан тул, admin
  // БИШ хүн (owner) ч гэсэн засах/устгах эрхтэй мэт UI-г хардаг байв.
  // Одоо: "draft" (ноорог) зүйлийг зввхвн Засах эрхтэй (bypass) хүн л
  // хардаг (owner-д ноорог ОГТ үзүүлэхгүй), нийтлэгдсэн (active/closed)
  // зүйл дээр дарахад БүГД (admin ч гэсэн) зввхвн уншихад зориулсан
  // VotingResultsPage.jsx руу л чиглүүлнэ.
  const canEditPoll = bypass || can('voting', 'edit');

  async function load() {
    setLoading(true);
    setLoadError('');
    let query = supabase.from('voting_polls').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false });
    if (!canEditPoll) {
      query = query.in('status', ['active', 'closed']);
    }
    const { data, error } = await fetchAllRows(() => query);
    if (error) { setLoadError(error.message); setLoading(false); return; }
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hoaId, canEditPoll]);

  function openItem(row) {
    if (row.status === 'draft' && canEditPoll) {
      navigate(`/${hoaId}/voting/${row.id}/edit`);
    } else {
      navigate(`/${hoaId}/voting/${row.id}/results`);
    }
  }

  return (
    <>
      <div className="ds-toolbar">
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white">Сонгууль, санал асуулгын сан</span>
        {can('voting', 'add') && (
          <button className="ds-btn-primary" onClick={() => navigate(`/${hoaId}/voting/new`)}>+ Шинээр үүсгэх</button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {loading && <div className="ds-card p-8 text-center text-darktext">Ачаалж байна...</div>}
        {!loading && loadError && <div className="ds-card p-8 text-center text-customRed">{loadError}</div>}
        {!loading && !loadError && rows.length === 0 && (
          <div className="ds-card p-8 text-center text-darktext">Санал асуулга, сонгууль үүсгээгүй байна</div>
        )}
        {!loading && !loadError && rows.map((r) => (
          <button
            key={r.id}
            onClick={() => openItem(r)}
            className="ds-card p-4 flex items-center justify-between text-left hover:border-blue-500/40 transition-colors"
          >
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{r.title}</div>
              <div className="text-[11px] text-mutedtext mt-0.5">
                {TYPE_LABELS[r.type] || r.type} · {formatDate(r.start_at)} — {formatDate(r.end_at)}
              </div>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[r.status] || ''}`}>
              {STATUS_LABELS[r.status] || r.status}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
