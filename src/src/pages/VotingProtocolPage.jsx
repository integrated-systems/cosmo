import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAccessRules } from '../hooks/useAccessRules';
import { DEFAULT_TENANT_ID } from '../config/tenant';

// "Сонгууль, санал асуулга" > Албан ёсны протокол — 2026-08-27,
// дэвшилтэт зүйл #3. Хэвлэхэд зориулсан (A4, browser native "Хэвлэх →
// PDF болгож хадгалах") цэвэр загвар. ЗОРИУДААР jsPDF мэт сан ашиглаагүй
// — Кирилл фонтыг гар аргаар оруулах шаардлагагүй, browser өөрөө системийн
// фонтоор зөв Кирилл рендэрлэдэг тул илүү найдвартай бөгөөд хөнгөн.
const TYPE_LABELS = { poll: 'Санал асуулга', rating: 'Үнэлгээ', election: 'Ээлжит сонгууль', discussion: 'Хэлэлцүүлэг' };
const COUNCIL_TITLES = { board: 'Удирдах зөвлөл', supervisory_board: 'Хяналтын зөвлөл' };

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function VotingProtocolPage() {
  const { hoaId = DEFAULT_TENANT_ID, pollId } = useParams();
  const navigate = useNavigate();
  const { bypass, can } = useAccessRules(hoaId);
  const canEditPoll = bypass || can('voting', 'edit');

  const [poll, setPoll] = useState(null);
  const [tenantName, setTenantName] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('voting_polls').select('*').eq('id', pollId).single();
      if (!p) { setLoading(false); return; }
      setPoll(p);
      const { data: t } = await supabase.from('tenants').select('name').eq('id', hoaId).single();
      setTenantName(t?.name || '');
      const { data: r } = await supabase.rpc('get_voting_results', { p_poll_id: pollId });
      setResults(r);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  useEffect(() => {
    // Зөвхөн ЗАСАХ эрхтэй (staff) хүн, ЗӨВХӨН хаагдсан санал асуулгын
    // протокол үүсгэж болно — идэвхтэй үед протокол үүсгэх нь үр дүнг
    // эцэслэн баталгаажуулаагүй үед албан баримт үүсгэсэн мэт ойлголт
    // өгнө.
    if (!loading && (!canEditPoll || (poll && poll.status !== 'closed'))) setNotAllowed(true);
  }, [loading, canEditPoll, poll]);

  if (loading) return <div className="ds-card p-8 text-center text-darktext">Ачаалж байна...</div>;
  if (!poll || notAllowed) {
    return (
      <div className="ds-card p-8 text-center text-customRed">
        {!poll ? 'Олдсонгүй' : 'Протокол зөвхөн хаагдсан санал асуулгад үүсгэгдэнэ'}
      </div>
    );
  }

  const weighted = results?.turnout?.weighted;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between print:hidden">
        <button className="ds-btn-secondary" onClick={() => navigate(`/${hoaId}/voting/${pollId}/results`)}>← Буцах</button>
        <button className="ds-btn-primary" onClick={() => window.print()}>Хэвлэх / PDF болгож хадгалах</button>
      </div>

      <div className="ds-card p-8 print:shadow-none print:border-none" id="protocol-print-area">
        <div className="text-center mb-6">
          <div className="text-[11px] text-mutedtext uppercase tracking-wide">Албан ёсны протокол</div>
          <div className="text-[18px] font-bold text-slate-900 dark:text-white mt-1">{tenantName}</div>
          <div className="text-[13px] text-slate-700 dark:text-text mt-1">{TYPE_LABELS[poll.type] || poll.type} — «{poll.title}»</div>
        </div>

        <table className="w-full text-[12px] mb-5 border-collapse">
          <tbody>
            <tr><td className="py-1 pr-3 text-mutedtext w-1/3">Эхэлсэн огноо</td><td className="py-1 font-medium">{formatDateTime(poll.start_at)}</td></tr>
            <tr><td className="py-1 pr-3 text-mutedtext">Дууссан огноо</td><td className="py-1 font-medium">{formatDateTime(poll.end_at)}</td></tr>
            <tr><td className="py-1 pr-3 text-mutedtext">Нууц/Ил санал хураалт</td><td className="py-1 font-medium">{poll.is_secret ? 'Нууц' : 'Ил'}</td></tr>
            <tr><td className="py-1 pr-3 text-mutedtext">Тооллын горим</td><td className="py-1 font-medium">{weighted ? 'Эзэмшлийн хувиар (м²)' : 'Толгойн тоогоор'}</td></tr>
            {results?.turnout && (
              <>
                <tr><td className="py-1 pr-3 text-mutedtext">Оролцоо</td><td className="py-1 font-medium">{results.turnout.responded_count}{weighted ? ' м²' : ''} / {results.turnout.eligible_count}{weighted ? ' м²' : ''} ({results.turnout.turnout_percent}%)</td></tr>
                <tr><td className="py-1 pr-3 text-mutedtext">Кворум ({results.turnout.quorum_percent}%)</td><td className={`py-1 font-semibold ${results.turnout.quorum_met ? 'text-customGreen' : 'text-customRed'}`}>{results.turnout.quorum_met ? 'ХҮРСЭН' : 'ХҮРЭЭГҮЙ'}</td></tr>
              </>
            )}
          </tbody>
        </table>

        {poll.description && (
          <div className="mb-5">
            <div className="text-[12px] font-semibold mb-1">Тайлбар / Зорилго</div>
            <div className="text-[12px] text-slate-700 dark:text-text">{poll.description}</div>
          </div>
        )}

        {(poll.type === 'poll' || poll.type === 'rating') && results?.questions && (
          <div className="mb-5">
            <div className="text-[12px] font-semibold mb-2">Үр дүн</div>
            {results.questions.map((q) => (
              <div key={q.question_id} className="mb-3">
                <div className="text-[12px] font-medium mb-1">{q.question_text}</div>
                {poll.type === 'rating' ? (
                  <div className="text-[12px] pl-3">Дундаж үнэлгээ: {q.avg_rating ?? '—'} / 5 ({q.total_responses} санал)</div>
                ) : (
                  <table className="w-full text-[12px] pl-3">
                    <tbody>
                      {(q.options || []).map((o, idx) => (
                        <tr key={idx}><td className="py-0.5">{o.option}</td><td className="py-0.5 text-right w-24">{o.count}{weighted ? ' м²' : ''}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}

        {poll.type === 'election' && results?.councils && (
          <div className="mb-5">
            <div className="text-[12px] font-semibold mb-2">Үр дүн</div>
            {results.councils.map((c) => (
              <div key={c.council_type} className="mb-3">
                <div className="text-[12px] font-medium mb-1">{COUNCIL_TITLES[c.council_type] || c.council_type}</div>
                <table className="w-full text-[12px] pl-3">
                  <tbody>
                    {(c.candidates || []).map((cand) => (
                      <tr key={cand.candidate_id}><td className="py-0.5">{cand.fullname}</td><td className="py-0.5 text-right w-24">{cand.votes}{weighted ? ' м²' : ''}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {poll.type === 'discussion' && results?.comments && (
          <div className="mb-5">
            <div className="text-[12px] font-semibold mb-2">Ирүүлсэн саналууд ({results.comments.length})</div>
            {results.comments.map((c, idx) => (
              <div key={idx} className="text-[12px] mb-1.5 pl-3 border-l-2 border-slate-300 dark:border-bordercol">
                {c.comment_text} <span className="text-mutedtext">— {c.author}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-12 text-[12px]">
          <div>
            <div className="border-b border-slate-400 dark:border-bordercol h-10" />
            <div className="text-mutedtext mt-1">Тэргүүлэгч (гарын үсэг)</div>
          </div>
          <div>
            <div className="border-b border-slate-400 dark:border-bordercol h-10" />
            <div className="text-mutedtext mt-1">Нарийн бичгийн дарга (гарын үсэг)</div>
          </div>
        </div>
        <div className="text-[10px] text-mutedtext text-center mt-8">ҮҮсгэсэн огноо: {formatDateTime(new Date().toISOString())} · Cosmo СӨХ систем</div>
      </div>
    </div>
  );
}
