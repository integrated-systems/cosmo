import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import { SendIcon } from '../icons/Icons';

// 2026-08-27: ОЛСОН БОДИТ ЦООРХОЙ — "Мессенжер" tile дээр дарахад owner
// (сууц өмчлөгч) хүн Msgr.jsx (staff/менежерийн БүХ харилцан ярианы
// удирдлагын dashboard)-г шууд харж байсан. Энэ нь зөвхөн зохисгүй
// байдлаас гадна аюулгүй байдлын хувьд ч буруу (бусад хүний харилцан
// яриаг харах гэсэн UI). Одоо OwnerApp-д зориулсан ЭНЭ тусдаа, энгийн
// thread-only компонент ашиглагдана — owner зөвхөн ӨӨРИЙН СӨХ-тэй
// хийсэн харилцан ярианыхаа мессежүүдийг харж, шинэ зурвас бичиж болно.
//
// 2026-08-28: ОЛСОН 2 БОДИТ АЛДАА:
//  1) "dir" талбарын семантик буруу байсан — admin-ий Msgr.jsx-д
//     dir='out' гэдэг нь STAFF-ийн бичсэн зурвас, dir='in' гэдэг нь
//     OWNER-оос ирсэн зурвас гэсэн үг (staff-ийн үүднээс). Гэтэл энэ
//     компонент dir='out'-ыг "миний зурвас" (хвх, баруун) гэж буруу
//     үзүүлж байсан тул СИСАДМИНЫ бичсэн зурвас OWNER-ий өөрийнх шиг
//     харагдаж байв. Одоо dir='in' = OWNER-ий өөрийнх (хвх, баруун),
//     dir='out' = STAFF-ийнх (саарал, зүүн) гэж зассан.
//  2) Зурвасны цаг+огноог "YYYY.MM.DD HH:MM" форматтай, STAFF-ийн
//     зурвас дээр нэмээд ИЛГЭЭГЧИЙН РОЛИЙГ (жиш: "Сисадмин") үзүүлдэг
//     болгов (msgr_messages.agent багана — admin.Msgr.jsx-ээс илгээхдээ
//     бодит role-оор дүүргэдэг боллоо, Rule of two).
// 2026-08-28: Realtime — шинэ зурвас ирэхэд (staff бичихэд) хуудсыг
// дахин ачаалахгүйгээр шууд харагдана (Supabase postgres_changes).
//
// 2026-08-28 (2): Уламжлалт чат апп-ийн UX-руу шилжив — огноог зурвас
// бүр дээр давтахгүй, зүгээр огноо солигдох үед НЭГ л удаа (улаан
// давхаргатай дугуй тэмдэг, тврийн голд) үзүүлж, зурвас бүрийн доор
// зүгээр ЦАГ (HH:MM) л үлдэнэ. (Скриншот дээрх "Та" гэсэн мврүүд
// миний ЗАСВАРААС ӨМНӨ үүссэн хуучин тест дата — шинэ зурвас бүгд
// бодит role-оор (жиш "Менежер") зөв бичигдэнэ, доор Supabase дээр
// дахин баталгаажуулав.)
export default function OwnerMsgrThread({ hoaId }) {
  const { user } = useAuth();
  const [listId, setListId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [noOwnerRecord, setNoOwnerRecord] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  async function loadThread() {
    setLoading(true);
    setNoOwnerRecord(false);
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
    if (!ownerRow) { setNoOwnerRecord(true); setLoading(false); return; }

    let { data: listRow } = await supabase.from('msgr_list').select('id').eq('owner_id', ownerRow.id).eq('tenant_id', hoaId).order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!listRow) {
      const { data: created } = await supabase.from('msgr_list').insert({ tenant_id: hoaId, owner_id: ownerRow.id }).select('id').single();
      listRow = created;
    }
    if (!listRow) { setLoading(false); return; }
    setListId(listRow.id);
    // Admin.Msgr.jsx-ийн адил, owner харилцан ярианы хуудсаа НЭЭХЭД
    // (унших үед) өврийн уншаагүй тоог 0 болгоно.
    supabase.from('msgr_list').update({ owner_unread_count: 0 }).eq('id', listRow.id).then(({ error }) => { if (error) console.error('owner unread reset алдаа:', error); });

    const { data: msgs } = await supabase.from('msgr_messages').select('*').eq('list_id', listRow.id).order('created_at', { ascending: true });
    setMessages(msgs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!hoaId || !user?.id) return;
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId, user?.id]);

  useEffect(() => {
    // RLS нь msgr_messages-ийг зөвхөн ӨӨРИЙН list_id-д хамаарах мврөөр
    // хязгаарладаг тул postgres_changes бодит realtime мвр (staff бичсэн)
    // ЭНД шууд дуудагдана.
    if (!listId) return;
    const channel = supabase
      .channel(`owner-msgr-${listId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'msgr_messages', filter: `list_id=eq.${listId}` }, (payload) => {
        setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [listId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!draft.trim() || !listId) return;
    setSending(true);
    const { data, error } = await supabase.from('msgr_messages').insert({
      list_id: listId, tenant_id: hoaId, dir: 'in', body: draft.trim(),
    }).select().single();
    setSending(false);
    if (error) { alert(error.message); return; }
    setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
    setDraft('');
    // 2026-08-30: Илгээсний дараа талбарыг анхны (1 мврийн) өндөрт нь
    // буцаана — доор auto-grow-той хамт ажиллана.
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  // 2026-08-30: Хэрэглэгчийн хүсэлт — текст 1 мөрөөс урт болоход
  // бичих талбар ГАНЦ мөр хэвээрээ үлддэг байсныг засав. textarea-ийн
  // scrollHeight-аар нь уян хатан (auto-grow) вндэртэй болгоно, дээд
  // тал нь 90px (доорх maxHeight-тай яг тохирно) хүртэл.
  function autoGrowTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`;
  }

  function dateKey(m) {
    const d = new Date(m.created_at);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatMsgMeta(m) {
    const d = new Date(m.created_at);
    const stamp = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    // dir='out' = STAFF-ийн зурвас — тэдний role-ийг (agent) хамт үзүүлнэ.
    return m.dir === 'out' && m.agent ? `${stamp}, ${m.agent}` : stamp;
  }

  if (loading) return <div className="pool-empty">Ачаалж байна...</div>;

  if (noOwnerRecord) {
    return (
      <div>
        <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
          <div className="content-page-title">Мессенжер</div>
        </div>
        <div className="pool-empty">
          Таны сууц өмчлөгчийн бүртгэл дутуу тул мессенжер ашиглах боломжгүй байна. СӨХ-ийн ажилтантай холбогдож бүртгэлээ бүрдүүлнэ vv.
        </div>
      </div>
    );
  }

  // 2026-08-27: Мессенжерийн bubble-үүд ЗОРИУДААР Профайл→Интерфейс-ийн
  // custom карт-тохиргоог (--card-bg-computed г.м) АШИГЛАХГүй — хэн
  // ямар мессеж бичсэнийг ялгах өнгө (өөрийн/бусдын) утга учиртай тул
  // хэрэглэгчийн сонгосон үзэмжээс үл хамааран тогтмол үлдэнэ.
  // 2026-08-28 ОЛСОН БОДИТ АЛДАА: "calc(100vh - 190px)" гэсэн ХАТУУ
  // ТООН тооцоолол дэлгэцийг өндөр өөрчлөх бүрд буруу гарч, контент
  // viewport-оос гадуур гардаг байсан. Одоо .app-shell/.content-body
  // (userapp.css) үүргүй дэлгэцийг үнэмлэхүй хязгаарлаж, дотор нь л
  // scroll хийдэг болсон тул зүгээр "100%" ашиглаж болно.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Мессенжер</div>
      </div>

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
        {messages.length === 0 && (
          <div className="pool-empty">СӨХ-ийн ажилтантай холбогдохын тулд доор зурвас бичнэ vv.</div>
        )}
        {messages.map((m, i) => {
          const isMine = m.dir === 'in'; // 2026-08-28: засагдсан семантик
          const showDivider = i === 0 || dateKey(m) !== dateKey(messages[i - 1]);
          return (
            <div key={m.id}>
              {showDivider && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 6px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8, padding: '3px 10px',
                  }}>{dateKey(m)}</span>
                </div>
              )}
              {/* 2026-08-30 ОЛСОН БОДИТ АЛДАА: зай (space) огт үгүй
                  урт текст (жиш тест мэдээллүүд) bubble-ийг "78%"
                  хязгаараас илүү өргөн болгож, үүнээс үүдэн
                  эх контейнер horizontal overflow үүсгэж, доод
                  мессеж бичих талбарыг шахдаг байв. Одоо
                  word-break/overflow-wrap нэмж, ямар ч урт зайгүй
                  текст ч гэсэн bubble-ийн хүрээнээс хэзээ ч
                  гарахгүй. */}
              <div style={{ display: 'flex', alignSelf: isMine ? 'flex-end' : 'flex-start', justifyContent: isMine ? 'flex-end' : 'flex-start', minWidth: 0 }}>
                <div style={{ maxWidth: '78%', minWidth: 0 }}>
                  <div
                    style={{
                      borderRadius: 14,
                      padding: '9px 13px',
                      fontSize: 13,
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'var(--text-primary)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {m.body}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{formatMsgMeta(m)}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20, padding: '8px 14px',
        }}>
          <textarea
            ref={textareaRef}
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.4, maxHeight: 90, overflowY: 'auto' }}
            value={draft} onChange={(e) => { setDraft(e.target.value); autoGrowTextarea(e.target); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Мессеж бичих..."
          />
        </div>
        <button
          onClick={send} disabled={sending}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: '#3b82f6', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer',
          }}
          aria-label="Илгээх"
        >
          <SendIcon width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
