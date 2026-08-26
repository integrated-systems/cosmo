import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { DeleteIcon } from '../components/icons/Icons';

// "Сонгууль, санал асуулга" > "Шинээр үүсгэх"/Засах — 2026-08-19
// хэрэглэгч тодорхой заасны дагуу МОДАЛЬ БИШ, бүтэн ДЭД ХУУДАС хэлбэрээр
// hийв (/voting/new, /voting/:id/edit). 4 тврлийн (Санал асуулга/Үнэлгээ/
// Ээлжит сонгууль/Хэлэлцүүлэг) сонголтоос хамаарч доод карт солигдоно.
function genId() { return `tmp-${Math.random().toString(36).slice(2)}`; }

const TYPES = [
  { key: 'poll', label: 'Санал асуулга', subtitle: 'Саналаа вгвх' },
  { key: 'rating', label: 'Үнэлгээ вгвх', subtitle: 'Одоор үнэлэх' },
  { key: 'election', label: 'Ээлжит сонгууль', subtitle: 'Нэр дэвшигч сонгох' },
  { key: 'discussion', label: 'Хэлэлцүүлэг', subtitle: 'Сэдэв хэлэлцэх' },
];

// 2026-08-19 хэрэглэгч тодорхой заасны дагуу: сонгосон төрлөөс хамаарч
// "Гарчиг" талбарын жишээ (placeholder) текст солигдоно.
const TITLE_PLACEHOLDER = {
  poll: 'Жиш: Санал асуулга - 2026/10 сар',
  rating: 'Жиш: Үнэлгээ - 2026/10 сар',
  election: 'Жиш: Сонгууль - 2026/10 сар',
  discussion: 'Жиш: Хэлэлцүүлэг - 2026/10 сар',
};

// 2026-08-19 хэрэглэгч тодорхой заасны дагуу: native <input
// type="datetime-local"> нь браузер/OS-ийн локал форматаар (mm/dd/yyyy)
// л үзүүлдэг, hэрэглэгчийн шаардсан "YYYY/MM/DD HH:MM" форматыг
// шууд бүрдүүлэх боломжгүй тул, зүгээр текст талбар болгож, гараар
// parse/validate хийдэг болгов.
// 2026-08-19 (2-р засвар): хэрэглэгч тодорхой заасны дагуу native
// <input type="datetime-local">-руу буцаав — гараар "YYYY/MM/DD HH:MM"
// бичих шаардлагатай текст талбар нь бага компьютерийн туршлагатай
// хэрэглэгчид (санал асуулга зохиогч үзвлч гишүүд) буруу ойлгогдож,
// алдаа гаргах эрсдэлтэй. Native calendar/цагийн сонголтын widget нь
// эдгээр эрсдэлээс бүрэн сэргийлдэг, дэлгэцэн дээрх формат нь
// браузер/OS-ийн локалиас хамаарах ч, звв үнэ цэнэтэй trade-off.
function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VotingEditPage() {
  const { hoaId = DEFAULT_TENANT_ID, pollId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!pollId;

  const [type, setType] = useState('poll');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isSecret, setIsSecret] = useState(true);
  const [showLive, setShowLive] = useState(true);
  const [boardVotesAllowed, setBoardVotesAllowed] = useState(1);
  const [supervisoryVotesAllowed, setSupervisoryVotesAllowed] = useState(1);

  const [questions, setQuestions] = useState([]); // {id, question_text, options: []}
  const [boardCandidates, setBoardCandidates] = useState([]); // {id, fullname}
  const [supervisoryCandidates, setSupervisoryCandidates] = useState([]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const { data: poll } = await supabase.from('voting_polls').select('*').eq('id', pollId).single();
      if (poll) {
        setType(poll.type);
        setTitle(poll.title || '');
        setDescription(poll.description || '');
        setStartAt(toDatetimeLocal(poll.start_at));
        setEndAt(toDatetimeLocal(poll.end_at));
        setIsSecret(poll.is_secret);
        setShowLive(poll.show_live_results);
        setBoardVotesAllowed(poll.board_votes_allowed ?? 1);
        setSupervisoryVotesAllowed(poll.supervisory_votes_allowed ?? 1);
      }
      const { data: qs } = await supabase.from('voting_questions').select('*').eq('poll_id', pollId).order('order_index');
      setQuestions((qs ?? []).map((q) => ({ id: q.id, question_text: q.question_text, options: q.options || [] })));
      const { data: cands } = await supabase.from('voting_candidates').select('*').eq('poll_id', pollId).order('order_index');
      setBoardCandidates((cands ?? []).filter((c) => c.council_type === 'board').map((c) => ({ id: c.id, fullname: c.fullname })));
      setSupervisoryCandidates((cands ?? []).filter((c) => c.council_type === 'supervisory_board').map((c) => ({ id: c.id, fullname: c.fullname })));
      setLoading(false);
    })();
  }, [isEditing, pollId]);

  function addQuestion() {
    setQuestions((qs) => [...qs, { id: genId(), question_text: '', options: [''] }]);
  }
  function updateQuestion(id, patch) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  function removeQuestion(id) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }
  function addOption(qid) {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: [...q.options, ''] } : q)));
  }
  function updateOption(qid, idx, value) {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) } : q)));
  }
  function removeOption(qid, idx) {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q)));
  }

  function addCandidate(council) {
    const setter = council === 'board' ? setBoardCandidates : setSupervisoryCandidates;
    setter((cs) => [...cs, { id: genId(), fullname: '' }]);
  }
  function updateCandidate(council, id, fullname) {
    const setter = council === 'board' ? setBoardCandidates : setSupervisoryCandidates;
    setter((cs) => cs.map((c) => (c.id === id ? { ...c, fullname } : c)));
  }
  function removeCandidate(council, id) {
    const setter = council === 'board' ? setBoardCandidates : setSupervisoryCandidates;
    setter((cs) => cs.filter((c) => c.id !== id));
  }

  async function handleSave(targetStatus) {
    if (!title.trim()) { alert('Гарчиг оруулна уу'); return; }
    if (targetStatus === 'active' && (!startAt || !endAt)) {
      alert('Нийтлэхийн тулд Эхлэх БОЛОН Дуусах огноог заавал оруулна уу');
      return;
    }

    setSaving(true);

    const payload = {
      tenant_id: hoaId,
      type,
      title: title.trim(),
      description: description.trim() || null,
      start_at: startAt ? new Date(startAt).toISOString() : null,
      end_at: endAt ? new Date(endAt).toISOString() : null,
      is_secret: isSecret,
      show_live_results: showLive,
      board_votes_allowed: boardVotesAllowed,
      supervisory_votes_allowed: supervisoryVotesAllowed,
      status: targetStatus,
    };

    let currentPollId = pollId;
    if (isEditing) {
      const { error } = await supabase.from('voting_polls').update(payload).eq('id', pollId);
      if (error) { setSaving(false); alert(error.message); return; }
      await supabase.from('voting_questions').delete().eq('poll_id', pollId);
      await supabase.from('voting_candidates').delete().eq('poll_id', pollId);
    } else {
      const { data, error } = await supabase.from('voting_polls').insert(payload).select().single();
      if (error) { setSaving(false); alert(error.message); return; }
      currentPollId = data.id;
    }

    if (type === 'poll' || type === 'rating' || type === 'discussion') {
      const rows = questions.filter((q) => q.question_text.trim()).map((q, idx) => ({
        poll_id: currentPollId,
        question_text: q.question_text.trim(),
        options: q.options.filter((o) => o.trim()),
        order_index: idx,
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('voting_questions').insert(rows);
        if (error) { setSaving(false); alert(error.message); return; }
      }
    } else if (type === 'election') {
      const rows = [
        ...boardCandidates.filter((c) => c.fullname.trim()).map((c, idx) => ({ poll_id: currentPollId, council_type: 'board', fullname: c.fullname.trim(), order_index: idx })),
        ...supervisoryCandidates.filter((c) => c.fullname.trim()).map((c, idx) => ({ poll_id: currentPollId, council_type: 'supervisory_board', fullname: c.fullname.trim(), order_index: idx })),
      ];
      if (rows.length > 0) {
        const { error } = await supabase.from('voting_candidates').insert(rows);
        if (error) { setSaving(false); alert(error.message); return; }
      }
    }

    supabase.rpc('log_audit_event', { p_tenant_id: hoaId, p_action: (isEditing ? 'edit_voting' : 'create_voting'), p_details: { status: targetStatus }, p_target_name: title.trim() });
    setSaving(false);
    navigate(`/${hoaId}/voting`);
  }

  if (loading) return <div className="ds-card p-8 text-center text-darktext">Ачаалж байна...</div>;

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <button className="ds-btn-secondary" onClick={() => navigate(`/${hoaId}/voting`)}>← Буцах</button>
      </div>

      <div className="ds-card p-4">
        <div className="grid grid-cols-4 gap-2 mb-5">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                type === t.key ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-bordercol hover:border-blue-500/40'
              }`}
            >
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{t.label}</div>
              <div className="text-[11px] text-mutedtext mt-0.5">{t.subtitle}</div>
            </button>
          ))}
        </div>

        <div className="mb-3.5">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гарчиг</label>
          <input className="ds-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={TITLE_PLACEHOLDER[type]} />
        </div>

        <div className="mb-3.5">
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тайлбар</label>
          <textarea className="ds-input w-full min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Санал хураалт, санал асуулгын зорилго, тайлбар" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Эхлэх огноо, цаг, минут</label>
            <input type="datetime-local" className="ds-input w-full" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Дуусах огноо, цаг, минут</label>
            <input type="datetime-local" className="ds-input w-full" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <label className="flex items-center gap-1.5 text-[12px] text-slate-700 dark:text-text cursor-pointer">
            <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} />
            Нууц санал хураалт
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-slate-700 dark:text-text cursor-pointer">
            <input type="checkbox" checked={showLive} onChange={(e) => setShowLive(e.target.checked)} />
            Үр дүнг Live харуулах
          </label>
        </div>
      </div>

      {(type === 'poll' || type === 'rating' || type === 'discussion') && (
        <div className="ds-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white">Асуултууд</span>
            <button className="ds-btn-secondary" onClick={addQuestion}>+ Асуулт нэмэх</button>
          </div>
          {questions.length === 0 && <div className="text-[12px] text-mutedtext">Асуулт нэмээгүй байна</div>}
          <div className="flex flex-col gap-3">
            {questions.map((q) => (
              <div key={q.id} className="border border-slate-200 dark:border-bordercol rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="ds-input w-full" placeholder="Асуултын текст"
                    value={q.question_text} onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                  />
                  <button className="ds-icon-btn danger shrink-0" onClick={() => removeQuestion(q.id)}><DeleteIcon /></button>
                </div>
                <div className="flex flex-col gap-1.5 pl-3">
                  {q.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        className="ds-input w-full text-[12px]" placeholder={`Сонголт ${idx + 1}`}
                        value={opt} onChange={(e) => updateOption(q.id, idx, e.target.value)}
                      />
                      <button className="ds-icon-btn danger shrink-0" onClick={() => removeOption(q.id, idx)}><DeleteIcon /></button>
                    </div>
                  ))}
                  <button className="text-[11px] text-customBlue self-start mt-1" onClick={() => addOption(q.id)}>+ Сонголт нэмэх</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'election' && (
        <div className="ds-card p-4">
          <div className="grid grid-cols-2 gap-6">
            {[
              { key: 'board', title: 'Удирдах зввлвлийн гишүүдийн сонгууль', votes: boardVotesAllowed, setVotes: setBoardVotesAllowed, cands: boardCandidates },
              { key: 'supervisory_board', title: 'Хяналтын зввлвлийн гишүүдийн сонгууль', votes: supervisoryVotesAllowed, setVotes: setSupervisoryVotesAllowed, cands: supervisoryCandidates },
            ].map((col) => (
              <div key={col.key}>
                <div className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">{col.title}</div>
                <div className="mb-3">
                  <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">вгвх саналын тоо:</label>
                  <input
                    type="number" min="1" className="ds-input w-[100px]"
                    value={col.votes} onChange={(e) => col.setVotes(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-slate-700 dark:text-text">Нэр дэвшигчдийн жагсаалт</span>
                  <button className="ds-btn-secondary !py-1 !px-2 text-[11px]" onClick={() => addCandidate(col.key)}>+ Нэр дэвшигч нэмэх</button>
                </div>
                {col.cands.length === 0 && <div className="text-[12px] text-mutedtext">Нэр дэвшигч нэмээгүй байна</div>}
                <div className="flex flex-col gap-1.5">
                  {col.cands.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <input
                        className="ds-input w-full" placeholder="Нэр дэвшигчийн нэр"
                        value={c.fullname} onChange={(e) => updateCandidate(col.key, c.id, e.target.value)}
                      />
                      <button className="ds-icon-btn danger shrink-0" onClick={() => removeCandidate(col.key, c.id)}><DeleteIcon /></button>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-mutedtext mt-2">"Аль нь ч биш" сонголт автоматаар нэмэгдэнэ.</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button className="ds-btn-secondary" onClick={() => navigate(`/${hoaId}/voting`)}>Болих</button>
        <button className="ds-btn-secondary" onClick={() => handleSave('draft')} disabled={saving}>{saving ? 'Хадгалж байна...' : 'Хадгалах'}</button>
        <button className="ds-btn-primary" onClick={() => handleSave('active')} disabled={saving}>{saving ? 'Хадгалж байна...' : 'Нийтлэх'}</button>
      </div>
    </div>
  );
}
