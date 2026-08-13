import { formatDate } from '../lib/format';

// ⚠️ АУДИТААР ОЛДСОН, УСТГАСАН ЗҮЙЛ: эх projectcosmo.html-д
// generateStaticOwnersRows() гэсэн функц байсан бөгөөд индексээс (i)
// хамаарсан modulo арифметикаар 60 "жинхэнэ мэт" мөр үүсгэдэг байв
// (bair=101+(i%10), hasBalance=i>18 гэх мэт). Энэ нь бодит өгөгдөл БИШ,
// зөвхөн дизайны mockup-д зориулсан algorithmic placeholder байсан тул
// бүрэн арилгаж, оронд нь ЦЭВЭР ГАРААР бичсэн 4 жишээ мөр тавив.
//
// TODO: Backend (Supabase/API) холбогдоход энэ массивыг useEffect+fetch
// логикоор сольж, жинхэнэ residents датаг татна.
const EXAMPLE_RESIDENTS = [
  {
    id: 1, building: 101, apt: 1010505, sqm: 55.04, firstname: 'Дэлгэр', lastname: 'Мөнх',
    phone: '87889901', email: 'delger@gmail.com', ownDate: '2026/07/01', status: 'Өмчлөгч',
    people: 6, child1: 1, child2: 2, parking: 'B1-015', storage: '—', vehicle: '—',
    paidMonths: [1, 2, 3, 4, 5, 6, 7, 8], hasBalance: false,
  },
  {
    id: 2, building: 101, apt: 1010703, sqm: 49.95, firstname: 'Балдорж', lastname: 'Түмэн',
    phone: '87880077', email: 'bal@gmail.com', ownDate: '2026/07/01', status: 'Өмчлөгч',
    people: 4, child1: 1, child2: 1, parking: 'B1-008', storage: '—', vehicle: '—',
    paidMonths: [1, 2, 3, 4, 5, 6], hasBalance: true,
  },
  {
    id: 3, building: 102, apt: 1020703, sqm: 49.95, firstname: 'Мөнхөө', lastname: 'Ганбаатар',
    phone: '92719583', email: 'munhuu@mail.mn', ownDate: '2026/07/01', status: 'Түрээслэгч',
    people: 5, child1: 1, child2: 2, parking: 'B1-015', storage: 'B1-005', vehicle: '—',
    paidMonths: [1, 2, 3, 4, 5, 6, 7], hasBalance: false,
  },
  {
    id: 4, building: 103, apt: 1030804, sqm: 49.95, firstname: 'Сарангэрэл', lastname: 'Отгонбаяр',
    phone: '98187926', email: 'saraa@mail.mn', ownDate: '2026/07/01', status: 'Өмчлөгч',
    people: 5, child1: 2, child2: 0, parking: '—', storage: '—', vehicle: '43021 УХО',
    paidMonths: [1, 2], hasBalance: true,
  },
];

function MonthBadges({ paidMonths }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
        const isPaid = paidMonths.includes(m);
        return (
          <span key={m} className={`ds-month-badge ${isPaid ? 'paid' : 'unpaid'}`}>
            {m}
          </span>
        );
      })}
    </div>
  );
}

export default function Residents() {
  const rows = EXAMPLE_RESIDENTS;
  const withBalance = rows.filter((r) => r.hasBalance).length;

  return (
    <>
      {/* Toolbar: шүүлтүүр + Хэвлэх/Экспортлох/Нэмэх — глобал .ds-* класс ашиглав */}
      <div className="ds-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <select className="ds-select">
            <option>Бүх байр</option>
          </select>
          <select className="ds-select">
            <option>Бүх орц</option>
          </select>
          <div className="relative min-w-[200px]">
            <input type="text" placeholder="Хайх..." className="ds-input w-full pl-8" />
            <svg className="w-4 h-4 text-slate-400 dark:text-mutedtext absolute left-2.5 top-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="ds-btn-secondary">Хэвлэх</button>
          <button className="ds-btn-secondary">Экспортлох</button>
          <button className="ds-btn-primary">+ Сууц өмчлөгч нэмэх</button>
        </div>
      </div>

      {/* Хүснэгэл (sticky толгойтой, зөвхөн мөрүүд дотооддоо скроллдог) — глобал .ds-table класс */}
      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3 w-[80px]">БАЙР</th>
                <th className="py-2.5 px-3 w-[70px]">ТООТ</th>
                <th className="py-2.5 px-3 w-[80px]">ТАЛБАЙ</th>
                <th className="py-2.5 px-3 w-[100px]">НЭР</th>
                <th className="py-2.5 px-3 w-[100px]">ОВОГ</th>
                <th className="py-2.5 px-3 w-[100px]">УТАС</th>
                <th className="py-2.5 px-3 w-[140px]">ИМЭЙЛ</th>
                <th className="py-2.5 px-3 w-[100px]">өМЧЛөХ ОГНОО</th>
                <th className="py-2.5 px-3 w-[90px]">ТөЛөВ</th>
                <th className="py-2.5 px-3 w-[70px]">АМ БүЛ</th>
                <th className="py-2.5 px-3 w-[70px]">0-6 НАС</th>
                <th className="py-2.5 px-3 w-[70px]">6-18 НАС</th>
                <th className="py-2.5 px-3 w-[80px]">ЗОГСООЛ</th>
                <th className="py-2.5 px-3 w-[90px]">АГУУЛАХ</th>
                <th className="py-2.5 px-3 w-[100px]">МАШИН</th>
                <th className="py-2.5 px-3 w-[180px]">ТөЛөЛТ (САРААР)</th>
                <th className="py-2.5 px-3 w-[80px] text-right">үЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full inline-block ${r.hasBalance ? 'bg-customRed' : 'bg-customBlue'}`} />
                    {r.building}
                  </td>
                  <td className="py-2.5 px-3">{r.apt}</td>
                  <td className="py-2.5 px-3">{r.sqm} м²</td>
                  <td className="py-2.5 px-3 text-slate-900 dark:text-white">{r.firstname}</td>
                  <td className="py-2.5 px-3">{r.lastname}</td>
                  <td className="py-2.5 px-3">9{r.phone}</td>
                  <td className="py-2.5 px-3">{r.email}</td>
                  <td className="py-2.5 px-3">{formatDate(r.ownDate)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      r.status === 'Өмчлөгч'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{r.people}</td>
                  <td className="py-2.5 px-3">{r.child1}</td>
                  <td className="py-2.5 px-3">{r.child2}</td>
                  <td className="py-2.5 px-3">{r.parking}</td>
                  <td className="py-2.5 px-3">{r.storage}</td>
                  <td className="py-2.5 px-3">{r.vehicle}</td>
                  <td className="py-2.5 px-3"><MonthBadges paidMonths={r.paidMonths} /></td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button className="ds-icon-btn" title="Засах">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="ds-icon-btn danger" title="Устгах">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ds-table-summary">
          <div>Нийт: {rows.length} өмчлөгч</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-customGreen inline-block" /> Төлбөрийн үлдэгдэлгүй: {rows.length - withBalance}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-customRed inline-block" /> Төлбөрийн үлдэгдэлтэй: {withBalance}</span>
          </div>
        </div>
      </div>
    </>
  );
}
