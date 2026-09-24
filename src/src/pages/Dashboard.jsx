import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatMoney, formatDate } from '../lib/format';
import MarketValuationChart, { MarketValuationLegend } from '../components/MarketValuationChart';
import { deriveMarketSeries } from '../data/realEstateMarket';
import { useMarketRows } from '../hooks/useMarketRows';
import { useTenantStats } from '../hooks/useTenantStats';
import { useTopUsageAssets } from '../hooks/useTopUsageAssets';
import { useCurrentMonthInvoiced } from '../hooks/useCurrentMonthInvoiced';
import { useDashboardFinance } from '../hooks/useDashboardFinance';
import UsageProgressBar from '../components/UsageProgressBar';

// "Real Estate market" (/restmarket) хуудасны сүүлийн 2 сарын утгаас
// хувийн өөрчлөлт тооцно — Dashboard-ийн дээд утга/сумны индикатор энэ
// НЭГ эх сурвалжаас (Supabase `restmarket`, tenant тус бүрд тусдаа) уншина.
function computeChangePct(data) {
  if (!data || data.length === 0) return 0;
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  if (!prev) return 0;
  return ((last - prev) / prev) * 100;
}


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const { hoaId } = useParams();
  const { rows, loading } = useMarketRows(hoaId);
  const { stats: tenantStats } = useTenantStats(hoaId);
  const topUsageAssets = useTopUsageAssets(hoaId, 5);
  const { stats: invoicedStats } = useCurrentMonthInvoiced(hoaId);
  const { data: fin, loading: finLoading } = useDashboardFinance(hoaId);
  const marketSeries = deriveMarketSeries(rows);
  const last12Rows = rows.slice(-12);
  const marketSeries12 = deriveMarketSeries(last12Rows);
  const months12 = last12Rows.map((r) => r.month);
  const STATUS_LABEL = { paid: 'Төлсөн', pending: 'Хүлээлттэй', overdue: 'Хугацаа хэтэрсэн', at_risk: 'Эрсдэлтэй' };
  // 2026-09-24 (82): Төлбөрийн явц/өртэй картны 4 төлөвийн өнгийг
  // Санхүү тохиргоо > НББ > Төлбөрийн хоцрогдол-оос АВТОМАТААР уншина
  // (PaymentBadges.jsx-тэй ЯГ ИЖИЛ дансны нэр — Rule of two/three) —
  // Owners/Clientele/Property хуудасны индикатор/слоттой ЯГ ИЖИЛ
  // өнгө харагдана.
  const COLOR_KEY_TO_TEXT_CLASS = { customYellow: 'text-customYellow', customRed: 'text-customRed', customBlue: 'text-customBlue', customGreen: 'text-customGreen' };
  const colorKeyToTextClass = (key) => (key && key !== 'default' && COLOR_KEY_TO_TEXT_CLASS[key]) || 'text-slate-900 dark:text-white';
  const STATUS_COLOR = fin ? {
    paid: colorKeyToTextClass(fin.statusColors.paid),
    pending: colorKeyToTextClass(fin.statusColors.pending),
    overdue: colorKeyToTextClass(fin.statusColors.overdue),
    at_risk: colorKeyToTextClass(fin.statusColors.atRisk),
  } : { paid: 'text-customGreen', pending: 'text-slate-900 dark:text-white', overdue: 'text-customYellow', at_risk: 'text-customRed' };
  const maxMonthlyValue = Math.max(1, ...(fin ? [...fin.monthlyIncome, ...fin.monthlyExpense] : [1]));
  const [debtorSort, setDebtorSort] = useState('amount');
  const displayedDebtors = fin
    ? [...fin.topDebtors]
        .sort((a, b) => (debtorSort === 'months' ? (b.monthsOverdue - a.monthsOverdue || b.amount - a.amount) : (b.amount - a.amount)))
        .slice(0, 8)
    : [];

  return (
    <>
      {/* 1. Дээд талын 4 үндсэн мэдээллийн карт */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {/* 2026-09-13 БОДИТ АЛДАА ЗАСАВ — placeholder статик тоо
            (14,385,000₮) байсныг бодит invoices хүснэгэлээс уншиж
            (useCurrentMonthInvoiced hook) динамик болгов. Картын
            css/дизайн (StatCard компонент) огт хөндөгүй, зөвхөн
            дамжуулж буй value/detail props-ыг л бодит болгов. Мөн
            "Зогсоол, агуулах дангаар өмчлөгч" мөр нэмэв (нэхэмжилсэн
            дүнг бүлэглэж үзүүлж байгаа тул 3 дахь бүлэг ч хамрагдах
            ёстой). */}
        <StatCard label="ЭНЭ САРД НЭХЭМЖИЛСЭН" value={`${formatMoney(invoicedStats?.total || 0)}₮`} valueColor="text-customBlue"
          detail={[
            `Сууц өмчлөгч - ${formatMoney(invoicedStats?.unitTotal || 0)}₮`,
            `Зогсоол, агуулах дангаар өмчлөгч - ${formatMoney(invoicedStats?.spotOnlyTotal || 0)}₮`,
            `Талбай өмчлөгч - ${formatMoney(invoicedStats?.clientTotal || 0)}₮`,
          ]} />
        <StatCard label="ЭНЭ САРЫН ОРЛОГО" value={`${formatMoney(fin?.currentMonthIncome?.total || 0)}₮`} valueColor="text-customGreen"
          detail={fin ? [
            `Сууц өмчлөгч - ${fin.currentMonthIncome.unit.paidCount}/${fin.currentMonthIncome.unit.count}`,
            `Зогсоол, агуулах дангаар өмчлөгч - ${fin.currentMonthIncome.spot.paidCount}/${fin.currentMonthIncome.spot.count}`,
            `Талбай өмчлөгч - ${fin.currentMonthIncome.client.paidCount}/${fin.currentMonthIncome.client.count}`,
          ] : []} />
        <StatCard label="НИЙТ ӨР АВЛАГА" value={`${formatMoney(fin?.totalDebt?.total || 0)}₮`} valueColor="text-customRed"
          detail={fin ? [
            `Сууц өмчлөгч - ${fin.totalDebt.unit.count}/${fin.totalDebt.unit.total}`,
            `Зогсоол, агуулах дангаар өмчлөгч - ${fin.totalDebt.spot.count}/${fin.totalDebt.spot.total}`,
            `Талбай өмчлөгч - ${fin.totalDebt.client.count}/${fin.totalDebt.client.total}`,
          ] : []} />
        <StatCard label="НИЙТ ОРШИН СУУГЧ" value={tenantStats ? String(tenantStats.residentCount) : '—'} valueColor="text-slate-900 dark:text-text"
          detail={tenantStats ? [`0-6 насны хүүхэд - ${tenantStats.child05}`, `6-18 насны хүүхэд - ${tenantStats.child618}`] : []} />
      </div>

      {/* 2. Орлого/Зарлага график + Төлбөрийн явц */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="ds-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Орлого, зарлага (сараар)</div>
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
            {MONTHS.map((m, i) => {
              const income = fin?.monthlyIncome?.[i] || 0;
              const expense = fin?.monthlyExpense?.[i] || 0;
              const incomeH = Math.max(2, Math.round((income / maxMonthlyValue) * 100));
              const expenseH = Math.max(2, Math.round((expense / maxMonthlyValue) * 100));
              return (
                <div key={m} className="w-full h-full flex flex-col items-center justify-end gap-0.5" title={`${m}: орлого ${formatMoney(income)}₮, зарлага ${formatMoney(expense)}₮`}>
                  <div className="w-full flex-1 min-h-0 flex items-end justify-center gap-0.5">
                    <div className="w-1/2 bg-customBlue rounded-t" style={{ height: `${incomeH}%` }} />
                    <div className="w-1/2 bg-customGreen rounded-t" style={{ height: `${expenseH}%` }} />
                  </div>
                  <span className="text-[9px] text-darktext shrink-0">{m}</span>
                </div>
              );
            })}
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
            <div className="flex justify-between items-center"><span>Нийт төлбөр төлөгч тоо</span><span className="text-slate-900 dark:text-white font-medium">{fin?.paymentProgress?.totalPayers ?? '—'}</span></div>
            <div className="flex justify-between items-center"><span>Төлбөр төлсөн</span><span className={`${STATUS_COLOR.paid} font-medium`}>{fin?.paymentProgress?.paidCount ?? '—'}</span></div>
            <div className="flex justify-between items-center"><span>Хүлээлттэй</span><span className={`${STATUS_COLOR.pending} font-medium`}>{fin?.paymentProgress?.pendingCount ?? '—'}</span></div>
            <div className="flex justify-between items-center"><span>Хугацаа хэтэрсэн</span><span className={`${STATUS_COLOR.overdue} font-medium`}>{fin?.paymentProgress?.overdueCount ?? '—'}</span></div>
            <div className="flex justify-between items-center"><span>Эрсдэлтэй</span><span className={`${STATUS_COLOR.at_risk} font-medium`}>{fin?.paymentProgress?.atRiskCount ?? '—'}</span></div>
            <div className="border-t border-slate-200 dark:border-bordercol pt-2 flex justify-between items-center"><span>Энэ сарын төлбөрийн явц</span><span className="text-slate-900 dark:text-white font-medium">{fin?.paymentProgress?.progressPct ?? 0}%</span></div>
            <div className="flex justify-between items-center"><span>Энэ сарын өр авлагын харьцаа</span><span className="text-slate-900 dark:text-white font-medium">{fin?.paymentProgress?.debtRatioPct ?? 0}%</span></div>
          </div>
        </div>
      </div>

      {/* 3. Сүүлийн гүйлгээ + Төлбөрийн өртэй */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="ds-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Сүүлийн гүйлгээ</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-mutedtext">
              <thead className="border-b border-slate-200 dark:border-bordercol text-darktext uppercase text-[10px]">
                <tr>
                  <th className="pb-2">ТООТ/НЭР</th><th className="pb-2">ДҮН</th>
                  <th className="pb-2">ТӨЛБӨРИЙН ХЭЛБЭР</th><th className="pb-2 text-right">ОГНОО</th>
                </tr>
              </thead>
              <tbody>
                {finLoading ? (
                  <tr><td colSpan={4} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
                ) : !fin || fin.recentTransactions.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
                ) : fin.recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-bordercol/30 last:border-0">
                    <td className="py-2 text-slate-900 dark:text-white font-medium">{t.name}{t.sub ? <span className="text-darktext font-normal"> · {t.sub}</span> : null}</td>
                    <td className="py-2 text-customGreen font-medium">{formatMoney(t.amount)}₮</td>
                    <td className="py-2">Төлбөр хүлээн авав</td>
                    <td className="py-2 text-right">{formatDate(t.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ds-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Төлбөрийн өртэй</div>
            <select className="ds-select" value={debtorSort} onChange={(e) => setDebtorSort(e.target.value)}>
              <option value="amount">Дүнгээр</option>
              <option value="months">Сараар</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500 dark:text-mutedtext">
              <thead className="border-b border-slate-200 dark:border-bordercol text-darktext uppercase text-[10px]">
                <tr>
                  <th className="pb-2">ТООТ/НЭР</th><th className="pb-2">ТӨРӨЛ</th>
                  <th className="pb-2">ХУГАЦАА</th><th className="pb-2 text-right">ДҮН</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {finLoading ? (
                  <tr><td colSpan={4} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
                ) : !fin || displayedDebtors.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-darktext">Өр авлагагүй</td></tr>
                ) : displayedDebtors.map((d, i) => (
                  <tr key={`${d.name}-${i}`}>
                    <td className="py-2 text-slate-900 dark:text-white font-medium">{d.name}</td>
                    <td className={`py-2 ${STATUS_COLOR[d.status] || ''}`}>{d.sub}{d.sub ? ' · ' : ''}{STATUS_LABEL[d.status] || d.status}</td>
                    <td className="py-2">{d.monthsOverdue} сар</td>
                    <td className="py-2 text-right text-customRed font-medium">{formatMoney(d.amount)}₮</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Ашиглалтын хугацаа дуусч буй Үндсэн хөрөнгө — 2026-09-08:
          Үндсэн хөрөнгийн бүртгэлтэй динамик холбов (useTopUsageAssets),
          хамгийн ойрхон дуусаж буй 5-ыг дээрээс доош (тулсангаас нь
          арай бага тулсан руу) progress bar-тай нь харуулна. */}
      <div className="ds-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Ашиглалтын хугацаа дуусч буй Үндсэн хөрөнгө</div>
          <Link to={`/${hoaId}/fixedassets`} className="text-xs text-blue-500 hover:underline">Бүгдийг харах →</Link>
        </div>
        <div className="flex flex-col gap-3">
          {topUsageAssets.loading && (
            <div className="text-xs text-slate-500 dark:text-mutedtext">Ачаалж байна...</div>
          )}
          {!topUsageAssets.loading && topUsageAssets.assets.length === 0 && (
            <div className="text-xs text-slate-500 dark:text-mutedtext">Мэдээлэл алга</div>
          )}
          {!topUsageAssets.loading && topUsageAssets.assets.map((a) => (
            <div key={a.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 dark:text-mutedtext">{a.name}</span>
                <span className="text-slate-900 dark:text-white font-medium">{a.usagePct}%</span>
              </div>
              <UsageProgressBar pct={a.usagePct} />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Доод талын том график картууд — картын урт/өргөний харьцаа
          ТОГТМОЛ 3:1 (aspect-[3/1]). 4 чарт БҮГД хэвтээ тэнхлэг
          (сүүлийн 12 сар)+дугуй маркер+hover попап-той. Tenant-д restmarket
          дата байхгүй үед хоосон мэдэгдэл харуулна. */}
      {!loading && rows.length === 0 ? (
        <div className="ds-card p-6 text-center text-slate-500 dark:text-mutedtext text-sm">
          Зах зээлийн үнийн мэдээлэл алга байна — /restmarket хуудаснаас "Сар нэмэх"-ээр оруулна уу.
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div className="ds-card p-4 flex flex-col aspect-[3/1]">
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
      )}
    </>
  );
}
