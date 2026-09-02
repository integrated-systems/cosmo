import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { SearchIcon } from '../components/icons/Icons';
import TabButton from '../components/TabButton';

// "Түр зогсоол бүртгэл" (/parking) — 2026-08-31 хэрэглэгчийн хүсэлт.
// үвр нь ямар ч route/компонент/хүснэгэлгүй placeholder цэс байсныг
// бүрэн ажилладаг болгов. Owner OwnerApp-ийн "Зочин урих" хуудсаар
// зочны машины дугаар бүртгүүлж, энд admin/staff тэдгээрийг харж
// (нэвтэрсэн огноо, хэтэрсэн минут, твлвх дүн, твлвв) удирдана.
//
// 2026-08-31 (2) ЗАЛРУУЛГА: хэрэглэгч тодруулав —
//   1) "Түр зогссон машин" -> "Түр нэвтэрсэн машин"
//   2) Таб-үүдийг toolbar картан дотроос гаргаж, "Тоот, зогсоол,
//      агуулах" хуудасны загварын дагуу (TabButton компонент)
//      toolbar-ийн ДООР, хүснэгэлийн ДЭЭР тусад нь мвр болгож
//      байрлуулав.
const TABS = [
  { key: 'guest', label: 'Зочин машин' },
  { key: 'temp', label: 'Түр нэвтэрсэн машин' },
];

const STATUS_LABELS = {
  pending: 'Хүлээгдэж буй',
  entered: 'Орсон',
  finished: 'Дуусан',
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function ParkingPage() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('guest');
  const [rows, setRows] = useState(null);
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [day, setDay] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (tab !== 'guest') return;
    supabase.rpc('get_guest_parking_requests', { p_tenant_id: hoaId }).then(({ data }) => setRows(data || []));
  }, [hoaId, tab]);

  const years = Array.from(new Set((rows ?? []).map((r) => new Date(r.requested_at).getFullYear()))).sort((a, b) => b - a);

  const filtered = (rows ?? []).filter((r) => {
    const d = new Date(r.requested_at);
    if (year !== 'all' && d.getFullYear() !== Number(year)) return false;
    if (month !== 'all' && d.getMonth() + 1 !== Number(month)) return false;
    if (day !== 'all' && d.getDate() !== Number(day)) return false;
    if (status !== 'all' && r.status !== status) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!r.car_number.toLowerCase().includes(q) && !r.owner_name.toLowerCase().includes(q) && !r.owner_unit.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <div className="ds-toolbar flex-wrap">
        <select className="ds-select" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">Бүх он</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="ds-select" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">Бүх сар</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="ds-select" value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="all">Бүх өдөр</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="ds-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Бүх төлөө</option>
          <option value="pending">Хүлээгдэж буй</option>
          <option value="entered">Орсон</option>
          <option value="finished">Дуусан</option>
        </select>
        <div className="relative flex-1 min-w-[340px]">
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 dark:text-darktext absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text" placeholder="Тоот, машины дугаар, овог нэрээр хайх..."
            className="ds-input w-full pl-8 text-[13px]"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'temp' ? (
        <div className="ds-card p-6 text-center text-[12px] text-mutedtext">Энэ таб түн удахгүй нэмэгдэнэ.</div>
      ) : (
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3">ХүСЭЛТ БүРТГЭГДСЭН</th>
                  <th className="py-2.5 px-3">үРЬСАН СУУЦ ВМЧЛВГЧ</th>
                  <th className="py-2.5 px-3">МАШИНЫ ДУГААР</th>
                  <th className="py-2.5 px-3">НЭВТЭРСЭН ОГНОО</th>
                  <th className="py-2.5 px-3">ХЭТЭРСЭН МИН</th>
                  <th className="py-2.5 px-3">ТВЛВХ ДүН</th>
                  <th className="py-2.5 px-3">ТВЛВВ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {rows === null && (
                  <tr><td colSpan={7} className="py-6 text-center text-[12px] text-darktext">Ачаалж байна...</td></tr>
                )}
                {rows?.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-[12px] text-mutedtext">Хүсэлт одоогоор алга.</td></tr>
                )}
                {rows?.length > 0 && filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-[12px] text-mutedtext">Хайлт/шүүлтэд тохирох мвр олдсонгүй.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 px-3 text-[12px] text-slate-700 dark:text-text">{fmt(r.requested_at)}</td>
                    <td className="py-2.5 px-3 text-[12px] text-customBlue">{r.owner_name} {r.owner_unit && `(${r.owner_unit})`}</td>
                    <td className="py-2.5 px-3 text-[12px] font-semibold text-slate-900 dark:text-white">{r.car_number}</td>
                    <td className="py-2.5 px-3 text-[12px] text-slate-700 dark:text-text">{fmt(r.entered_at)}</td>
                    <td className="py-2.5 px-3 text-[12px] text-slate-700 dark:text-text">{r.exceeded_minutes ?? '—'}</td>
                    <td className="py-2.5 px-3 text-[12px] text-slate-700 dark:text-text">{r.amount_due ?? '—'}</td>
                    <td className="py-2.5 px-3 text-[12px] font-semibold text-slate-900 dark:text-white">{STATUS_LABELS[r.status] ?? r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
