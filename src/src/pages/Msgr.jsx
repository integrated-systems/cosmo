import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatUnitCode } from '../lib/ownersFormat';
import { formatDateTime } from '../lib/format';
import OwnerInfoModal from '../components/OwnerInfoModal';
import { SearchIcon, ClipIcon, PhoneCallIcon, InfoCircleIcon, SendIcon, CheckDoubleIcon, PinIcon, BellOffIcon, AlertTriangleIcon } from '../components/icons/Icons';

// "Мессенжер" (/msgr) — Viber дизайн/логиктой, Cosmo стайлтай
// чат-маягийн харилцагчийн үйлчилгээний хуудас.
//
// 2026-08-19 (5-р засвар): олон дутуу үйлдлийг ажилд оруулав —
// (1) Хайлтын талбар одоо ТЕНАНТ-ийн БүХ өмчлөгчдийг (msgr_list мвр
//     байгаа эсэхээс үл хамааран) нэрээр/тоотоор шүүж, сонгосон үед
//     байхгүй бол шинэ msgr_list мвр үүсгэж шууд нээнэ.
// (2) Info товч (Дуудлага-ийн хажууд) idэвхжиж, OwnerInfoModal-ыг
//     дуудна (Rule of two — Owners.jsx-ийн модалийг дахин ашиглав).
// (3) Хавчаарны товч бодитоор ажиллаж, "msgr-attachments" bucket руу
//     upload хийж, мессежинд хавсралт болгож хадгална.
// (4) Хавчаарны icon 2 дахин томорсон (9px -> 18px).
// (5) Light/Dark mode хоёулаа зввгүй харагдахаар бүх өнгвний класс
//     light+dark хосоор бичигдэв (өмнв нь зүгээр dark-only токен
//     ашигласан тул Light mode үед вnгв гажиж байсан).
// (6) OwnerInfoModal-ийн "Мессенжер" товчноос ?list=<id> query param-аар
//     ирэхэд тухайн харилцан ярианд шууд шилждэг боллоо.
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
            : 'bg-white dark:bg-sidebg border border-slate-200 dark:border-bordercol text-slate-900 dark:text-text rounded-tl-[4px] rounded-tr-2xl rounded-br-2xl rounded-bl-2xl'
        }`}
      >
        {msg.attachment_url && (
          <a
            href={msg.attachment_url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-1.5 text-[12px] underline mb-1 ${isOut ? 'text-white' : 'text-customBlue'}`}
          >
            <ClipIcon width={12} height={12} />
            {msg.attachment_name || 'Хавсралт'}
          </a>
        )}
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
          : 'border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-inputbg text-slate-500 dark:text-mutedtext hover:text-slate-900 dark:hover:text-white hover:border-customBlue'
      }`}
    >
      {children}
    </button>
  );
}

export default function Msgr() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [allOwners, setAllOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [tab, setTab] = useState('all');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [infoOwner, setInfoOwner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);

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

    // Жагсаалт дахь харилцан яриа бүрийн СүүЛИЙН мессежийн товч агуулгыг
    // (жагсаалтын мвр доторх preview текст) харуулахын тулд tenant-ийн
    // бүх мессежийг үүсгэсэн цагаар нь эрэмбэлж татаад, list_id тус
    // бүрийн ХАМГИЙН СүүЛчийн мессежийг барьж авна (өсөх дараалалтай
    // тул сүүлд ирсэн нь map-д "ялна").
    const { data: allMsgs, error: msgsError } = await fetchAllRows(() =>
      supabase.from('msgr_messages').select('list_id,dir,body,agent,created_at').eq('tenant_id', hoaId).order('created_at', { ascending: true })
    );
    if (msgsError) window.alert(msgsError.message);
    const lastMsgByList = new Map();
    (allMsgs ?? []).forEach((m) => lastMsgByList.set(m.list_id, m));

    const mapped = (data ?? []).map((row) => {
      const o = row.owners;
      const name = o ? `${o.firstname || ''} ${o.lastname || ''}`.trim() : 'Тодорхойгүй';
      const unit = o ? formatUnitCode(o.building_no, null, o.floor, null, o.door_no) : '';
      return {
        id: row.id, ownerId: row.owner_id, name, unit,
        pinned: row.pinned, muted: row.muted, urgent: row.urgent, unread: row.unread_count,
        lastMessage: lastMsgByList.get(row.id) || null,
      };
    });
    setConversations(mapped);
    setLoading(false);

    const listParam = searchParams.get('list');
    if (listParam && mapped.some((c) => c.id === listParam)) {
      selectConversation(listParam);
      searchParams.delete('list');
      setSearchParams(searchParams, { replace: true });
    } else if (mapped.length && activeId === null) {
      selectConversation(mapped[0].id);
    }
  }

  // Хайлтын талбарт ТЕНАНТ-ийн БүХ өмчлөгчийг (msgr_list мвр байгаа эсэхээс
  // үл хамааран) харуулахын тулд owners жагсаалтыг тусад нь урьдчилан ачаална.
  async function loadAllOwners() {
    const { data } = await fetchAllRows(() =>
      supabase.from('owners').select('id,firstname,lastname,building_no,floor,door_no').eq('tenant_id', hoaId)
    );
    setAllOwners(data ?? []);
  }

  useEffect(() => {
    loadConversations();
    loadAllOwners();
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
    setConversations((cs) => {
      const conv = cs.find((c) => c.id === id);
      if (conv && conv.unread > 0) {
        supabase.from('msgr_list').update({ unread_count: 0 }).eq('id', id);
        return cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c));
      }
      return cs;
    });
  }

  // Хайлтаас өмчлөгч сонгоход: тухайн өмчлөгчид msgr_list мвр байгаа
  // эсэхийг шалгаж, байхгүй бол шинээр үүсгээд шууд сонгож нээнэ.
  async function selectOwnerFromSearch(owner) {
    setSearch('');
    setSearchFocused(false);
    const existing = conversations.find((c) => c.ownerId === owner.id);
    if (existing) { selectConversation(existing.id); return; }
    const { data: created, error } = await supabase
      .from('msgr_list').insert({ tenant_id: hoaId, owner_id: owner.id }).select('id').single();
    if (error) { window.alert(error.message); return; }
    await loadConversations();
    selectConversation(created.id);
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

  // "msgr-attachments" bucket-ийн {tenant_id}/{list_id}/{цаг}-{файл нэр}
  // зам руу upload хийж, олон нийтэд нээлттэй URL-ыг мессеж болгож бичнэ.
  async function handleAttachFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeId) return;
    setUploading(true);
    const path = `${hoaId}/${activeId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('msgr-attachments').upload(path, file);
    if (upErr) { window.alert(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from('msgr-attachments').getPublicUrl(path);
    const { data, error } = await supabase
      .from('msgr_messages')
      .insert({
        list_id: activeId, tenant_id: hoaId, dir: 'out', body: '', agent: 'Та', read: true,
        attachment_url: pub.publicUrl, attachment_name: file.name,
      })
      .select()
      .single();
    setUploading(false);
    if (error) { window.alert(error.message); return; }
    setMessages((ms) => [...ms, data]);
    await supabase.from('msgr_list').update({ updated_at: new Date().toISOString() }).eq('id', activeId);
  }

  async function openInfo() {
    if (!active?.ownerId) return;
    const { data, error } = await supabase.from('owners').select('*').eq('id', active.ownerId).single();
    if (error) { window.alert(error.message); return; }
    setInfoOwner(data);
  }

  const visibleConversations = conversations.filter((c) => {
    if (tab === 'unread') return c.unread > 0;
    if (tab === 'muted') return c.muted;
    if (tab === 'urgent') return c.urgent;
    return true;
  });
  const pinnedConversations = visibleConversations.filter((c) => c.pinned);
  const restConversations = visibleConversations.filter((c) => !c.pinned);

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? allOwners
        .filter((o) => {
          const name = `${o.firstname || ''} ${o.lastname || ''}`.toLowerCase();
          const unit = formatUnitCode(o.building_no, null, o.floor, null, o.door_no).toLowerCase();
          return name.includes(q) || unit.includes(q) || unit.replace(/\s/g, '').includes(q.replace(/\s/g, ''));
        })
        .slice(0, 30)
    : [];

  function renderConvItem(c) {
    const isActive = c.id === activeId;
    const preview = c.lastMessage
      ? `${c.lastMessage.dir === 'out' ? 'Та: ' : ''}${c.lastMessage.body || (c.lastMessage.attachment_name ? `📎 ${c.lastMessage.attachment_name}` : '')}`
      : '';
    return (
      <div
        key={c.id}
        onClick={() => selectConversation(c.id)}
        className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer border-l-2 ${
          isActive ? 'bg-customBlue/10 border-l-customBlue' : 'border-l-transparent hover:bg-slate-100 dark:hover:bg-white/[0.03]'
        }`}
      >
        <div className="relative w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0" style={{ background: colorFor(c.id) }}>
          {initials(c.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{c.name}</span>
            {c.lastMessage && <span className="text-[10.5px] text-slate-400 dark:text-darktext shrink-0">{formatTime(c.lastMessage.created_at)}</span>}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[12px] text-slate-500 dark:text-mutedtext truncate">{preview || c.unit}</span>
            {c.unread > 0 ? (
              <span className="min-w-[18px] h-[18px] rounded-full bg-customBlue text-white text-[10.5px] font-bold flex items-center justify-center px-1 shrink-0">{c.unread}</span>
            ) : (
              <span className="text-[10px] text-slate-500 dark:text-mutedtext bg-slate-100 dark:bg-inputbg border border-slate-200 dark:border-bordercol rounded px-1.5 py-px shrink-0">{c.unit}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2026-08-19: зүвхүн ЭНЭ хуудсанд зориулсан тусгайлсан засвар — footer
  // (App.jsx) огт хөндөгдөөгүй, зүгээр картын үндрийг container-ийн
  // бодит хэмжээст (Topbar 50px + p-2.5 10px+10px) яг тааруулж
  // нарийвчлан тооцоолов.
  return (
    <div className="ds-card p-0 flex overflow-hidden" style={{ height: 'calc(100vh - 70px)' }}>
      {/* ===== Зүүн тал: харилцан яриа жагсаалт ===== */}
      <div className="w-[300px] shrink-0 bg-slate-50 dark:bg-sidebg border-r border-slate-200 dark:border-bordercol flex flex-col">
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <SearchIcon className="w-3.5 h-3.5 text-slate-400 dark:text-darktext absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Хайх (нэр, тоот)..."
              className="ds-input w-full pl-8 text-[13px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            />
            {searchFocused && q && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white dark:bg-sidebg border border-slate-200 dark:border-bordercol rounded-lg shadow-lg p-1">
                {searchResults.length === 0 && (
                  <div className="text-[12px] text-slate-400 dark:text-mutedtext px-2 py-2">Илэрц олдсонгүй</div>
                )}
                {searchResults.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onMouseDown={() => selectOwnerFromSearch(o)}
                    className="block w-full text-left px-2 py-1.5 text-[12px] rounded hover:bg-slate-100 dark:hover:bg-appbg text-slate-900 dark:text-white"
                  >
                    {o.firstname} {o.lastname}
                    <span className="text-slate-400 dark:text-mutedtext ml-1.5">{formatUnitCode(o.building_no, null, o.floor, null, o.door_no)}</span>
                  </button>
                ))}
              </div>
            )}
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
                  : 'border-transparent text-slate-500 dark:text-mutedtext hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {loading && <div className="text-center text-slate-400 dark:text-darktext text-sm py-8">Ачаалж байна...</div>}
          {!loading && visibleConversations.length === 0 && (
            <div className="text-center text-slate-400 dark:text-darktext text-sm py-8">Харилцан яриа алга</div>
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
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-appbg">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-darktext text-sm">Харилцан яриа сонгоно уу</div>
        ) : (
          <>
            <div className="h-[60px] shrink-0 flex items-center justify-between px-5 border-b border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: colorFor(active.id) }}>
                  {initials(active.name)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{active.name} — {active.unit}</div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <ToggleIconButton active={active.pinned} onClick={() => toggleFlag('pinned')} title="Pin" activeColorClass="border-slate-400 dark:border-mutedtext text-slate-600 dark:text-mutedtext">
                  <PinIcon />
                </ToggleIconButton>
                <ToggleIconButton active={active.muted} onClick={() => toggleFlag('muted')} title="Mute" activeColorClass="border-slate-400 dark:border-mutedtext text-slate-600 dark:text-mutedtext">
                  <BellOffIcon />
                </ToggleIconButton>
                <ToggleIconButton active={active.urgent} onClick={() => toggleFlag('urgent')} title="Urgent" activeColorClass="border-customRed text-customRed">
                  <AlertTriangleIcon />
                </ToggleIconButton>
                <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-inputbg flex items-center justify-center text-slate-500 dark:text-mutedtext hover:text-slate-900 dark:hover:text-white hover:border-customBlue" title="Дуудлага">
                  <PhoneCallIcon />
                </button>
                <button onClick={openInfo} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-inputbg flex items-center justify-center text-slate-500 dark:text-mutedtext hover:text-slate-900 dark:hover:text-white hover:border-customBlue" title="Хэрэглэгчийн мэдээлэл">
                  <InfoCircleIcon />
                </button>
              </div>
            </div>

            <div
              ref={messagesRef}
              className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-0.5"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(120,120,120,0.06) 1px, transparent 0)', backgroundSize: '22px 22px' }}
            >
              {messagesLoading && <div className="text-center text-slate-400 dark:text-darktext text-sm py-8">Ачаалж байна...</div>}
              {!messagesLoading && messages.map((m) => <Bubble key={m.id} msg={m} />)}
            </div>

            <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg flex items-end gap-2">
              <div className="flex-1 bg-white dark:bg-inputbg border border-slate-200 dark:border-bordercol rounded-[20px] px-3.5 py-2 flex items-center gap-2">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Мессеж бичих..."
                  className="flex-1 bg-transparent border-none outline-none resize-none text-slate-900 dark:text-text text-[13px] leading-[1.4] max-h-[90px]"
                />
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttachFile} />
                {/* Хавчаарны icon 2 дахин томорсон (9px -> 18px). */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-slate-400 dark:text-mutedtext hover:text-customBlue shrink-0"
                  title="Хавсралт хавсаргах"
                >
                  <ClipIcon width={18} height={18} />
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

      <OwnerInfoModal owner={infoOwner} onClose={() => setInfoOwner(null)} onEdit={() => setInfoOwner(null)} />
    </div>
  );
}
