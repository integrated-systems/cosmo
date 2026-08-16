import { useState } from 'react';
import { formatMoney } from '../lib/format';
import MarketValuationChart, { MarketValuationLegend } from '../components/MarketValuationChart';
import EditMarketModal from '../components/EditMarketModal';
import { EditIcon } from '../components/icons/Icons';
import { MARKET_ROWS, RENTAL_LABELS, deriveMarketSeries } from '../data/realEstateMarket';

// "Зах зээлийн бодит үнэлгээ" (СИСАДМИН → restmarket, /restmarket) хуудас.
// Dashboard.jsx-ийн 4 чарт ЭНЭ хуудасны датаг (src/data/realEstateMarket.js)
// уншдаг — НЭГ эх сурвалж, хоёр газар давхар бичигдэхгүй. Хүснэгэлийн
// дизайн Owners.jsx-ийн загварыг (.ds-table-wrap/.ds-table/.ds-icon-btn)
// дахин ашигласан (Rule of two). Модаль-аар нэмэгдэх/засагдах өгөгдөл
// зөвхөн ЭНЭ хуудасны session state дотор амьдардаг — TODO: Backend
// (Supabase) холбогдоход persist хийнэ.
function computeChangePct(data) {
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  if (!prev) return 0;
  return ((last - prev) / prev) * 100;
}

export default function RealEstateMarket() {
  const [rows, setRows] = useState(MARKET_ROWS);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const marketSeries = deriveMarketSeries(rows);
  const salePct = computeChangePct(marketSeries.residentialSalePrice.data);
  const saleUp = salePct >= 0;

  // Агуулах/Зогсоолын 2 чартад сүүлийн 12 сарыг л хэвтээ тэнхлэгтэй харуулна
  const last12Rows = rows.slice(-12);
  const marketSeries12 = deriveMarketSeries(last12Rows);
  const months12 = last12Rows.map((r) => r.month);

  // Хүснэгэлийн мөрүүдийг сарын дарааллаар СҮҮЛИЙНХ ЭХЭНД (шинээс хуучин
  // руу) харуулна — screenshot-ийн эх дизайнтай адил.
  const tableRows = [...rows].reverse();

  function handleSave(rowData) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.month === rowData.month);
      const next = idx >= 0 ? prev.map((r, i) => (i === idx ? rowData : r)) : [...prev, rowData];
      return next.sort((a, b) => a.month.localeCompare(b.month));
    });
    setEditing(null);
    setAdding(false);
  }

  return (
    <>
      {/* 4 мини-чарт карт — Dashboard-ийн "Хотхоны зах зээлийн бодит үнэлгээ"
          чартуудтай ЯГ АДИЛ компонент+дата ашигладаг тул хоёр хуудас
          хооронд харагдац зөрөх эрсдэлгүй. Картын урт/өргөний харьцаа
          ТОГТМОЛ 3:1 (aspect-[3/1]). 4 чарт БҮГД хэвтээ тэнхлэг
          (сүүлийн 12 сар)+дугуй маркер+hover попап-той */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="ds-card p-4 flex flex-col aspect-[3/1]">
          <div className="flex flex-col shrink-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Орон сууцны борлуулалтын үнэ (₮/м²)</div>
            <div className="text-xl font-bold text-customBlue mt-1">
              {formatMoney(marketSeries.residentialSalePrice.data[marketSeries.residentialSalePrice.data.length - 1])}₮{' '}
              <span className={`text-xs font-normal ${saleUp ? 'text-customGreen' : 'text-customRed'}`}>
                {saleUp ? '▲' : '▼'} {Math.abs(salePct).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex-1 pt-4 min-h-0">
            <MarketValuationChart series={[marketSeries12.residentialSalePrice]} months={months12} showAxis />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col aspect-[3/1]">
          <div className="flex flex-col gap-1 shrink-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Орон сууцны түрээсийн үнэ (1-6 өрөө, ₮/сар)</div>
            <MarketValuationLegend series={marketSeries.residentialRentalPrice.series} />
          </div>
          <div className="flex-1 pt-4 min-h-0">
            <MarketValuationChart series={marketSeries12.residentialRentalPrice.series} months={months12} showAxis />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col aspect-[3/1]">
          <div className="flex flex-col shrink-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулах, Зогсоолын борлуулалтын үнэ (₮)</div>
            <MarketValuationLegend series={marketSeries12.storageParkingSalePrice.series} />
          </div>
          <div className="flex-1 pt-4 min-h-0">
            <MarketValuationChart series={marketSeries12.storageParkingSalePrice.series} months={months12} showAxis />
          </div>
        </div>

        <div className="ds-card p-4 flex flex-col aspect-[3/1]">
          <div className="flex flex-col shrink-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Агуулах, Зогсоолын түрээслэх үнэ (₮/сар)</div>
            <MarketValuationLegend series={marketSeries12.storageParkingRentalPrice.series} />
          </div>
          <div className="flex-1 pt-4 min-h-0">
            <MarketValuationChart series={marketSeries12.storageParkingRentalPrice.series} months={months12} showAxis />
          </div>
        </div>
      </div>

      {/* Сар бүрийн зах зээлийн үнэ — бүх (Орон сууц/Зогсоол/Агуулах)
          үнийг НЭГ хүснэгэлд харуулна, Owners.jsx-ийн хүснэгэлийн
          дизайныг дахин ашигласан. Дээр нь "Сар нэмэх" товчтой түүлбэр */}
      <div className="ds-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Сар бүрийн зах зээлийн үнэ</div>
          <button className="ds-btn-primary" onClick={() => setAdding(true)}>+ Сар нэмэх</button>
        </div>
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3 w-[100px]">САР</th>
                  <th className="py-2.5 px-3">ОРОН СУУЦ БОРЛУУЛАЛТ</th>
                  {RENTAL_LABELS.map((label) => (
                    <th key={label} className="py-2.5 px-3">{label.toUpperCase()} ТҮРЭЭС</th>
                  ))}
                  <th className="py-2.5 px-3">ЗОГСООЛ БОРЛУУЛАЛТ</th>
                  <th className="py-2.5 px-3">ЗОГСООЛ ТҮРЭЭС</th>
                  <th className="py-2.5 px-3">АГУУЛАХ БОРЛУУЛАЛТ</th>
                  <th className="py-2.5 px-3">АГУУЛАХ ТҮРЭЭС</th>
                  <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {tableRows.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium">{row.month}</td>
                    <td className="py-2.5 px-3">{formatMoney(row.residentialSale)}₮</td>
                    {row.rental.map((v, i) => (
                      <td key={RENTAL_LABELS[i]} className="py-2.5 px-3">{formatMoney(v)}₮</td>
                    ))}
                    <td className="py-2.5 px-3">{formatMoney(row.parkingSale)}₮</td>
                    <td className="py-2.5 px-3">{formatMoney(row.parkingRental)}₮</td>
                    <td className="py-2.5 px-3">{formatMoney(row.storageSale)}₮</td>
                    <td className="py-2.5 px-3">{formatMoney(row.storageRental)}₮</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button className="ds-icon-btn" title="Засах" onClick={() => setEditing(row)}>
                        <EditIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EditMarketModal
        key={editing?.month || 'add'}
        open={!!editing || adding}
        onClose={() => { setEditing(null); setAdding(false); }}
        row={editing}
        onSave={handleSave}
      />
    </>
  );
}
