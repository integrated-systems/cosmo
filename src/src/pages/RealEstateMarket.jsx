import { formatMoney } from '../lib/format';
import MarketValuationChart, { MarketValuationLegend } from '../components/MarketValuationChart';
import {
  MARKET_MONTHS,
  RESIDENTIAL_SALE_PRICE,
  RESIDENTIAL_RENTAL_PRICE,
  STORAGE_PARKING_SALE_PRICE,
  STORAGE_PARKING_RENTAL_PRICE,
} from '../data/realEstateMarket';

// "Зах зээлийн бодит үнэлгээ" (СИСАДМИН → restmarket, /restmarket) хуудас.
// Dashboard.jsx-ийн 4 чарт ЭНЭ хуудсын датаг (src/data/realEstateMarket.js)
// уншдаг — НЭГ эх сурвалж, хоёр газар давхар бичигдэхгүй. Хүснэгэлийн
// дизайн Owners.jsx-ийн загварыг (.ds-table-wrap/.ds-table/.ds-icon-btn)
// дахин ашигласан (Rule of two).
function computeChangePct(data) {
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  if (!prev) return 0;
  return ((last - prev) / prev) * 100;
}

// Хүснэгэлийн мөрүүдийг сарын дарааллаар СҮҮЛИЙНХ ЭХЭНД (шинээс хуучин
// руу) харуулна — screenshot-ийн эх дизайнтай адил.
const RENTAL_TABLE_ROWS = MARKET_MONTHS.map((month, i) => ({
  month,
  values: RESIDENTIAL_RENTAL_PRICE.series.map((s) => s.data[i]),
})).reverse();

export default function RealEstateMarket() {
  const salePct = computeChangePct(RESIDENTIAL_SALE_PRICE.data);
  const saleUp = salePct >= 0;

  return (
    <>
      {/* 4 мини-чарт карт — Dashboard-ийн "Хотхоны зах зээлийн бодит үнэлгээ"
          чартуудтай ЯГ АДИЛ компонент+дата ашигладаг тул хоёр хуудас
          хооронд харагдац зөрөх эрсдэлгүй */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="ds-card p-4 flex flex-col justify-between h-72">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Орон сууцны борлуулалтын үнэ (₮/м²)</div>
            <div className="text-xl font-bold text-customBlue mt-1">
              {formatMoney(RESIDENTIAL_SALE_PRICE.data[RESIDENTIAL_SALE_PRICE.data.length - 1])}₮{' '}
              <span className={`text-xs font-normal ${saleUp ? 'text-customGreen' : 'text-customRed'}`}>
                {saleUp ? '▲' : '▼'} {Math.abs(salePct).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex-1 pt-4">
            <MarketValuationChart series={[RESIDENTIAL_SALE_PRICE]} />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col justify-between h-72">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Орон сууцны түрээсийн үнэ (1-6 өрөө, ₮/сар)</div>
            <MarketValuationLegend series={RESIDENTIAL_RENTAL_PRICE.series} />
          </div>
          <div className="flex-1 pt-4">
            <MarketValuationChart series={RESIDENTIAL_RENTAL_PRICE.series} />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col justify-between h-72">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулах, Зогсоолын борлуулалтын үнэ (₮)</div>
            <MarketValuationLegend series={STORAGE_PARKING_SALE_PRICE.series} />
          </div>
          <div className="flex-1 pt-4">
            <MarketValuationChart series={STORAGE_PARKING_SALE_PRICE.series} />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col justify-between h-72">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулах, Зогсоолын түрээслэх үнэ (₮/сар)</div>
            <MarketValuationLegend series={STORAGE_PARKING_RENTAL_PRICE.series} />
          </div>
          <div className="flex-1 pt-4">
            <MarketValuationChart series={STORAGE_PARKING_RENTAL_PRICE.series} />
          </div>
        </div>
      </div>

      {/* Орон сууцны түрээсийн үнэ (1-6 өрөө) — сар бүрийн бодит үнийн
          хүснэгэл, Owners.jsx-ийн хүснэгэлийн дизайныг дахин ашигласан */}
      <div className="ds-card p-4">
        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Орон сууцны түрээсийн үнэ (1-6 өрөө)</div>
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3 w-[100px]">САР</th>
                  {RESIDENTIAL_RENTAL_PRICE.series.map((s) => (
                    <th key={s.label} className="py-2.5 px-3">{s.label.toUpperCase()}</th>
                  ))}
                  <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {RENTAL_TABLE_ROWS.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium">{row.month}</td>
                    {row.values.map((v, i) => (
                      <td key={RESIDENTIAL_RENTAL_PRICE.series[i].label} className="py-2.5 px-3">{formatMoney(v)}₮</td>
                    ))}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {/* TODO: Backend холбогдоход сар бүрийн үнийг засах модаль нэмнэ */}
                      <button className="ds-icon-btn" title="Засах">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
