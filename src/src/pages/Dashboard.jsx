import { formatMoney } from '../lib/format';
import MarketValuationChart, { MarketValuationLegend } from '../components/MarketValuationChart';
import { MARKET_ROWS, deriveMarketSeries } from '../data/realEstateMarket';

// "Real Estate market" (/restmarket) хуудасны сүүлийн 2 сарын утгаас
// хувийн өөрчлөлт тооцно — Dashboard-ийн дээд утга/сумны индикатор энэ
// НЭГ эх сурвалжаас уншина, тусад нь дахин бичихгүй.
function computeChangePct(data) {
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  if (!prev) return 0;
  return ((last - prev) / prev) * 100;
}

const marketSeries = deriveMarketSeries(MARKET_ROWS);
// Агуулах/Зогсоолын 2 чартад сүүлийн 12 сарыг л хэвтээ тэнхлэгтэй харуулна
const last12Rows = MARKET_ROWS.slice(-12);
const marketSeries12 = deriveMarketSeries(last12Rows);
const months12 = last12Rows.map((r) => r.month);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// TODO: backend холбогдоход эдгээрийг useEffect+API дуудлагаар сольно.
// Энэ бол зδвхδн дизайны жишээ мδр (projectcosmo.html-ийн эх дизайнтай
// ижил, algorithmic биш, гараар бичсэн 5 мөр).
const DEBTORS_EXAMPLE = [
  { name: 'Tous Les Jours', type: 'Аж ахуйн нэгж', months: '2 сар', amount: 4400000 },
  { name: 'Эрхий Мэргэн Цэцэрлэг', type: 'Аж ахуйн нэгж', months: '2 сар', amount: 4000000 },
  { name: 'BlackBull carwash', type: 'Аж ахуйн нэгж', months: '2 сар', amount: 1800000 },
  { name: 'Ace Esport', type: 'Аж ахуйн нэгж', months: '2 сар', amount: 1400000 },
  { name: 'Cafe Fonte', type: 'Аж ахуйн нэгж', months: '2 сар', amount: 1260000 },
];

function StatCard({ label, value, valueColor, detail }) {
  return (
    <div className="ds-card p-4 flex flex-col justify-between">
      <div className="text-slate-500 dark:text-mutedtext text-[11px] font-medium uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold my-1 ${valueColor}`}>{value}</div>
      <div className="text-[11px] text-slate-500 dark:text-mutedtext space-y-0.5">
        {detail.map((d) => <div key={d}>{d}</div>)}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <>
      {/* 1. Дээд талын 4 үндсэн мэдээллийн карт */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
        <StatCard label="ЭНЭ САРД НЭХЭМЖИЛСЭН" value={`${formatMoney(14385000)}₮`} valueColor="text-customBlue"
          detail={[`Сууц өмчлөгч - ${formatMoney(1510000)}₮`, `Аж ахуйн нэгж - ${formatMoney(12875000)}₮`]} />
        <StatCard label="ЭНЭ САРЫН ОРЛОГО" value={`${formatMoney(0)}₮`} valueColor="text-customGreen"
          detail={['Сууц өмчлөгч - 0/18', 'Аж ахуйн нэгж - 0/36']} />
        <StatCard label="НИЙТ ӨР АВЛАГА" value={`${formatMoney(28770000)}₮`} valueColor="text-customRed"
          detail={['Сууц өмчлөгч - 18/18', 'Аж ахуйн нэгж - 36/36']} />
        <StatCard label="НИЙТ ОРШИН СУУГЧ" value="65" valueColor="text-slate-900 dark:text-text"
          detail={['0-6 насны хүүхэд - 13', '6-18 насны хүүхэд - 16']} />
      </div>

      {/* 2. Орлого/Зарлага график + Төлбөрийн явц */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="ds-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Сарын орлого / зарлага</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-mutedtext">
                <span className="w-2.5 h-2.5 rounded-full bg-customBlue inline-block" /> Орлого
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-mutedtext">
                <span className="w-2.5 h-2.5 rounded-full bg-customGreen inline-block" /> Зарлага
              </div>
              <select className="ds-select">
                <option>2026</option>
              </select>
            </div>
          </div>
          <div className="h-36 flex items-end justify-between gap-1 pt-4 px-2 border-b border-slate-200 dark:border-bordercol">
            {MONTHS.map((m) => (
              <div key={m} className="w-full bg-slate-100 dark:bg-bordercol/30 h-full rounded-t flex items-end justify-center pb-1">
                <span className="text-[9px] text-darktext">{m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Төлбөрийн явц</div>
            <select className="ds-select">
              <option>Энэ сар</option>
            </select>
          </div>
          <div className="space-y-3 text-xs text-slate-500 dark:text-mutedtext">
            <div className="flex justify-between items-center"><span>Нийт төлбөр төлөгч тоо</span><span className="text-slate-900 dark:text-white font-medium">54</span></div>
            <div className="flex justify-between items-center"><span>Төлбөр төлсөн</span><span className="text-customGreen font-medium">0</span></div>
            <div className="flex justify-between items-center"><span>Хүлээлттэй</span><span className="text-slate-900 dark:text-white font-medium">0</span></div>
            <div className="flex justify-between items-center"><span>Хугацаа хэтэрсэн</span><span className="text-customRed font-medium">54</span></div>
            <div className="flex justify-between items-center"><span>Эрсдэлтэй</span><span className="text-slate-900 dark:text-white font-medium">0</span></div>
            <div className="border-t border-slate-200 dark:border-bordercol pt-2 flex justify-between items-center"><span>Энэ сарын төлбөрийн явц</span><span className="text-slate-900 dark:text-white font-medium">0%</span></div>
            <div className="flex justify-between items-center"><span>Энэ сарын өр авлагын харьцаа</span><span className="text-slate-900 dark:text-white font-medium">0%</span></div>
          </div>
        </div>
      </div>

      {/* 3. Сүүлийн гүйлгээ + Төлбөрийн өртэй */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="ds-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Сүүлийн гүйлгээ</div>
            <a href="#" className="text-xs text-blue-500 hover:underline">Бүгдийг харах →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-mutedtext">
              <thead className="border-b border-slate-200 dark:border-bordercol text-darktext uppercase text-[10px]">
                <tr>
                  <th className="pb-2">ТООТ/НЭР</th><th className="pb-2">ДүН</th>
                  <th className="pb-2">ТөЛБөРИЙН ХЭЛБЭР</th><th className="pb-2 text-right">ОГНОО</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={4} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="ds-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Төлбөрийн өртэй</div>
            <select className="ds-select">
              <option>Дүнгээр</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-mutedtext">
              <thead className="border-b border-slate-200 dark:border-bordercol text-darktext uppercase text-[10px]">
                <tr>
                  <th className="pb-2">ТООТ/НЭР</th><th className="pb-2">ТөРөЛ</th>
                  <th className="pb-2">ХУГАЦАА</th><th className="pb-2 text-right">ДүН</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {DEBTORS_EXAMPLE.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2 text-slate-900 dark:text-white font-medium">{d.name}</td>
                    <td className="py-2">{d.type}</td>
                    <td className="py-2">{d.months}</td>
                    <td className="py-2 text-right text-customRed font-medium">{formatMoney(d.amount)}₮</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Ашиглалтаас хугацаа дуусч буй Үндсэн хөрөнгө */}
      <div className="ds-card p-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Ашиглалтаас хугацаа дуусч буй Үндсэн хөрөнгө</div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 dark:text-mutedtext">Хогооны машин газар</span>
          <a href="#" className="text-xs text-blue-500 hover:underline">Бүгдийг харах → <span className="text-slate-900 dark:text-white ml-1">0%</span></a>
        </div>
      </div>

      {/* 5. Доод талын том график картууд — картын урт/өргөний харьцаа
          ТОГТМОЛ 3.5:1 (aspect-[3.5/1]). 4 чарт БҮГД хэвтээ тэнхлэг
          (сүүлийн 12 сар)+дугуй маркер+hover попап-той */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="ds-card p-4 flex flex-col aspect-[3.5/1]">
          <div className="flex flex-col shrink-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Хотхоны зах зээлийн бодит үнэлгээ (Сүүлийн 12 сар)</div>
            <div className="text-xs text-slate-500 dark:text-mutedtext mt-1">Орон сууцны борлуулалтын үнэ (₮/м²)</div>
            {(() => {
              const data = marketSeries.residentialSalePrice.data;
              const pct = computeChangePct(data);
              const up = pct >= 0;
              return (
                <div className="text-xl font-bold text-customBlue mt-1">
                  {formatMoney(data[data.length - 1])}₮{' '}
                  <span className={`text-xs font-normal ${up ? 'text-customGreen' : 'text-customRed'}`}>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="flex-1 pt-4 min-h-0">
            <MarketValuationChart series={[marketSeries12.residentialSalePrice]} months={months12} showAxis />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col aspect-[3.5/1]">
          <div className="flex flex-col gap-1 shrink-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Орон сууцны түрээсийн үнэ (1-6 өрөө, ₮/сар)</div>
            <MarketValuationLegend series={marketSeries.residentialRentalPrice.series} />
          </div>
          <div className="flex-1 pt-4 min-h-0">
            <MarketValuationChart series={marketSeries12.residentialRentalPrice.series} months={months12} showAxis />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col aspect-[3.5/1]">
          <div className="flex flex-col shrink-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулах, Зогсоолын борлуулалтын үнэ (₮)</div>
            <MarketValuationLegend series={marketSeries12.storageParkingSalePrice.series} />
          </div>
          <div className="flex-1 pt-4 min-h-0">
            <MarketValuationChart series={marketSeries12.storageParkingSalePrice.series} months={months12} showAxis />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col aspect-[3.5/1]">
          <div className="flex flex-col shrink-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулах, Зогсоолын түрээслэх үнэ (₮/сар)</div>
            <MarketValuationLegend series={marketSeries12.storageParkingRentalPrice.series} />
          </div>
          <div className="flex-1 pt-4 min-h-0">
            <MarketValuationChart series={marketSeries12.storageParkingRentalPrice.series} months={months12} showAxis />
          </div>
        </div>
      </div>
    </>
  );
}
