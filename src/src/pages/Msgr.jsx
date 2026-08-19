import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatUnitCode } from '../lib/ownersFormat';
import { formatDateTime } from '../lib/format';
import { SearchIcon, ClipIcon, PhoneCallIcon, InfoCircleIcon, SendIcon, CheckDoubleIcon, PinIcon, BellOffIcon, AlertTriangleIcon } from '../components/icons/Icons';

// "Мессенжер" (/msgr) — Viber дизайн/логиктой, Cosmo стайлтай
// чат-маягийн харилцагчийн үйлчилгээний хуудас.
//
// 2026-08-19 (4-р засвар): Supabase "msgr_list"(харилцагч тус бүрийн
// pinned/muted/urgent/unread_count) + "msgr_messages"(мессеж бүр)
// хүснэгэлтэй холбогдов — EXAMPLE_CONVERSATIONS локал жишээ дата
// арилав. "Хүннү 2222 Резиденс" tenant-д 6 тест харилцан яриа
// (owners-той холбогдсон) орсон.
const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef5555', '#0a428f'];

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
function colorFor(id) {
  return AVATAR_COLORS[Math.abs(hashCode(id)) % AVATAR_COLORS.length];
}
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'muted', label: 'Muted' },
  { key: 'urgent', label: 'Urgent' },
];

function formatTime(iso) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return formatDateTime(iso).split(' ')[0];
}

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
        {msg.body}
        <div className={`flex items-center gap-1.5 mt-[3px] ${isOut && msg.agent ? 'justify-between' : 'justify-end'}`}>
          {isOut && msg.agent && <span className="text-[10px] opacity-70 font-medium">{msg.agent}</span>}
          <span className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] opacity-70">{formatTime(msg.created_at)}</span>
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

export default function Msgr() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [tab, setTab] = useState('all');
  const [draft, setDraft] = useState('');
  const messagesRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId);

  async function loadConversations() {
    setLoading(true);
    const { data, error } = await fetchAllRows(() =>
      supabase
        .from('msgr_list')
        .select('*, owners(firstname,lastname,building_no,floor,door_no)')
        .eq('tenant_id', hoaId)
        .order('updated_at', { ascending: false })
    );
    if (error) { window.alert(error.message); setLoading(false); return; }
    const mapped = (data ?? []).map((row) => {
      const o = row.owners;
      const name = o ? `${o.firstname || ''} ${o.lastname || ''}`.trim() : 'Тодорхойгүй';
      const unit = o ? formatUnitCode(o.building_no, null, o.floor, null, o.door_no) : '';
      return {
        id: row.id, ownerId: row.owner_id, name, unit,
        pinned: row.pinned, muted: row.muted, urgent: row.urgent, unread: row.unread_count,
      };
    });
    setConversations(mapped);
    setLoading(false);
    if (mapped.length && activeId === null) selectConversation(mapped[0].id);
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages.length, activeId]);

  async function loadMessages(listId) {
    setMessagesLoading(true);
    const { data, error } = await fetchAllRows(() =>
      supabase.from('msgr_messages').select('*').eq('list_id', listId).order('created_at', { ascending: true })
    );
    if (error) { window.alert(error.message); setMessagesLoading(false); return; }
    setMessages(data ?? []);
    setMessagesLoading(false);
  }

  async function selectConversation(id) {
    setActiveId(id);
    loadMessages(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.unread > 0) {
      setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
      await supabase.from('msgr_list').update({ unread_count: 0 }).eq('id', id);
    }
  }

  async function toggleFlag(field) {
    const newVal = !active[field];
    setConversations((cs) => cs.map((c) => (c.id === activeId ? { ...c, [field]: newVal } : c)));
    const { error } = await supabase.from('msgr_list').update({ [field]: newVal }).eq('id', activeId);
    if (error) window.alert(error.message);
  }

  async function sendMessage() {
    const body = draft.trim();
    if (!body || !activeId) return;
    setDraft('');
    const { data, error } = await supabase
      .from('msgr_messages')
      .insert({ list_id: activeId, tenant_id: hoaId, dir: 'out', body, agent: 'Та', read: true })
      .select()
      .single();
    if (error) { window.alert(error.message); return; }
    setMessages((ms) => [...ms, data]);
    await supabase.from('msgr_list').update({ updated_at: new Date().toISOString() }).eq('id', activeId);
  }

  const visibleConversations = conversations.filter((c) => {
    if (tab === 'unread') return c.unread > 0;
    if (tab === 'muted') return c.muted;
    if (tab === 'urgent') return c.urgent;
    return true;
  });
  // Pin хийсэн харилцан яриаг жагсаалтын ЭХЭНД тусдаа бүлэг болгож,
  // доогуур нь 1px customBlue нарийхан зураасаар ердийн жагсаалтаас
  // тусгаарлана (стандарт UI загвар).
  const pinnedConversations = visibleConversations.filter((c) => c.pinned);
  const restConversations = visibleConversations.filter((c) => !c.pinned);

  function renderConvItem(c) {
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
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-white truncate">{c.name}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[10px] text-mutedtext bg-inputbg border border-bordercol rounded px-1.5 py-px shrink-0">{c.unit}</span>
            {c.unread > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-customBlue text-white text-[10.5px] font-bold flex items-center justify-center px-1 shrink-0">{c.unread}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-card p-0 flex overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
      {/* ===== Зүүн тал: харилцан яриа жагсаалт ===== */}
      <div className="w-[300px] shrink-0 bg-sidebg border-r border-bordercol flex flex-col">
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

        <div className="flex gap-1 px-3 pt-2.5 pb-2">
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

        <div className="flex-1 overflow-y-auto py-1.5">
          {loading && <div className="text-center text-darktext text-sm py-8">Ачаалж байна...</div>}
          {!loading && visibleConversations.length === 0 && (
            <div className="text-center text-darktext text-sm py-8">Харилцан яриа алга</div>
          )}
          {!loading && pinnedConversations.length > 0 && (
            <>
              {pinnedConversations.map((c) => renderConvItem(c))}
              <div className="h-px bg-customBlue ml-[18px] mr-4 my-1.5" />
            </>
          )}
          {!loading && restConversations.map((c) => renderConvItem(c))}
        </div>
      </div>

      {/* ===== Баруун тал: чат цонх ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-darktext text-sm">Харилцан яриа сонгоно уу</div>
        ) : (
          <>
            <div className="h-[60px] shrink-0 flex items-center justify-between px-5 border-b border-bordercol bg-sidebg">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: colorFor(active.id) }}>
                  {initials(active.name)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{active.name} — {active.unit}</div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <ToggleIconButton active={active.pinned} onClick={() => toggleFlag('pinned')} title="Pin" activeColorClass="border-mutedtext text-mutedtext">
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
              {messagesLoading && <div className="text-center text-darktext text-sm py-8">Ачаалж байна...</div>}
              {!messagesLoading && messages.map((m) => <Bubble key={m.id} msg={m} />)}
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
          </>
        )}
      </div>
    </div>
  );
}
