import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

function ResultBar({ label, count, total, highlight }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1">
        <span className={highlight ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-text'}>{label}</span>
        <span className="text-mutedtext">{count} · {pct}%</span>
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
  const [resultsLoading, setResultsLoading] = useState(false);

  // Owner-ий одоогоор бөглөж буй (илгээгээгүй) хариултууд
  const [pollAnswers, setPollAnswers] = useState({}); // {question_id: option_text}
  const [ratingAnswers, setRatingAnswers] = useState({}); // {question_id: 1-5}
  const [electionSelections, setElectionSelections] = useState({ board: [], supervisory_board: [] }); // candidate_id[] эсвэл 'NONE'
  const [discussionText, setDiscussionText] = useState('');

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

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pollId, user?.id]);

  const now = new Date();
  const notStarted = !!(poll?.start_at && now < new Date(poll.start_at));
  // 2026-08-20: цаг хугацаа дуусмагц статус автоматаар "closed" болдоггүй
  // (энэ үүргийг гүйцэтгэх cron одоогоор үүсээгүй, msgr auto-delete
  // cron-той адил ирээдүйн ажлын жагсаалтад нэмэх санал болгож байна) —
  // тул frontend талд цагаар нь бас шалгаж, хугацаа дууссан бол
  // санал авахаа зогсооно (voting_responses INSERT RLS-д ч мөн адил
  // цагийн хамгаалалт бий, тул энэ давхар хамгаалалт).
  const timeEnded = !!(poll?.end_at && now > new Date(poll.end_at));
  const isOpenForVoting = poll?.status === 'active' && !notStarted && !timeEnded;
  const isOwnerViewer = !canEditPoll;

  const myQuestionIds = useMemo(() => new Set(myResponses.filter((r) => r.question_id).map((r) => r.question_id)), [myResponses]);
  const hasRespondedAllQuestions = questions.length > 0 && questions.every((q) => myQuestionIds.has(q.id));
  const hasRespondedBoard = useMemo(() => myResponses.some((r) => r.council_type === 'board'), [myResponses]);
  const hasRespondedSupervisory = useMemo(() => myResponses.some((r) => r.council_type === 'supervisory_board'), [myResponses]);
  const hasRespondedDiscussion = useMemo(() => myResponses.some((r) => r.comment_text), [myResponses]);

  const needsResults =
    !isOwnerViewer ||
    !isOpenForVoting ||
    (poll?.type === 'discussion' && hasRespondedDiscussion) ||
    ((poll?.type === 'poll' || poll?.type === 'rating') && hasRespondedAllQuestions) ||
    (poll?.type === 'election' && (hasRespondedBoard || boardCandidates.length === 0) && (hasRespondedSupervisory || supervisoryCandidates.length === 0));

  useEffect(() => {
    if (!poll) return;
    if (needsResults) loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll?.id, needsResults]);

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
  }

  if (loading) return <div className="ds-card p-8 text-center text-darktext">Ачаалж байна...</div>;
  if (notFound || !poll || (isOwnerViewer && poll.status === 'draft')) {
    return <div className="ds-card p-8 text-center text-customRed">Олдсонгүй</div>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <button className="ds-btn-secondary" onClick={() => navigate(`/${hoaId}/voting`)}>← Буцах</button>
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
                          <ResultBar key={idx} label={o.option} count={o.count} total={resultQ.total_responses} />
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
          <div className="grid grid-cols-2 gap-6">
            {[
              { key: 'board', cands: boardCandidates, responded: hasRespondedBoard },
              { key: 'supervisory_board', cands: supervisoryCandidates, responded: hasRespondedSupervisory },
            ].map((col) => {
              const limit = col.key === 'board' ? (poll.board_votes_allowed ?? 1) : (poll.supervisory_votes_allowed ?? 1);
              const canVoteThis = isOwnerViewer && isOpenForVoting && !col.responded && col.cands.length > 0;
              const resultCouncil = results?.councils?.find((rc) => rc.council_type === col.key);
              const totalVotes = resultCouncil ? (resultCouncil.candidates || []).reduce((sum, c) => sum + c.votes, 0) + (resultCouncil.none_votes || 0) : 0;
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
                          <ResultBar key={c.candidate_id} label={c.fullname} count={c.votes} total={totalVotes} highlight={c.fullname !== 'Аль нь ч биш'} />
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
    </div>
  );
}
