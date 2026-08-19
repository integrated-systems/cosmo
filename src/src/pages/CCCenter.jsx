import { useEffect, useRef, useState } from 'react';
import { SearchIcon, ClipIcon, PhoneCallIcon, InfoCircleIcon, SendIcon, CheckDoubleIcon, PinIcon, BellOffIcon, AlertTriangleIcon } from '../components/icons/Icons';

// "CC center" (/cccenter) — Viber дизайн/логиктой, Cosmo стайлтай
// чат-маягийн харилцагчийн үйлчилгээний хуудас.
//
// 2026-08-19 (3-р засвар): таб мврийг Англи нэртэй (All/Unread/Muted/
// Urgent) болгов; илгээсэн мессежийн цагийн мврийн зүүн талд ХЭН
// ажилтан хариулсаныг ("agent") харуулна; толгойд Pin/Mute/Urgent
// toggle товч нэмэв (Дуудлага/Мэдээлэл товчны зүүн тал, ижил дизайн).
//
// TODO: backend (Supabase харилцан яриа/мессежийн хүснэгэл) хараахан
// үүсээгүй тул одоогоор зүгээр EXAMPLE_CONVERSATIONS локал жишээ дата
// (техникийн баримт бичгийн дүрэм 6).
const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef5555', '#0a428f'];

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
function colorFor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const EXAMPLE_CONVERSATIONS = [
  {
    id: 0, name: 'Батаа Дорж', unit: '101 2101', unread: 2, online: true, muted: false, urgent: false, pinned: true,
    messages: [
      { dir: 'in', text: 'Сайн байна уу, манай гэрийн халаалт муу байна', t: '09:14' },
      { dir: 'in', text: 'Хэзээ үзүүлж болох вэ?', t: '09:14' },
      { dir: 'out', text: 'Сайн байна уу. Мэдээллийг хүлээж авлаа, инженерийг өнөөдөр 14:00 цагт илгээе.', t: '09:20', read: true, agent: 'Б.Ганцэцэг' },
      { dir: 'in', text: 'Баярлалаа', t: '09:21' },
    ],
  },
  {
    id: 1, name: 'Сарантуяа Бат', unit: '102 0405', unread: 0, online: true, muted: false, urgent: false, pinned: false,
    messages: [
      { dir: 'in', text: 'Зогсоолын карт идэвхжүүлэх боломжтой юу?', t: 'Өчигдөр' },
      { dir: 'out', text: 'Тийм ээ, CC center-т ирж бүрдүүлэлт үзүүлэхэд л болно.', t: 'Өчигдөр', read: true, agent: 'Н.Ариунаа' },
      { dir: 'in', text: 'Ойлголоо, маргааш очно', t: 'Өчигдөр' },
      { dir: 'out', text: 'Хүлээж байна 🙂', t: 'Өчигдөр', read: true, agent: 'Н.Ариунаа' },
    ],
  },
  {
    id: 2, name: 'Ганбат Эрдэнэ', unit: '103 1502', unread: 0, online: false, muted: true, urgent: false, pinned: false,
    messages: [
      { dir: 'in', text: 'Төлбөрийн баримт авах боломжтой юу?', t: '10 сарын 8' },
      { dir: 'out', text: 'Мэйлээр илгээе, имэйл хаягаа бичнэ үү', t: '10 сарын 8', read: true, agent: 'Б.Ганцэцэг' },
    ],
  },
  {
    id: 3, name: 'Оюунчимэг Пүрэв', unit: '105 0803', unread: 5, online: true, muted: false, urgent: true, pinned: false,
    messages: [
      { dir: 'in', text: 'Лифт удаан хугацаагаар засварт байна', t: '08:40' },
      { dir: 'in', text: 'Хэдэн хоног үргэлжлэх вэ?', t: '08:41' },
      { dir: 'in', text: 'Хүүхэдтэй гэр бүл дээвэрт хүрэхэд хэцүү байна', t: '08:41' },
      { dir: 'in', text: 'Хариу яагаад үгүй байна?', t: '09:02' },
      { dir: 'in', text: '???', t: '09:15' },
    ],
  },
  {
    id: 4, name: 'Мөнхжаргал Т.', unit: '108 1204', unread: 0, online: false, muted: false, urgent: false, pinned: false,
    messages: [
      { dir: 'out', text: 'Төлбөрийн сануулга: 8-р сарын 25-нд төлбөр төлөгдөх ёстой.', t: '2 хоногийн өмнө', read: true, agent: 'Д.Батжаргал' },
      { dir: 'in', text: 'Ойлголоо, баярлалаа', t: '2 хоногийн өмнө' },
    ],
  },
  {
    id: 5, name: 'Нарантуяа Ж.', unit: '112 1901', unread: 1, online: true, muted: false, urgent: false, pinned: false,
    messages: [
      { dir: 'in', text: 'Агуулах захиалах хүсэлт явуулсан, хүлээгдэж байна', t: '11:02' },
    ],
  },
];

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'muted', label: 'Muted' },
  { key: 'urgent', label: 'Urgent' },
];

function Bubble({ msg }) {
  const isOut = msg.dir === 'out';
  return (
    <div className={`flex my-[3px] max-w-[68%] ${isOut ? 'self-end' : 'self-start'}`}>
      <div
        className={`px-3 py-2 text-[13px] leading-[1.45] shadow-sm ${
          isOut
            ? 'bg-customBlue text-white rounded-tl-2xl rounded-tr-[4px] rounded-br-2xl rounded-bl-2xl'
            : 'bg-sidebg border border-bordercol text-text rounded-tl-[4px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl'
        }`}
      >
        {msg.text}
        <div className={`flex items-center gap-1.5 mt-[3px] ${isOut && msg.agent ? 'justify-between' : 'justify-end'}`}>
          {isOut && msg.agent && <span className="text-[10px] opacity-70 font-medium">{msg.agent}</span>}
          <span className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] opacity-70">{msg.t}</span>
            {isOut && <CheckDoubleIcon width={13} height={13} className="opacity-85" />}
          </span>
        </div>
      </div>
    </div>
  );
}

function ToggleIconButton({ active, onClick, title, activeColorClass, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
        active
          ? `${activeColorClass} bg-opacity-10`
          : 'border-bordercol bg-inputbg text-mutedtext hover:text-white hover:border-customBlue'
      }`}
    >
      {children}
    </button>
  );
}

export default function CCCenter() {
  const [conversations, setConversations] = useState(EXAMPLE_CONVERSATIONS);
  const [activeId, setActiveId] = useState(0);
  const [tab, setTab] = useState('all');
  const [draft, setDraft] = useState('');
  const messagesRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [active?.messages.length, activeId]);

  function selectConversation(id) {
    setActiveId(id);
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  function toggleFlag(field) {
    setConversations((cs) => cs.map((c) => (c.id === activeId ? { ...c, [field]: !c[field] } : c)));
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setConversations((cs) => cs.map((c) => (
      c.id === activeId ? { ...c, messages: [...c.messages, { dir: 'out', text, t, read: false, agent: 'Та' }] } : c
    )));
    setDraft('');
  }

  const visibleConversations = conversations.filter((c) => {
    if (tab === 'unread') return c.unread > 0;
    if (tab === 'muted') return c.muted;
    if (tab === 'urgent') return c.urgent;
    return true;
  });

  return (
    <div className="ds-card p-0 flex overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
      {/* ===== Зүүн тал: харилцан яриа жагсаалт ===== */}
      <div className="w-[300px] shrink-0 bg-sidebg border-r border-bordercol flex flex-col">
        <div className="flex gap-1 px-3 pt-3 pb-2 border-b border-bordercol">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-[11.5px] px-2.5 py-1 rounded-full border ${
                tab === t.key
                  ? 'bg-customBlue/10 text-customBlue border-customBlue/30'
                  : 'border-transparent text-mutedtext hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <SearchIcon className="w-3.5 h-3.5 text-darktext absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Хайх (нэр, тоот)..."
              className="ds-input w-full pl-8 text-[13px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {visibleConversations.map((c) => {
            const last = c.messages[c.messages.length - 1];
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer border-l-2 ${
                  isActive ? 'bg-customBlue/10 border-l-customBlue' : 'border-l-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className="relative w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0" style={{ background: colorFor(c.id) }}>
                  {initials(c.name)}
                  {c.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-customGreen" style={{ border: `2px solid ${isActive ? 'rgba(59,130,246,0.08)' : '#070d1d'}` }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold text-white truncate flex items-center gap-1">
                      {c.pinned && <PinIcon width={11} height={11} className="text-customOrange shrink-0" />}
                      {c.name}
                    </span>
                    <span className="text-[10.5px] text-darktext shrink-0">{last.t}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[12px] text-mutedtext truncate">
                      {last.dir === 'out' && <span className="text-darktext">Та: </span>}
                      {last.text}
                    </span>
                    {c.unread > 0 ? (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-customBlue text-white text-[10.5px] font-bold flex items-center justify-center px-1 shrink-0">{c.unread}</span>
                    ) : (
                      <span className="text-[10px] text-mutedtext bg-inputbg border border-bordercol rounded px-1.5 py-px shrink-0">{c.unit}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Баруун тал: чат цонх ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-[60px] shrink-0 flex items-center justify-between px-5 border-b border-bordercol bg-sidebg">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: colorFor(active.id) }}>
              {initials(active.name)}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{active.name} — {active.unit}</div>
              <div className={`text-[11px] ${active.online ? 'text-customGreen' : 'text-darktext'}`}>
                {active.online ? 'Онлайн' : 'Сүүлд идэвхтэй байсан: өчигдөр'}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <ToggleIconButton active={active.pinned} onClick={() => toggleFlag('pinned')} title="Pin" activeColorClass="border-customOrange text-customOrange">
              <PinIcon />
            </ToggleIconButton>
            <ToggleIconButton active={active.muted} onClick={() => toggleFlag('muted')} title="Mute" activeColorClass="border-mutedtext text-mutedtext">
              <BellOffIcon />
            </ToggleIconButton>
            <ToggleIconButton active={active.urgent} onClick={() => toggleFlag('urgent')} title="Urgent" activeColorClass="border-customRed text-customRed">
              <AlertTriangleIcon />
            </ToggleIconButton>
            <button className="w-8 h-8 rounded-lg border border-bordercol bg-inputbg flex items-center justify-center text-mutedtext hover:text-white hover:border-customBlue" title="Дуудлага">
              <PhoneCallIcon />
            </button>
            <button className="w-8 h-8 rounded-lg border border-bordercol bg-inputbg flex items-center justify-center text-mutedtext hover:text-white hover:border-customBlue" title="Хэрэглэгчийн мэдээлэл">
              <InfoCircleIcon />
            </button>
          </div>
        </div>

        <div
          ref={messagesRef}
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-0.5"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)', backgroundSize: '22px 22px' }}
        >
          <div className="text-center my-3">
            <span className="bg-sidebg border border-bordercol rounded-full px-3 py-1 text-[11px] text-darktext">Өнөөдөр</span>
          </div>
          {active.messages.map((m, i) => <Bubble key={i} msg={m} />)}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-bordercol bg-sidebg flex items-end gap-2">
          <div className="flex-1 bg-inputbg border border-bordercol rounded-[20px] px-3.5 py-2 flex items-center gap-2">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Мессеж бичих..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-text text-[13px] leading-[1.4] max-h-[90px]"
            />
            {/* Хавчаарны icon мессеж бичих талбарын ДОТОР баруун талд, 65%
                (жиш 14px*0.65≈9px) жижигрүүлсэн хэмжээтэй. */}
            <button className="text-mutedtext hover:text-customBlue shrink-0" title="Хавсралт хавсаргах">
              <ClipIcon width={9} height={9} />
            </button>
          </div>
          <button
            onClick={sendMessage}
            className="w-9 h-9 rounded-full bg-customBlue text-white flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
            title="Илгээх"
          >
            <SendIcon width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
