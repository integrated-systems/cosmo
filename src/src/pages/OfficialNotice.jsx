import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import TabButton from '../components/TabButton';

// 2026-09-13: "Үндсэн" бүлэг цэсний "Мэдэгдэл" цэсийг "Албан
// мэдэгдэл" болгож сольж, түүний "Илгээх" таб-ыг хэрэглэгчийн
// зурсан зурган загварын дагуу PLACEHOLDER маягаар хийв —
// Бүлэг->Хүлээн авагч->Гарчиг гэсэн 3 шатлалт хамаарлыг (статик
// массиваар), Ганц тоотой хүлээн авагч сонгогдоход "Хүлээн авагчийн
// нэр" талбар нэмж гарч ирэхийг UI түвшинд бүрэн хэрэгжүүлсэн.
//
// 2026-09-13 (2-р шинэчлэл): "Хүлээн авагчийн нэр" талбарыг БОДИТ
// backend-тэй холбов — Бүлэг="Сууц өмчлөгч" бол owners (building_no
// IS NOT NULL), "Талбай өмчлөгч" бол clientele, "Зогсоол, агуулах
// өмчлөгч" бол owners (building_no IS NULL) хүснэгэлээс нэрийг
// ЭХНИЙ үсгээр нь хайж жагсаалтаар харуулна (Owners.jsx/Clientele.jsx-
// ийн тухайн табуудтай ЯГ ИЖИЛ шүүлт). Мэдэгдэл ИЛГЭЭХ (backend save)
// үйлдэл хараахан хийгдээгүй — зөвхөн нэр хайх функц.
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

function SendTab({ hoaId }) {
  const [group, setGroup] = useState('owner');
  const [recipientKey, setRecipientKey] = useState('all');
  const [recipientName, setRecipientName] = useState('');
  const [nameOptions, setNameOptions] = useState([]);
  const [nameOpen, setNameOpen] = useState(false);
  const [noticeType, setNoticeType] = useState(NOTICE_TYPES[0]);
  const [title, setTitle] = useState(RECIPIENTS_BY_GROUP.owner[0].title);
  const [content, setContent] = useState('');
  const [channels, setChannels] = useState({ email: false, sms: false, messenger: true });

  const recipientOptions = RECIPIENTS_BY_GROUP[group];
  const recipient = recipientOptions.find((r) => r.key === recipientKey) || recipientOptions[0];

  useEffect(() => {
    const first = RECIPIENTS_BY_GROUP[group][0];
    setRecipientKey(first.key);
    setTitle(first.title);
    setRecipientName('');
  }, [group]);

  function handleRecipientChange(key) {
    setRecipientKey(key);
    const r = recipientOptions.find((x) => x.key === key);
    setTitle(r?.title || '');
    setRecipientName('');
  }

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

  const q = recipientName.trim().toLowerCase();
  const filteredNameOptions = (q ? nameOptions.filter((o) => o.name.toLowerCase().startsWith(q)) : nameOptions).slice(0, 8);

  function handleSend() {
    alert('Албан мэдэгдэл илгээх бодит холболт удахгүй нэмэгдэнэ.');
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
        <div className="text-[11px] text-slate-500 dark:text-mutedtext mb-3">19 хүлээн авагч олдлоо</div>

        {recipient.singular && (
          <div className="mb-3 relative">
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хүлээн авагчийн нэр</label>
            <input
              className="ds-input w-full"
              placeholder="Нэр эсвэл тоогоор хайх..."
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
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
                      onMouseDown={() => { setRecipientName(o.name); setNameOpen(false); }}
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
          <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={channels.messenger} onChange={(e) => setChannels((c) => ({ ...c, messenger: e.target.checked }))} /> Мессенжер</label>
        </div>

        <button className="ds-btn-primary w-full" onClick={handleSend}>Илгээх</button>
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

const EXAMPLE_SENT_ROWS = [
  { sentAt: '2026-09-11 15:51:51', type: 'Албан мэдэгдэл', recipient: 'Бүх сууц өмчлөгч', sender: 'SuperAdmin', title: 'Нийт Сууц өмчлөгч Танааф', content: 'Ene 9 сар', count: 19, read: 0, channel: 'In-app' },
  { sentAt: '2026-09-11 15:50:47', type: 'Албан мэдэгдэл', recipient: 'Сүхээ Ганбаатар', sender: 'SuperAdmin', title: 'Сүхээ Ганбаатар 1040405 Танаа', content: '2026 оны 9-р сарын СӨХ-ийн төлбөр нэхэмжлэгдлээ:', count: 1, read: 0, channel: 'In-app' },
  { sentAt: '2026-09-02 07:03:34', type: 'Нэхэмжлэл', recipient: '2026 оны 9-р сарын нэхэмжлэх (54)', sender: 'SuperAdmin', title: '2026 оны 9-р сарын нэхэмжлэх', content: '2026 оны 9-р сарын төлбөр/түрээсийн нэхэмжлэх', count: 54, read: 0, channel: 'In-app' },
];

const SENT_TYPE_FILTERS = ['Бүх төрөл', 'Албан мэдэгдэл', 'Анхаарулга', 'Сануулга', 'Зар мэдээлэл', 'Нэхэмжлэл'];

function SentTab() {
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [day, setDay] = useState('all');
  const [type, setType] = useState('Бүх төрөл');
  const [search, setSearch] = useState('');

  const yearOptions = [...new Set(EXAMPLE_SENT_ROWS.map((r) => r.sentAt.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1));

  const filteredRows = EXAMPLE_SENT_ROWS.filter((r) => {
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
                <th className="py-2.5 px-3">ХҮЛЭЭН АВАГЧ</th>
                <th className="py-2.5 px-3">ИЛГЭЭГЧ</th>
                <th className="py-2.5 px-3">ГАРЧИГ</th>
                <th className="py-2.5 px-3">АГУУЛГА</th>
                <th className="py-2.5 px-3">ТОО</th>
                <th className="py-2.5 px-3">УНШСАН</th>
                <th className="py-2.5 px-3">СУВАГ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {filteredRows.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
              ) : filteredRows.map((r, i) => (
                <tr key={i}>
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
