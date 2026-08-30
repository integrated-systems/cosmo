import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { useAccessRules } from '../hooks/useAccessRules';
import { DEFAULT_TENANT_ID } from '../config/tenant';

// "Сонгууль, санал асуулга" > дэлгэрэнгүй — 2026-08-19 хэрэглэгч олсон
// бодит цоорхойг засав: нийтлэгдсэн (active/closed) зүйл дээр дарахад
// үүнээс өмнө хувь хүн бүгд ЗАСВАРЛАХ хуудас (VotingEditPage.jsx) руу
// чиглүүлдэг байсан тул, tenant_admin биш хүн (owner) ч гэсэн
// "засах/устгах эрхтэй мэт" UI-г ХАРДАГ байсан. Одоо нийтлэгдсэн зүйл
// үүргэлж ЭНЭ хуудсаар нээгдэнэ.
//
// 2026-08-20: Энэ хуудас ХОЁР үүргийг гүйцэтгэдэг болов —
//  (1) Staff (Засах эрхтэй): үүргүй ЗӨВХӨН уншихад зориулсан нэгтгэсэн
//      үр дүн (get_voting_results RPC) харуулна.
//  (2) Owner (Засах эрхгүй, OwnerApp-аар нэвтэрсэн): хэрэв санал
//      хураалт нээлттэй (active, цаг хугацааны хүрээнд) БОЛОН өөрөө
//      хараахан санал өгөөгүй бол БОДИТ санал өгөх маягт үзүүлж,
//      voting_responses хүснэгэлд бичнэ. Санал өгсний дараа (эсвэл
//      хураалт хаагдсан бол) үр дүнг л харна.
const TYPE_LABELS = {
  poll: 'Санал асуулга',
  rating: 'Үнэлгээ өгөх',
  election: 'Ээлжит сонгууль',
  discussion: 'Хэлэлцүүлэг',
};
const STATUS_LABELS = { draft: 'Ноорог', active: 'Идэвхтэй', closed: 'Дууссан' };
const COUNCIL_TITLES = { board: 'Удирдах зөвлөлийн гишүүдийн сонгууль', supervisory_board: 'Хяналтын зөвлөлийн гишүүдийн сонгууль' };

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function StarInput({ value, onChange, readOnly }) {
  return (
    <div className="flex items-center gap-1 text-[22px] leading-none select-none">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={readOnly ? undefined : () => onChange(n)}
          className={`${readOnly ? '' : 'cursor-pointer'} ${n <= value ? 'text-amber-400' : 'text-slate-300 dark:text-bordercol'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ResultBar({ label, count, total, highlight, unit = '', mine = false }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1">
        <span className={highlight ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-text'}>
          {label}{mine && <span className="text-customGreen font-semibold"> ✓ Миний өгсөн санал</span>}
        </span>
        <span className="text-mutedtext">{count}{unit} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-bordercol overflow-hidden">
        <div className="h-full bg-customBlue" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function VotingResultsPage() {
  const { hoaId = DEFAULT_TENANT_ID, pollId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can, bypass } = useAccessRules(hoaId);
  const canEditPoll = bypass || can('voting', 'edit');

  const [poll, setPoll] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [boardCandidates, setBoardCandidates] = useState([]);
  const [supervisoryCandidates, setSupervisoryCandidates] = useState([]);
  const [myResponses, setMyResponses] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null); // get_voting_results() JSON
  const [turnoutDetail, setTurnoutDetail] = useState(null);
  const [showTurnoutDetail, setShowTurnoutDetail] = useState(false);
  const [receiptCode, setReceiptCode] = useState(null);
  const [receiptQrUrl, setReceiptQrUrl] = useState(null);
  const [showReceiptCheck, setShowReceiptCheck] = useState(false);
  const [checkCodeInput, setCheckCodeInput] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Owner-ий одоогоор бөглөж буй (илгээгээгүй) хариултууд
  const [pollAnswers, setPollAnswers] = useState({}); // {question_id: option_text}
  const [ratingAnswers, setRatingAnswers] = useState({}); // {question_id: 1-5}
  const [electionSelections, setElectionSelections] = useState({ board: [], supervisory_board: [] }); // candidate_id[] эсвэл 'NONE'
  const [discussionText, setDiscussionText] = useState('');
  const realtimeChannelRef = useRef(null);

  async function loadAll() {
    setLoading(true);
    setNotFound(false);
    const { data: p } = await supabase.from('voting_polls').select('*').eq('id', pollId).single();
    if (!p) { setNotFound(true); setLoading(false); return; }
    setPoll(p);

    const { data: qs } = await supabase.from('voting_questions').select('*').eq('poll_id', pollId).order('order_index');
    setQuestions(qs ?? []);
    const { data: cands } = await supabase.from('voting_candidates').select('*').eq('poll_id', pollId).order('order_index');
    setBoardCandidates((cands ?? []).filter((c) => c.council_type === 'board'));
    setSupervisoryCandidates((cands ?? []).filter((c) => c.council_type === 'supervisory_board'));

    if (user) {
      const { data: mine } = await supabase.from('voting_responses').select('*').eq('poll_id', pollId).eq('user_id', user.id);
      setMyResponses(mine ?? []);
      const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
      setOwnerId(ownerRow?.id ?? null);
    }
    setLoading(false);
  }

  async function loadResults() {
    setResultsLoading(true);
    const { data, error } = await supabase.rpc('get_voting_results', { p_poll_id: pollId });
    if (!error) setResults(data);
    setResultsLoading(false);
  }

  async function loadTurnoutDetail() {
    if (turnoutDetail) { setShowTurnoutDetail((s) => !s); return; }
    const { data, error } = await supabase.rpc('get_voting_turnout_detail', { p_poll_id: pollId });
    if (!error) { setTurnoutDetail(data); setShowTurnoutDetail(true); }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pollId, user?.id]);

  useEffect(() => {
    // 2026-08-27: Realtime тоолуур (дэвшилтэт зүйл #4) — RLS нь
    // voting_responses-ийг зөвхөн ӨӨРИЙН мөрөөр хязгаарладаг тул
    // Supabase-ийн стандарт "postgres_changes" бүртгэл (өөр хүний INSERT
    // мврийг ил гаргана) ЭНД тохирохгүй (нууцлалыг зөрчинэ). Оронд нь
    // зүгээр л "ямар нэг санал орж ирлээ" гэсэн агуулгагүй "broadcast"
    // дохио ашиглаж, хүлээн авагч бүр өөрийн эрхээрээ get_voting_results()
    // RPC-г дахин дуудна — ингэснээр хэн ямар сонголт хийснийг ил
        // гаргахгүйгээр л тоолуур шууд шинэчлэгдэнэ.
    if (!pollId) return;
    const channel = supabase.channel(`voting-poll-${pollId}`);
    channel.on('broadcast', { event: 'vote_cast' }, () => { loadResults(); }).subscribe();
    realtimeChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); realtimeChannelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  function broadcastVoteCast() {
    realtimeChannelRef.current?.send({ type: 'broadcast', event: 'vote_cast', payload: {} });
  }

  async function issueReceipt() {
    // 2026-08-27, дэвшилтэт зүйл #8 — санал өгсний баталгаажуулах
    // баримт. Ганц удаа үүсэж, дараа дахин дуудвал ЯГ ХУУЧИН кодоо
    // буцаана (нэг poll-д нэг л баримт, санал бүрийг тус тусад нь биш).
    const { data: code, error } = await supabase.rpc('get_or_create_voting_receipt', { p_poll_id: pollId });
    if (error || !code) return;
    setReceiptCode(code);
    try {
      const url = await QRCode.toDataURL(code, { width: 180, margin: 1 });
      setReceiptQrUrl(url);
    } catch { /* QR үүсгэхэд алдаа гарвал зүгээр кодыг текстээр үзүүлнэ */ }
  }

  const now = new Date();
  const notStarted = !!(poll?.start_at && now < new Date(poll.start_at));
  // 2026-08-27: close_expired_polls() cron 15 минут тутам ажиллаж
  // хугацаа дууссан "active" зүйлийг "closed" болгодог тул энэ давхар
  // цагийн шалгалт нь зөвхөн тэр 15 минутын завсарлагааны хамгаалалт
  // (voting_responses INSERT RLS-д ч мөн адил цагийн хамгаалалт бий).
  const timeEnded = !!(poll?.end_at && now > new Date(poll.end_at));
  const isOpenForVoting = poll?.status === 'active' && !notStarted && !timeEnded;
  const isOwnerViewer = !canEditPoll;

  const myQuestionIds = useMemo(() => new Set(myResponses.filter((r) => r.question_id).map((r) => r.question_id)), [myResponses]);
  const hasRespondedAllQuestions = questions.length > 0 && questions.every((q) => myQuestionIds.has(q.id));
  const hasRespondedBoard = useMemo(() => myResponses.some((r) => r.council_type === 'board'), [myResponses]);
  const hasRespondedSupervisory = useMemo(() => myResponses.some((r) => r.council_type === 'supervisory_board'), [myResponses]);
  const hasRespondedDiscussion = useMemo(() => myResponses.some((r) => r.comment_text), [myResponses]);

  useEffect(() => {
    // Буцаж ирсэн (өмнө нь санал өгсөн) owner-д хуучин баримтаа дахин
    // харуулна — get_or_create_voting_receipt() idempotent тул зүгээр
    // хуучин кодоо буцаана, шинээр үүсгэхгүй.
    if (isOwnerViewer && myResponses.length > 0 && !receiptCode) issueReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myResponses, isOwnerViewer]);

  useEffect(() => {
    // 2026-08-27: Кворум/оролцооны тоо (turnout) нь хэний ямар сонголт
    // хийснийг ил гаргадаггүй тул show_live_results-с үл хамааран
    // үргэлж (санал өгч дуусаагүй үед ч) ачаалж, "хэдэн хүн санал
    // өгснийг" харуулна — зөвхөн бодит үр дүнг (аль сонголт илүү гэдгийг)
    // needsResults=false үед НУУНА (доорх render хэсэгт canAnswerThis/
    // canVoteThis нөхцлүүдээр аль хэдийн хамгаалагдсан).
    if (!poll) return;
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll?.id]);

  function toggleCandidate(council, candId) {
    const limit = council === 'board' ? (poll.board_votes_allowed ?? 1) : (poll.supervisory_votes_allowed ?? 1);
    setElectionSelections((prev) => {
      const current = prev[council] || [];
      if (candId === 'NONE') {
        return { ...prev, [council]: current.includes('NONE') ? [] : ['NONE'] };
      }
      let next = current.filter((c) => c !== 'NONE');
      if (next.includes(candId)) {
        next = next.filter((c) => c !== candId);
      } else {
        if (next.length >= limit) return prev;
        next = [...next, candId];
      }
      return { ...prev, [council]: next };
    });
  }

  async function submitPollOrRating() {
    const answers = poll.type === 'rating' ? ratingAnswers : pollAnswers;
    const rows = questions
      .filter((q) => !myQuestionIds.has(q.id) && answers[q.id])
      .map((q) => ({
        poll_id: pollId,
        tenant_id: hoaId,
        user_id: user.id,
        owner_id: ownerId,
        question_id: q.id,
        option_text: poll.type === 'poll' ? answers[q.id] : null,
        rating_value: poll.type === 'rating' ? answers[q.id] : null,
      }));
    if (rows.length === 0) { alert('Хариулт сонгоно уу'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('voting_responses').insert(rows);
    setSubmitting(false);
    if (error) { alert(error.message); return; }
    await loadAll();
    broadcastVoteCast();
    issueReceipt();
  }

  async function submitElectionCouncil(council) {
    const sel = electionSelections[council] || [];
    if (sel.length === 0) { alert('Сонголт хийнэ үү'); return; }
    setSubmitting(true);
    // 2026-08-20: candidate_id мөр бүрийг ДАРААЛАН (нэг нэгээр нь)
    // insert хийнэ — enforce_election_vote_limit() trigger-т өмнөх
    // (энэ л транзакцад аль хэдийн бичигдсэн) саналын тоог зөв тоолуулах
    // зорилготой (single multi-row INSERT үед trigger-үүд харилцан
    // бие биенийхээ мөрийг зөв харахгүй эрсдэлтэй тул).
    for (const c of sel) {
      const { error } = await supabase.from('voting_responses').insert({
        poll_id: pollId,
        tenant_id: hoaId,
        user_id: user.id,
        owner_id: ownerId,
        council_type: council,
        candidate_id: c === 'NONE' ? null : c,
      });
      if (error) { setSubmitting(false); alert(error.message); return; }
    }
    setSubmitting(false);
    await loadAll();
    broadcastVoteCast();
    issueReceipt();
  }

  async function submitDiscussion() {
    if (!discussionText.trim()) { alert('Санал бичнэ үү'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('voting_responses').insert({
      poll_id: pollId,
      tenant_id: hoaId,
      user_id: user.id,
      owner_id: ownerId,
      comment_text: discussionText.trim().slice(0, 220),
    });
    setSubmitting(false);
    if (error) { alert(error.message); return; }
    setDiscussionText('');
    await loadAll();
    broadcastVoteCast();
    issueReceipt();
  }

  if (loading) return <div className="ds-card p-8 text-center text-darktext">Ачаалж байна...</div>;
  if (notFound || !poll || (isOwnerViewer && poll.status === 'draft')) {
    return <div className="ds-card p-8 text-center text-customRed">Олдсонгүй</div>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <button className="ds-btn-secondary" onClick={() => navigate(`/${hoaId}/voting`)}>← Буцах</button>
        {!isOwnerViewer && poll.status === 'closed' && (
          <button className="ds-btn-secondary" onClick={() => navigate(`/${hoaId}/voting/${pollId}/protocol`)}>Албан ёсны протокол</button>
        )}
      </div>

      <div className="ds-card p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[15px] font-semibold text-slate-900 dark:text-white">{poll.title}</div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${poll.status === 'closed' ? 'bg-red-500/[0.18] text-customRed border-red-500/30' : 'bg-green-500/[0.18] text-customGreen border-green-500/30'}`}>
            {STATUS_LABELS[poll.status] || poll.status}
          </span>
        </div>
        <div className="text-[11px] text-mutedtext mb-3">
          {TYPE_LABELS[poll.type] || poll.type} · {formatDateTime(poll.start_at)} — {formatDateTime(poll.end_at)}
        </div>
        {poll.description && poll.type !== 'discussion' && <div className="text-[13px] text-slate-700 dark:text-text mb-2">{poll.description}</div>}
        {isOwnerViewer && poll.status === 'active' && notStarted && (
          <div className="text-[12px] text-orange-500">Санал хураалт хараахан эхлээгүй байна.</div>
        )}
        {isOwnerViewer && poll.status === 'active' && timeEnded && (
          <div className="text-[12px] text-customRed">Санал хураалтын хугацаа дууссан байна.</div>
        )}
      </div>

      {/* ============ КВОРУМ / ОРОЛЦОО ============ */}
      {results?.turnout && (
        <div className="ds-card p-4">
          <div className="flex items-center justify-between text-[12px] mb-1">
            <span className="text-slate-700 dark:text-text">
              Оролцоо: <span className="font-semibold text-slate-900 dark:text-white">{results.turnout.responded_count}{results.turnout.weighted ? ' м²' : ''} / {results.turnout.eligible_count}{results.turnout.weighted ? ' м²' : ''}</span> ({results.turnout.turnout_percent}%)
            </span>
            <span className={`font-semibold ${results.turnout.quorum_met ? 'text-customGreen' : 'text-orange-500'}`}>
              {results.turnout.quorum_met ? '✓ Кворум хүрсэн' : `Кворум хүрээгүй (${results.turnout.quorum_percent}%)`}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-bordercol overflow-hidden">
            <div
              className={`h-full ${results.turnout.quorum_met ? 'bg-customGreen' : 'bg-orange-400'}`}
              style={{ width: `${Math.min(100, results.turnout.turnout_percent)}%` }}
            />
          </div>
        </div>
      )}

      {/* ============ POLL / RATING ============ */}
      {(poll.type === 'poll' || poll.type === 'rating') && (
        <div className="ds-card p-4">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Асуултууд</div>
          {questions.length === 0 && <div className="text-[12px] text-mutedtext">Асуулт алга</div>}
          <div className="flex flex-col gap-3">
            {questions.map((q) => {
              const answeredRow = myResponses.find((r) => r.question_id === q.id);
              const canAnswerThis = isOwnerViewer && isOpenForVoting && !answeredRow;
              const resultQ = results?.questions?.find((rq) => rq.question_id === q.id);
              return (
                <div key={q.id} className="border border-slate-200 dark:border-bordercol rounded-lg p-3">
                  <div className="text-[13px] font-medium text-slate-800 dark:text-text mb-2">{q.question_text}</div>

                  {canAnswerThis ? (
                    poll.type === 'rating' ? (
                      <div className="pl-3">
                        <StarInput value={ratingAnswers[q.id] || 0} onChange={(n) => setRatingAnswers((s) => ({ ...s, [q.id]: n }))} />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 pl-3">
                        {(q.options || []).map((opt, idx) => (
                          <label key={idx} className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-text cursor-pointer">
                            <input
                              type="radio" name={`q-${q.id}`} checked={pollAnswers[q.id] === opt}
                              onChange={() => setPollAnswers((s) => ({ ...s, [q.id]: opt }))}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )
                  ) : answeredRow ? (
                    <div className="pl-3 text-[12px] text-customGreen">
                      ✓ Таны хариулт: {poll.type === 'rating' ? '★'.repeat(answeredRow.rating_value) : answeredRow.option_text}
                    </div>
                  ) : resultQ ? (
                    poll.type === 'rating' ? (
                      <div className="pl-3 text-[13px] text-slate-700 dark:text-text">
                        Дундаж: <span className="font-semibold text-amber-400">{resultQ.avg_rating ?? '—'} ★</span> ({resultQ.total_responses} санал)
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 pl-3">
                        {(resultQ.options || []).map((o, idx) => (
                          <ResultBar key={idx} label={o.option} count={o.count} total={resultQ.total_responses} unit={results?.turnout?.weighted ? ' м²' : ''} />
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="pl-3 text-[12px] text-mutedtext">{results?.visible === false ? 'Үр дүнг санал хураалт дуусмагц харуулна' : 'Ачаалж байна...'}</div>
                  )}
                </div>
              );
            })}
          </div>
          {isOwnerViewer && isOpenForVoting && !hasRespondedAllQuestions && questions.length > 0 && (
            <div className="flex justify-end mt-3">
              <button className="ds-btn-primary" disabled={submitting} onClick={submitPollOrRating}>{submitting ? 'Илгээж байна...' : 'Санал өгөх'}</button>
            </div>
          )}
        </div>
      )}

      {/* ============ DISCUSSION ============ */}
      {poll.type === 'discussion' && (
        <>
          <div className="ds-card p-4">
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-2">Асуудал</div>
            <div className="text-[13px] text-slate-700 dark:text-text">{poll.description || '—'}</div>
          </div>

          {isOwnerViewer && isOpenForVoting && !hasRespondedDiscussion && (
            <div className="ds-card p-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] text-slate-500 dark:text-mutedtext">Таны санал</label>
                <span className="text-[10px] text-mutedtext">{discussionText.length}/220</span>
              </div>
              <textarea
                className="ds-input w-full min-h-[80px]" maxLength={220}
                value={discussionText} onChange={(e) => setDiscussionText(e.target.value)}
                placeholder="Саналаа энд бичнэ үү"
              />
              <div className="flex justify-end mt-2">
                <button className="ds-btn-primary" disabled={submitting} onClick={submitDiscussion}>{submitting ? 'Илгээж байна...' : 'Илгээх'}</button>
              </div>
            </div>
          )}

          {isOwnerViewer && hasRespondedDiscussion && (
            <div className="ds-card p-4 text-[12px] text-customGreen">✓ Таны санал бүртгэгдсэн байна.</div>
          )}

          {!isOwnerViewer || !isOpenForVoting || hasRespondedDiscussion ? (
            <div className="ds-card p-4">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Санал бичсэн жагсаалт</div>
              {results?.visible === false && <div className="text-[12px] text-mutedtext">Үр дүнг санал хураалт дуусмагц харуулна</div>}
              {results?.comments && results.comments.length === 0 && <div className="text-[12px] text-mutedtext">Санал бичээгүй байна</div>}
              <div className="flex flex-col gap-2">
                {(results?.comments || []).map((c, idx) => (
                  <div key={idx} className="border border-slate-200 dark:border-bordercol rounded-lg p-2.5">
                    <div className="text-[12px] text-slate-700 dark:text-text">{c.comment_text}</div>
                    <div className="text-[10px] text-mutedtext mt-1">{c.author} · {formatDateTime(c.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ============ ELECTION ============ */}
      {poll.type === 'election' && (
        <div className="ds-card p-4">
          {/* 2026-08-30 ОЛСОН БОДИТ АЛДАА ЗАСАВ: хэрэглэгч тодруулав —
              утсан дэлгэц дээр 2 багана хэт шаваарч харагддаг байсан
              тул "grid-cols-2" биш, ЦУВУУЛЖ (Удирдах зүүлвл -> Хяналтын
              зүүлвл) байрлуулна. */}
          <div className="flex flex-col gap-6">
            {[
              { key: 'board', cands: boardCandidates, responded: hasRespondedBoard },
              { key: 'supervisory_board', cands: supervisoryCandidates, responded: hasRespondedSupervisory },
            ].map((col) => {
              const limit = col.key === 'board' ? (poll.board_votes_allowed ?? 1) : (poll.supervisory_votes_allowed ?? 1);
              const canVoteThis = isOwnerViewer && isOpenForVoting && !col.responded && col.cands.length > 0;
              const resultCouncil = results?.councils?.find((rc) => rc.council_type === col.key);
              const totalVotes = resultCouncil ? (resultCouncil.candidates || []).reduce((sum, c) => sum + c.votes, 0) : 0;
              // 2026-08-30: тухайн зүүлвлд ЭНЭ хэрэглэгчийн сонгосон
              // нэр дэвшигч(ид)-ийг тодорхойлж, үр дүнд нь "✓ Миний
              // өгсөн санал" гэж тэмдэглэж үзүүлэхийн тулд.
              const myCandidateIds = new Set(myResponses.filter((r) => r.council_type === col.key && r.candidate_id).map((r) => r.candidate_id));
              const myVotedNone = myResponses.some((r) => r.council_type === col.key && !r.candidate_id);
              return (
                <div key={col.key}>
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-1">{COUNCIL_TITLES[col.key]}</div>
                  {col.cands.length === 0 && <div className="text-[12px] text-mutedtext">Нэр дэвшигч алга</div>}

                  {canVoteThis && (
                    <>
                      <div className="text-[11px] text-mutedtext mb-2">Дээд тал нь {limit} саналыг сонгож болно</div>
                      <div className="flex flex-col gap-1.5">
                        {col.cands.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-text cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(electionSelections[col.key] || []).includes(c.fullname === 'Аль нь ч биш' ? 'NONE' : c.id)}
                              onChange={() => toggleCandidate(col.key, c.fullname === 'Аль нь ч биш' ? 'NONE' : c.id)}
                            />
                            {c.fullname}
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end mt-2">
                        <button className="ds-btn-secondary !py-1 !px-2 text-[11px]" disabled={submitting} onClick={() => submitElectionCouncil(col.key)}>
                          {submitting ? 'Илгээж байна...' : 'Санал өгөх'}
                        </button>
                      </div>
                    </>
                  )}

                  {isOwnerViewer && col.responded && (
                    <div className="text-[12px] text-customGreen mb-2">✓ Таны санал бүртгэгдсэн байна.</div>
                  )}

                  {(!isOwnerViewer || !isOpenForVoting || col.responded) && col.cands.length > 0 && (
                    resultCouncil ? (
                      <div className="flex flex-col gap-2 mt-1">
                        {(resultCouncil.candidates || []).map((c) => (
                          <ResultBar
                            key={c.candidate_id} label={c.fullname} count={c.votes} total={totalVotes}
                            highlight={c.fullname !== 'Аль нь ч биш'} unit={results?.turnout?.weighted ? ' м²' : ''}
                            mine={c.fullname === 'Аль нь ч биш' ? myVotedNone : myCandidateIds.has(c.candidate_id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-mutedtext">{results?.visible === false ? 'Үр дүнг санал хураалт дуусмагц харуулна' : 'Ачаалж байна...'}</div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resultsLoading && <div className="ds-card p-3 text-center text-[11px] text-mutedtext">Үр дүнг ачаалж байна...</div>}

      {/* ============ САНАЛ ӨГСНИЙ БАТАЛГААЖУУЛАХ БАРИМТ (QR) ============ */}
      {isOwnerViewer && receiptCode && (
        <div className="ds-card p-4 text-center">
          <div className="text-[12px] font-semibold text-slate-900 dark:text-white mb-2">✓ Таны санал бүртгэгдлээ — баталгаажуулах баримт</div>
          {receiptQrUrl && <img src={receiptQrUrl} alt="QR баримт" className="mx-auto mb-2" width={140} height={140} />}
          <div className="text-[11px] font-mono text-mutedtext break-all">{receiptCode}</div>
          <div className="text-[10px] text-mutedtext mt-2">Энэ кодыг хадгална уу — дараа "Баримт шалгах" хэсэгт оруулж, таны санал бүртгэгдсэн эсэхийг ХЭН Ч (аль сонголтыг харуулахгүйгээр) баталгаажуулж болно.</div>
        </div>
      )}

      <div className="ds-card p-4">
        <button className="ds-btn-secondary !py-1 !px-2 text-[11px]" onClick={() => setShowReceiptCheck((s) => !s)}>
          {showReceiptCheck ? 'Баримт шалгах хэсэг нуух' : 'Баримт шалгах'}
        </button>
        {showReceiptCheck && (
          <div className="mt-3 flex flex-col gap-2 max-w-sm">
            <div className="flex gap-2">
              <input
                className="ds-input w-full text-[12px]" placeholder="Баримтын код"
                value={checkCodeInput} onChange={(e) => setCheckCodeInput(e.target.value)}
              />
              <button
                className="ds-btn-primary shrink-0"
                onClick={async () => {
                  const { data } = await supabase.rpc('verify_voting_receipt', { p_receipt_code: checkCodeInput.trim() });
                  setCheckResult(data);
                }}
              >
                Шалгах
              </button>
            </div>
            {checkResult && (
              checkResult.valid ? (
                <div className="text-[12px] text-customGreen">
                  ✓ Баталгаажлаа — «{checkResult.poll_title}» санал асуулгад {formatDateTime(checkResult.recorded_at)} бүртгэгдсэн.
                </div>
              ) : (
                <div className="text-[12px] text-customRed">✗ Ийм баримт олдсонгүй.</div>
              )
            )}
          </div>
        )}
      </div>

      {/* ============ ОРОЛЦООНЫ АДМИН DASHBOARD (зөвхөн staff) ============ */}
      {!isOwnerViewer && (
        <div className="ds-card p-4">
          <button className="ds-btn-secondary !py-1 !px-2 text-[11px]" onClick={loadTurnoutDetail}>
            {showTurnoutDetail ? 'Оролцооны жагсаалт нуух' : 'Оролцооны жагсаалт харах (хэн санал өгөөгүй)'}
          </button>
          {showTurnoutDetail && turnoutDetail && (
            <div className="mt-3 max-h-80 overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-mutedtext border-b border-slate-200 dark:border-bordercol">
                    <th className="py-1.5 pr-2">Байр/Тоот</th>
                    <th className="py-1.5 pr-2">Нэр</th>
                    <th className="py-1.5 text-right">Санал</th>
                  </tr>
                </thead>
                <tbody>
                  {turnoutDetail.map((o) => (
                    <tr key={o.owner_id} className="border-b border-slate-100 dark:border-bordercol/50">
                      <td className="py-1.5 pr-2 text-mutedtext">{[o.building_no, o.floor, o.door_no].filter(Boolean).join('-') || '—'}</td>
                      <td className="py-1.5 pr-2">{o.fullname || '—'}</td>
                      <td className="py-1.5 text-right">
                        {o.has_voted
                          ? <span className="text-customGreen font-semibold">✓ Өгсөн</span>
                          : <span className="text-orange-500">Өгөөгүй</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
