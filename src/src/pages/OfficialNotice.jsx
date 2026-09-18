import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { extractGridItemUuid } from '../lib/spotVehicleFormat';
import { fetchAllRows } from '../lib/fetchAllRows';
import TabButton from '../components/TabButton';

// 2026-09-13: "Үндсэн" бүлэг цэсний "Мэдэгдэл" цэсийг "Албан
// мэдэгдэл" болгож сольж, түүний "Илгээх" таб-ыг хэрэглэгчийн
// зурсан зурган загварын дагуу хийв — Бүлэг->Хүлээн авагч->Гарчиг
// гэсэн 3 шатлалт хамаарлыг (статик массиваар), Ганц тоотой хүлээн
// авагч сонгогдоход "Хүлээн авагчийн нэр" талбар нэмж гарч ирэхийг
// UI түвшинд бүрэн хэрэгжүүлсэн.
//
// 2026-09-13 (3-р шинэчлэл): БҮРЭН АЖИЛЛАГААТАЙ БОЛГОВ — "Илгээх"
// товч дарахад official_notices (migration 0129) хүснэгэлд бодит
// мвр үүсгэж, In-app сувгаар (group='owner'/'spot_only'/'client'
// бүгд дэмждэг) тохирох хүлээн авагч бүрт мэдэгдэл бичдэг болов.
// "Илгээсэн" таб одоо official_notices-ээс бодитоор уншиж, "УНШСАН"
// тоог нэгтгэн харуулна. Мэйл/СМС сувгийн бодит холболт ХАРААХАН
// ХИЙГДЭЭГүй (тусад нь дараагийн ажил).
//
// 2026-09-13 (4-р шинэчлэл): "Мессенжер" гэж буруу нэрлэсэн In-app
// сувгийг зөөр "In-app" болгож нэрлэж, msgr_list/msgr_messages
// (2 талын chat систем)-ээс БүРЭН тусгаарлаж, тусдаа
// official_notice_recipients (migration 0130) хүснэгэлд бичдэг
// болгов — vvгээр Талбай эмчлэгч (client) ч мөн бодит In-app
// мэдэгдэл хүлээн авах боломжтой болов (өмнө нь msgr_list зөвхөн
// owner_id-тэй тул client-д огт илгээгддэггүй байсан цоорхойг ч
// засав). UserApp талд шинэ тусдаа "Албан мэдэгдэл" inbox (badge +
// push notification-той) тусад нь хэрэгжсэн.
const GROUPS = [
  { key: 'owner', label: 'Сууц өмчлөгч' },
  { key: 'client', label: 'Талбай өмчлөгч' },
  { key: 'spot_only', label: 'Зогсоол, агуулах өмчлөгч' },
];

const RECIPIENTS_BY_GROUP = {
  owner: [
    { key: 'all', label: 'Бүх сууц өмчлөгч', singular: false, title: 'Нийт сууц өмчлөгчдөд' },
    { key: 'one', label: 'Сууц өмчлөгч', singular: true, title: 'Сууц өмчлөгч Танаа' },
    { key: 'overdue', label: 'Төлбөрийн хугацаа хэтэрсэн бүх сууц өмчлөгч', singular: false, title: 'Хугацаа хэтэрсэн нийт сууц өмчлөгчдөд' },
    { key: 'at_risk', label: 'Төлбөрийн эрсдэлтэй бүх сууц өмчлөгч', singular: false, title: 'Төлбөрийн эрсдэлтэй нийт сууц өмчлөгчдөд' },
  ],
  client: [
    { key: 'all', label: 'Бүх талбай өмчлөгч', singular: false, title: 'Нийт талбай өмчлөгчдөд' },
    { key: 'one', label: 'Талбай өмчлөгч', singular: true, title: 'Талбай өмчлөгч Танаа' },
    { key: 'overdue', label: 'Төлбөрийн хугацаа хэтэрсэн бүх талбай өмчлөгч', singular: false, title: 'Хугацаа хэтэрсэн нийт талбай өмчлөгчдөд' },
    { key: 'at_risk', label: 'Төлбөрийн эрсдэлтэй бүх талбай өмчлөгч', singular: false, title: 'Төлбөрийн эрсдэлтэй нийт талбай өмчлөгчдөд' },
  ],
  spot_only: [
    { key: 'all', label: 'Бүх зогсоол, агуулах өмчлөгч', singular: false, title: 'Нийт зогсоол, агуулах өмчлөгчдөд' },
    { key: 'one', label: 'Зогсоол, агуулах өмчлөгч', singular: true, title: 'Зогсоол, агуулах өмчлөгч Танаа' },
    { key: 'overdue', label: 'Төлбөрийн хугацаа хэтэрсэн бүх зогсоол, агуулах өмчлөгч', singular: false, title: 'Хугацаа хэтэрсэн нийт зогсоол, агуулах өмчлөгчдөд' },
    { key: 'at_risk', label: 'Төлбөрийн эрсдэлтэй бүх зогсоол, агуулах өмчлөгч', singular: false, title: 'Төлбөрийн эрсдэлтэй нийт зогсоол, агуулах өмчлөгчдөд' },
  ],
};

const NOTICE_TYPES = ['Албан мэдэгдэл', 'Анхаарулга', 'Сануулга', 'Зар мэдээлэл', 'Нэхэмжлэл'];

// Owner (тоот эсвэл дан зогсоол/агуулах)-ийн ТОГТВОРТОЙ target_id —
// Invoice.jsx-ийн 3 үеийн fallback-тай ЯГ ИЖИЛ логик.
async function computeOwnerStableId(o, unitLayoutsFull) {
  if (o.building_no) {
    const unit = unitLayoutsFull.find((u) => u.building_no === o.building_no && u.floor === o.floor && u.door_no === o.door_no);
    if (unit) return unit.id;
  }
  const parkingUuid = o.has_grid_parking && Array.isArray(o.grid_parkings) && o.grid_parkings.length > 0 ? extractGridItemUuid(o.grid_parkings[0]?.id) : null;
  if (parkingUuid) return parkingUuid;
  const storageUuid = o.has_grid_storage && Array.isArray(o.grid_storages) && o.grid_storages.length > 0 ? extractGridItemUuid(o.grid_storages[0]?.id) : null;
  if (storageUuid) return storageUuid;
  return o.id;
}

// Client (талбай)-ийн ТОГТВОРТОЙ target_id — Invoice.jsx-тэй ЯГ ИЖИЛ.
function computeClientStableId(c) {
  const landUuid = c.has_grid_land && Array.isArray(c.grid_land_plots) && c.grid_land_plots.length > 0 ? extractGridItemUuid(c.grid_land_plots[0]?.id) : null;
  if (landUuid) return landUuid;
  const parkingUuid = c.has_grid_parking && Array.isArray(c.grid_parkings) && c.grid_parkings.length > 0 ? extractGridItemUuid(c.grid_parkings[0]?.id) : null;
  if (parkingUuid) return parkingUuid;
  const storageUuid = c.has_grid_storage && Array.isArray(c.grid_storages) && c.grid_storages.length > 0 ? extractGridItemUuid(c.grid_storages[0]?.id) : null;
  if (storageUuid) return storageUuid;
  return c.id;
}

// Бүлэг+Хүлээн авагчийн сонголтод тохирох бодит хүлээн авагчдыг
// (id, name) DB-ээс уншина. "overdue"/"at_risk" үед invoices-ийн
// status-аар (тус бүрийн тогтвортой target_id-аар) шүүнэ.
async function resolveRecipients(hoaId, group, recipientKey, recipientId) {
  if (group === 'owner' || group === 'spot_only') {
    let query = supabase.from('owners').select('*').eq('tenant_id', hoaId);
    query = group === 'owner' ? query.not('building_no', 'is', null) : query.is('building_no', null);
    const { data: owners } = await query;
    const rows = owners || [];
    if (recipientKey === 'one') {
      return rows.filter((o) => o.id === recipientId).map((o) => ({ id: o.id, name: `${o.firstname || ''} ${o.lastname || ''}`.trim() }));
    }
    if (recipientKey === 'all') {
      return rows.map((o) => ({ id: o.id, name: `${o.firstname || ''} ${o.lastname || ''}`.trim() }));
    }
    const { data: unitLayoutsFull } = await fetchAllRows(() => supabase.from('unit_layouts').select('id, building_no, floor, door_no').eq('tenant_id', hoaId));
    const withStableId = await Promise.all(rows.map(async (o) => ({ o, sid: await computeOwnerStableId(o, unitLayoutsFull || []) })));
    const stableIds = withStableId.map((x) => x.sid);
    const { data: invoices } = stableIds.length ? await supabase.from('invoices').select('target_id, status').eq('tenant_id', hoaId).eq('target_type', 'owner').in('target_id', stableIds) : { data: [] };
    const statusByTarget = {};
    (invoices || []).forEach((inv) => {
      if (!statusByTarget[inv.target_id]) statusByTarget[inv.target_id] = new Set();
      statusByTarget[inv.target_id].add(inv.status);
    });
    const wantedStatus = recipientKey === 'overdue' ? 'overdue' : 'sent';
    return withStableId.filter((x) => statusByTarget[x.sid]?.has(wantedStatus)).map((x) => ({ id: x.o.id, name: `${x.o.firstname || ''} ${x.o.lastname || ''}`.trim() }));
  }
  if (group === 'client') {
    const { data: clients } = await supabase.from('clientele').select('*').eq('tenant_id', hoaId);
    const rows = clients || [];
    if (recipientKey === 'one') {
      return rows.filter((c) => c.id === recipientId).map((c) => ({ id: c.id, name: c.legal_entity_name }));
    }
    if (recipientKey === 'all') {
      return rows.map((c) => ({ id: c.id, name: c.legal_entity_name }));
    }
    const withStableId = rows.map((c) => ({ c, sid: computeClientStableId(c) }));
    const stableIds = withStableId.map((x) => x.sid);
    const { data: invoices } = stableIds.length ? await supabase.from('invoices').select('target_id, status').eq('tenant_id', hoaId).eq('target_type', 'client').in('target_id', stableIds) : { data: [] };
    const statusByTarget = {};
    (invoices || []).forEach((inv) => {
      if (!statusByTarget[inv.target_id]) statusByTarget[inv.target_id] = new Set();
      statusByTarget[inv.target_id].add(inv.status);
    });
    const wantedStatus = recipientKey === 'overdue' ? 'overdue' : 'sent';
    return withStableId.filter((x) => statusByTarget[x.sid]?.has(wantedStatus)).map((x) => ({ id: x.c.id, name: x.c.legal_entity_name }));
  }
  return [];
}

function SendTab({ hoaId }) {
  const [group, setGroup] = useState('owner');
  const [recipientKey, setRecipientKey] = useState('all');
  const [recipientId, setRecipientId] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [nameOptions, setNameOptions] = useState([]);
  const [nameOpen, setNameOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [noticeType, setNoticeType] = useState(NOTICE_TYPES[0]);
  const [title, setTitle] = useState(RECIPIENTS_BY_GROUP.owner[0].title);
  const [content, setContent] = useState('');
  const [channels, setChannels] = useState({ email: false, sms: false, inApp: true });
  const [sending, setSending] = useState(false);

  const recipientOptions = RECIPIENTS_BY_GROUP[group];
  const recipient = recipientOptions.find((r) => r.key === recipientKey) || recipientOptions[0];

  useEffect(() => {
    const first = RECIPIENTS_BY_GROUP[group][0];
    setRecipientKey(first.key);
    setTitle(first.title);
    setRecipientId(null);
    setRecipientName('');
  }, [group]);

  function handleRecipientChange(key) {
    setRecipientKey(key);
    const r = recipientOptions.find((x) => x.key === key);
    setTitle(r?.title || '');
    setRecipientId(null);
    setRecipientName('');
  }

  // Ганц тоотой хүлээн авагч сонгогдоход, тохирох бүртгэлээс нэрсийг
  // татаж, локал хайлтад бэлдэнэ.
  useEffect(() => {
    if (!recipient.singular || !hoaId) { setNameOptions([]); return; }
    let cancelled = false;
    (async () => {
      let rows = [];
      if (group === 'owner') {
        const { data } = await supabase.from('owners').select('id, firstname, lastname').eq('tenant_id', hoaId).not('building_no', 'is', null);
        rows = (data || []).map((o) => ({ id: o.id, name: `${o.firstname || ''} ${o.lastname || ''}`.trim() }));
      } else if (group === 'client') {
        const { data } = await supabase.from('clientele').select('id, legal_entity_name').eq('tenant_id', hoaId);
        rows = (data || []).map((c) => ({ id: c.id, name: c.legal_entity_name }));
      } else if (group === 'spot_only') {
        const { data } = await supabase.from('owners').select('id, firstname, lastname').eq('tenant_id', hoaId).is('building_no', null);
        rows = (data || []).map((o) => ({ id: o.id, name: `${o.firstname || ''} ${o.lastname || ''}`.trim() }));
      }
      if (!cancelled) setNameOptions(rows.filter((r) => r.name));
    })();
    return () => { cancelled = true; };
  }, [group, recipient.singular, hoaId]);

  // Сонгосон Бүлэг/Хүлээн авагчид бодитоор хэдэн хүн тохирохыг
  // тоолж, "N хүлээн авагч олдлоо" гэдгийг ЖИНХЭНЭ утгаар харуулна.
  useEffect(() => {
    if (!hoaId) return;
    if (recipient.singular && !recipientId) { setMatchCount(recipientId ? 1 : 0); return; }
    let cancelled = false;
    (async () => {
      const list = await resolveRecipients(hoaId, group, recipientKey, recipientId);
      if (!cancelled) setMatchCount(list.length);
    })();
    return () => { cancelled = true; };
  }, [hoaId, group, recipientKey, recipientId, recipient.singular]);

  const q = recipientName.trim().toLowerCase();
  const filteredNameOptions = (q ? nameOptions.filter((o) => o.name.toLowerCase().startsWith(q)) : nameOptions).slice(0, 8);

  async function handleSend() {
    if (recipient.singular && !recipientId) {
      alert('Хүлээн авагчийг жагсаалтаас сонгоно уу.');
      return;
    }
    setSending(true);
    try {
      const recipients = await resolveRecipients(hoaId, group, recipientKey, recipientId);
      if (recipients.length === 0) {
        alert('Тохирох хүлээн авагч олдсонгүй.');
        return;
      }
      const { data: notice, error } = await supabase.from('official_notices').insert({
        tenant_id: hoaId, sender: 'SuperAdmin', group_key: group, recipient_key: recipientKey,
        recipient_label: recipient.label, recipient_id: recipient.singular ? recipientId : null,
        recipient_name: recipient.singular ? recipientName : null, notice_type: noticeType,
        title, content, channel_email: channels.email, channel_sms: channels.sms, channel_messenger: channels.inApp,
        recipient_count: recipients.length,
      }).select().single();
      if (error) { alert('Алдаа гарлаа: ' + error.message); return; }

      // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — "In-app" (өмнө нь "Мессенжер"
      // гэж буруу нэрлэсэн) суваг одоо msgr_list/msgr_messages-тэй
      // ОГТ ХОЛБООГүй, тусдаа official_notice_recipients-руу бичдэг
      // болов. үүгээр Талбай эмчлэгч (client) ч мөн бодит In-app
      // мэдэгдэл хүлээн авах боломжтой болов (өмнө нь msgr_list
      // зөвхөн owner_id-тэй тул client-д огт илгээгддэггүй байсан).
      if (channels.inApp) {
        const rows = recipients.map((r) => ({
          notice_id: notice.id, tenant_id: hoaId,
          owner_id: (group === 'owner' || group === 'spot_only') ? r.id : null,
          client_id: group === 'client' ? r.id : null,
        }));
        await supabase.from('official_notice_recipients').insert(rows);
      }

      alert(`${recipients.length} хүлээн авагчид амжилттай илгээлээ.`);
      setContent('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex gap-4">
      <div className="ds-card p-4 flex-1 max-w-[420px]">
        <div className="text-sm font-semibold mb-3">Албан мэдэгдэл илгээх</div>

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Илгээгч</label>
        <input className="ds-input w-full mb-3" value="SuperAdmin" readOnly />

        <div className="grid grid-cols-2 gap-2 mb-1">
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Бүлэг</label>
            <select className="ds-select w-full" value={group} onChange={(e) => setGroup(e.target.value)}>
              {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хүлээн авагч</label>
            <select className="ds-select w-full" value={recipientKey} onChange={(e) => handleRecipientChange(e.target.value)}>
              {recipientOptions.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-mutedtext mb-3">{matchCount} хүлээн авагч олдлоо</div>

        {recipient.singular && (
          <div className="mb-3 relative">
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хүлээн авагчийн нэр</label>
            <input
              className="ds-input w-full"
              placeholder="Нэр эсвэл тоогоор хайх..."
              value={recipientName}
              onChange={(e) => { setRecipientName(e.target.value); setRecipientId(null); }}
              onFocus={() => setNameOpen(true)}
              onBlur={() => setTimeout(() => setNameOpen(false), 150)}
            />
            {nameOpen && (
              <div className="ds-card absolute z-10 w-full mt-1 max-h-[180px] overflow-auto p-1">
                {filteredNameOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-[12px] text-slate-500 dark:text-mutedtext">Хүлээн авагч олдсонгүй</div>
                ) : (
                  filteredNameOptions.map((o) => (
                    <div
                      key={o.id}
                      className="px-2 py-1.5 text-[13px] rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
                      onMouseDown={() => { setRecipientName(o.name); setRecipientId(o.id); setNameOpen(false); }}
                    >
                      {o.name}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Төрөл</label>
        <select className="ds-select w-full mb-3" value={noticeType} onChange={(e) => setNoticeType(e.target.value)}>
          {NOTICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гарчиг</label>
        <input className="ds-input w-full mb-3" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Агуулга ({content.length})</label>
        <textarea className="ds-input w-full resize-none mb-3" style={{ height: '110px' }} value={content} onChange={(e) => setContent(e.target.value)} />

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Суваг</label>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={channels.email} onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))} /> Мэйл</label>
          <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={channels.sms} onChange={(e) => setChannels((c) => ({ ...c, sms: e.target.checked }))} /> СМС</label>
          <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={channels.inApp} onChange={(e) => setChannels((c) => ({ ...c, inApp: e.target.checked }))} /> In-app</label>
        </div>

        <button className="ds-btn-primary w-full" onClick={handleSend} disabled={sending}>{sending ? 'Илгээж байна...' : 'Илгээх'}</button>
      </div>

      <div className="ds-card p-4 flex-1">
        <div className="text-sm font-semibold mb-3">Урьдчилан харах</div>
        <div className="ds-card p-4">
          <div className="text-[13px] font-bold mb-1">{noticeType}</div>
          <div className="text-[13px] font-bold mb-2">{title}</div>
          <div className="text-[13px] font-normal text-slate-600 dark:text-mutedtext" style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
        </div>
      </div>
    </div>
  );
}

const SENT_TYPE_FILTERS = ['Бүх төрөл', 'Албан мэдэгдэл', 'Анхаарулга', 'Сануулга', 'Зар мэдээлэл', 'Нэхэмжлэл'];

function formatSentAt(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function SentTab({ hoaId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [day, setDay] = useState('all');
  const [type, setType] = useState('Бүх төрөл');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: notices } = await fetchAllRows(() => supabase.from('official_notices').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false }));
      const list = notices || [];
      const noticeIds = list.map((n) => n.id);
      const readCountByNotice = {};
      if (noticeIds.length > 0) {
        const { data: msgs } = await fetchAllRows(() => supabase.from('official_notice_recipients').select('notice_id, read').in('notice_id', noticeIds));
        (msgs || []).forEach((m) => {
          if (!readCountByNotice[m.notice_id]) readCountByNotice[m.notice_id] = 0;
          if (m.read) readCountByNotice[m.notice_id]++;
        });
      }
      if (cancelled) return;
      setRows(list.map((n) => ({
        id: n.id,
        sentAt: formatSentAt(n.created_at),
        type: n.notice_type,
        recipient: n.recipient_name ? `${n.recipient_label} — ${n.recipient_name}` : n.recipient_label,
        sender: n.sender,
        title: n.title,
        content: n.content || '',
        count: n.recipient_count,
        read: readCountByNotice[n.id] || 0,
        channel: [n.channel_email && 'Мэйл', n.channel_sms && 'СМС', n.channel_messenger && 'In-app'].filter(Boolean).join(', ') || '—',
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hoaId]);

  const yearOptions = [...new Set(rows.map((r) => r.sentAt.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1));

  const filteredRows = rows.filter((r) => {
    const [datePart] = r.sentAt.split(' ');
    const [y, m, d] = datePart.split('-');
    if (year !== 'all' && y !== year) return false;
    if (month !== 'all' && String(Number(m)) !== month) return false;
    if (day !== 'all' && String(Number(d)) !== day) return false;
    if (type !== 'Бүх төрөл' && r.type !== type) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      if (!r.recipient.toLowerCase().includes(s) && !r.title.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <>
      <div className="ds-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <select className="ds-select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">Бүх он</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="ds-select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">Бүх сар</option>
            {monthOptions.map((m) => <option key={m} value={m}>{m}-р сар</option>)}
          </select>
          <select className="ds-select" value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="all">Бүх өдөр</option>
            {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="ds-select" value={type} onChange={(e) => setType(e.target.value)}>
            {SENT_TYPE_FILTERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text"
            className="ds-input min-w-[220px]"
            placeholder="Хүлээн авагч, гарчгаар хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="ds-btn-secondary">Хэвлэх</button>
      </div>

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">ХУГАЦАА</th>
                <th className="py-2.5 px-3">ТӨРӨЛ</th>
                <th className="py-2.5 px-3">ХүЛЭЭН АВАГЧ</th>
                <th className="py-2.5 px-3">ИЛГЭЭГЧ</th>
                <th className="py-2.5 px-3">ГАРЧИГ</th>
                <th className="py-2.5 px-3">АГУУЛГА</th>
                <th className="py-2.5 px-3">ТОО</th>
                <th className="py-2.5 px-3">УНШСАН</th>
                <th className="py-2.5 px-3">СУВАГ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
              ) : filteredRows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 px-3 whitespace-nowrap">{r.sentAt}</td>
                  <td className="py-2.5 px-3">{r.type}</td>
                  <td className="py-2.5 px-3">{r.recipient}</td>
                  <td className="py-2.5 px-3">{r.sender}</td>
                  <td className="py-2.5 px-3">{r.title}</td>
                  <td className="py-2.5 px-3 max-w-[260px] truncate" title={r.content}>{r.content}</td>
                  <td className="py-2.5 px-3 text-center">{r.count}</td>
                  <td className="py-2.5 px-3 text-center">{r.read}/{r.count}</td>
                  <td className="py-2.5 px-3">{r.channel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function OfficialNotice() {
  const { hoaId } = useParams();
  const [tab, setTab] = useState('send');

  return (
    <>
      <div className="flex gap-2 mb-2.5">
        <TabButton active={tab === 'send'} onClick={() => setTab('send')}>Илгээх</TabButton>
        <TabButton active={tab === 'sent'} onClick={() => setTab('sent')}>Илгээсэн</TabButton>
      </div>

      {tab === 'send' ? <SendTab hoaId={hoaId} /> : <SentTab hoaId={hoaId} />}
    </>
  );
}
