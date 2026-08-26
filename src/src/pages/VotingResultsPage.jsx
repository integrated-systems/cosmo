import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';

// "Сонгууль, санал асуулга" > үр дүн (READ-ONLY) — 2026-08-19 hэрэглэгч
// олсон бодит цоорхойг засав: нийтлэгдсэн (active/closed) зүйл дээр
// дарахад үүнээс вмнв hувь хүн бүгд ЗАСВАРЛАХ хуудас (VotingEditPage.jsx)
// руу чиглүүлдэг байсан тул, tenant_admin биш хүн (owner) ч гэсэн
// "засах/устгах эрхтэй мэт" UI-г ХАРДАГ байсан (бодит RLS блоклодог ч,
// UI-ийн ил тод байдал буруу байв). Одоо нийтлэгдсэн зүйл үүргэлж
// ЭНЭ уншихад зориулсан хуудсаар л нээгдэнэ.
const TYPE_LABELS = {
  poll: 'Санал асуулга',
  rating: 'Үнэлгээ вгвх',
  election: 'Ээлжит сонгууль',
  discussion: 'Хэлэлцүүлэг',
};
const STATUS_LABELS = { draft: 'Ноорог', active: 'Идэвхтэй', closed: 'Дууссан' };

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function VotingResultsPage() {
  const { hoaId = DEFAULT_TENANT_ID, pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [boardCandidates, setBoardCandidates] = useState([]);
  const [supervisoryCandidates, setSupervisoryCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('voting_polls').select('*').eq('id', pollId).single();
      setPoll(p);
      const { data: qs } = await supabase.from('voting_questions').select('*').eq('poll_id', pollId).order('order_index');
      setQuestions(qs ?? []);
      const { data: cands } = await supabase.from('voting_candidates').select('*').eq('poll_id', pollId).order('order_index');
      setBoardCandidates((cands ?? []).filter((c) => c.council_type === 'board'));
      setSupervisoryCandidates((cands ?? []).filter((c) => c.council_type === 'supervisory_board'));
      setLoading(false);
    })();
  }, [pollId]);

  if (loading) return <div className="ds-card p-8 text-center text-darktext">Ачаалж байна...</div>;
  if (!poll) return <div className="ds-card p-8 text-center text-customRed">Олдсонгүй</div>;

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <button className="ds-btn-secondary" onClick={() => navigate(`/${hoaId}/voting`)}>← Буцах</button>
      </div>

      <div className="ds-card p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white">{poll.title}</div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/[0.18] text-customGreen border border-green-500/30">
            {STATUS_LABELS[poll.status] || poll.status}
          </span>
        </div>
        <div className="text-[11px] text-mutedtext mb-3">
          {TYPE_LABELS[poll.type] || poll.type} · {formatDateTime(poll.start_at)} — {formatDateTime(poll.end_at)}
        </div>
        {poll.description && poll.type !== 'discussion' && <div className="text-[13px] text-slate-700 dark:text-text mb-2">{poll.description}</div>}
      </div>

      {(poll.type === 'poll' || poll.type === 'rating') && (
        <div className="ds-card p-4">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Асуултууд</div>
          {questions.length === 0 && <div className="text-[12px] text-mutedtext">Асуулт алга</div>}
          <div className="flex flex-col gap-3">
            {questions.map((q) => (
              <div key={q.id} className="border border-slate-200 dark:border-bordercol rounded-lg p-3">
                <div className="text-[13px] font-medium text-slate-800 dark:text-text mb-2">{q.question_text}</div>
                {poll.type === 'rating' ? (
                  <div className="pl-3 text-[20px] leading-none text-amber-400 select-none">★★★★★</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {(q.options || []).map((opt, idx) => (
                      <div key={idx} className="text-[12px] text-mutedtext pl-3">• {opt}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {poll.type === 'discussion' && (
        <div className="ds-card p-4">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-2">Асуудал</div>
          <div className="text-[13px] text-slate-700 dark:text-text">{poll.description || '—'}</div>
        </div>
      )}

      {poll.type === 'election' && (
        <div className="ds-card p-4">
          <div className="grid grid-cols-2 gap-6">
            {[
              { title: 'Удирдах зввлвлийн гишүүдийн сонгууль', cands: boardCandidates },
              { title: 'Хяналтын зввлвлийн гишүүдийн сонгууль', cands: supervisoryCandidates },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-2">{col.title}</div>
                {col.cands.length === 0 && <div className="text-[12px] text-mutedtext">Нэр дэвшигч алга</div>}
                <div className="flex flex-col gap-1">
                  {col.cands.map((c) => (
                    <div key={c.id} className="text-[12px] text-slate-700 dark:text-text pl-1">• {c.fullname}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ds-card p-4 text-center text-[12px] text-mutedtext">
        Үр дүнг удахгүй энд харуулна.
      </div>
    </div>
  );
}
