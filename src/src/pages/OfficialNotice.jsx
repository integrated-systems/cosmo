import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TabButton from '../components/TabButton';

// 2026-09-13: "Үндсэн" бүлэг цэсний "Мэдэгдэл" цэсийг "Албан
// мэдэгдэл" болгож сольж, түүний "Илгээх" таб-ыг хэрэглэгчийн
// зурсан зурган загварын дагуу PLACEHOLDER маягаар хийв —
// Бүлэг->Хүлээн авагч->Гарчиг гэсэн 3 шатлалт хамаарлыг (статик
// массиваар), Ганц тоотой хүлээн авагч сонгогдоход "Хүлээн авагчийн
// нэр" талбар нэмж гарч ирэхийг UI түвшинд бүрэн хэрэгжүүлсэн.
// БОДИТ backend холболт (жинхэнэ өмчлөгчдийг хайх, илгээх,
// "Илгээсэн" таб) ХАРААХАН ХИЙГДЭЭГҮЙ — тусад нь дараагийн ажил
// болгоно.
//
// Бүлэг бүр 4 төрлийн хүлээн авагчтай (Бүгд / Ганц / Хугацаа
// хэтэрсэн бүгд / Эрсдэлтэй бүгд), тус бүр өөрийн ГАРЧИГ-ийн
// анхдагч утгатай (хэрэглэгч дараа нь өөрчилж болно).
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

function SendTab() {
  const [group, setGroup] = useState('owner');
  const [recipientKey, setRecipientKey] = useState('all');
  const [recipientName, setRecipientName] = useState('');
  const [noticeType, setNoticeType] = useState(NOTICE_TYPES[0]);
  const [title, setTitle] = useState(RECIPIENTS_BY_GROUP.owner[0].title);
  const [content, setContent] = useState('');
  const [channels, setChannels] = useState({ email: false, sms: false, messenger: true });

  const recipientOptions = RECIPIENTS_BY_GROUP[group];
  const recipient = recipientOptions.find((r) => r.key === recipientKey) || recipientOptions[0];

  // Бүлэг өөрчлөгдөхөд, тэр бүлгийн 1-р хүлээн авагчийг анхдагчаар сонгоно
  useEffect(() => {
    const first = RECIPIENTS_BY_GROUP[group][0];
    setRecipientKey(first.key);
    setTitle(first.title);
    setRecipientName('');
  }, [group]);

  // Хүлээн авагч өөрчлөгдөхөд, Гарчгийг тэдгээрийн анхдагч утгаар
  // шинэчилнэ (хэрэглэгч дараа нь гараар өөрчилж болно).
  function handleRecipientChange(key) {
    setRecipientKey(key);
    const r = recipientOptions.find((x) => x.key === key);
    setTitle(r?.title || '');
    setRecipientName('');
  }

  function handleSend() {
    // TODO: БОДИТ backend холболт (тохирох өмчлөгчдийг DB-ээс
    // татаж, сонгосон сувгаар илгээх) дараагийн ажил болгоно.
    alert('Албан мэдэгдэл илгээх бодит холболт удахгүй нэмэгдэнэ.');
  }

  return (
    <div className="flex gap-4">
      <div className="ds-card p-4 flex-1 max-w-[420px]">
        <div className="text-sm font-semibold mb-3">Мэдэгдэл илгээх</div>

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Илгээгч</label>
        {/* 2026-09-13: Илгээж буй хэрэглэгчийн РОЛИЙН албан тушаалыг
            (жишээ нь SuperAdmin) автоматаар дуудна. PLACEHOLDER —
            бодит role-based population дараа нь хийгдэнэ. */}
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
          <div className="mb-3">
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хүлээн авагчийн нэр</label>
            {/* 2026-09-13: Ганц тоотой хүлээн авагч сонгогдоход л
                гарч ирнэ. Нэр эсвэл тоогоор бичихэд, бүртгэлтэй
                өмчлөгчдийн нэрийг ЭХНИЙ үсгээр нь дуудаж жагсаалтаар
                харуулах (Сууц/Талбай/Зогсоол-агуулах өмчлөгч 3
                бүртгэлээс) БОДИТ хайлт дараа нь хийгдэнэ — одоохондоо
                зөвхөн input талбар. */}
            <input
              className="ds-input w-full"
              placeholder="Нэр эсвэл тоогоор хайх..."
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>
        )}

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Төрөл</label>
        <select className="ds-select w-full mb-3" value={noticeType} onChange={(e) => setNoticeType(e.target.value)}>
          {NOTICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гарчиг</label>
        <input className="ds-input w-full mb-3" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Агуулга</label>
        <textarea className="ds-input w-full resize-none mb-3" style={{ height: '110px' }} value={content} onChange={(e) => setContent(e.target.value)} />

        <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Сувар</label>
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
          <div className="text-[13px] font-bold">{title}</div>
        </div>
      </div>
    </div>
  );
}

function SentTab() {
  // TODO: дараагийн зурган загварын дагуу хэрэгжүүлнэ.
  return <div className="ds-card p-8 text-center text-mutedtext">Түн удахгүй...</div>;
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
