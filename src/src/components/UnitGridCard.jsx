// "Тоот, Зогсоол, Агуулах" (/property) хуудасны Тоот таб-ийн визуал grid
// карт — 2026-08-17 (5-р засвар) хэрэглэгчийн заасны дагуу бүрэн дахин
// зохион байгуулав:
// - Байр сонгогч (tab) БүРМӨСөН арилав — БүХ байрын grid-ийг НЭГ дэлгэцэнд
//   зэрэгцүүлэн (баруун тийш цувуулж, дэлгэцний eргөнeeс хэтэрвэл шинэ
//   мөр эхэлдэг flex-wrap) харуулна. Байрууд 1-р давхараараа (доод
//   талаараа) НЭГ шугаманд байрлана (`items-end`).
// 2026-09-20 БОДИТ АЛДАА ЗАСАВ — хэрэглэгчийн заасны дагуу 4 төлөвт
// (paid/pending/overdue/at_risk) болгов, eнгийг Санхүү тохиргооноос
// (overdueColor/atRiskColor) уншина (PaymentBadges.jsx-тэй ЯГ ИЖИЛ
// зарчим).
// 2026-09-13 (2-р шинэчлэл): Property.jsx бодит invoices хүснэгэлээс
// (useInvoicePayments hook) төлөвийг тооцоолж, `cells`-ийн `paymentStatus`
// талбараар шууд дамжуулдаг болов — энэ компонент eeрee backend/schema-г
// мэдэхгүй, зөвхөн ирсэн 'paid'|'pending'|'overdue'|'at_risk'|'none'
// үнэ цэнийг л зурна.

const COLOR_CLASSES = {
  customYellow: { bg: 'bg-[#f8f23d1a]', border: 'border-[#f8f23d66]', text: 'text-customYellow', hoverBorder: 'hover:border-customYellow' },
  customRed: { bg: 'bg-red-500/[0.12]', border: 'border-red-500/40', text: 'text-customRed', hoverBorder: 'hover:border-customRed' },
  customBlue: { bg: 'bg-blue-500/[0.12]', border: 'border-blue-500/40', text: 'text-customBlue', hoverBorder: 'hover:border-customBlue' },
  customGreen: { bg: 'bg-emerald-500/[0.12]', border: 'border-emerald-500/40', text: 'text-customGreen', hoverBorder: 'hover:border-customGreen' },
};

export default function UnitGridCard({ cells, hint, overdueColor = 'customYellow', atRiskColor = 'customRed' }) {
  const buildings = [...new Set(cells.map((c) => c.buildingNo))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  if (buildings.length === 0) {
    return <div className="ds-card p-8 text-center text-darktext text-sm">Мэдээлэл олдсонгүй</div>;
  }

  return (
    <div className="ds-card p-4">
      {hint && <div className="text-xs text-mutedtext mb-3">{hint}</div>}

      <div className="flex flex-wrap items-end gap-4">
        {buildings.map((b) => {
          const buildingCells = cells.filter((c) => c.buildingNo === b);
          const floors = [...new Set(buildingCells.map((c) => c.floor))].sort((a, b2) => (b2 > a ? 1 : -1));
          return (
            <div key={b} className="shrink-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">{b}</div>
              <div className="flex flex-col gap-1">
                {floors.map((f) => {
                  const items = buildingCells
                    .filter((c) => c.floor === f)
                    .sort((a, b2) => (a.position ?? 0) - (b2.position ?? 0));
                  return (
                    <div key={f} className="flex items-start gap-2">
                      <div className="w-7 shrink-0 text-[11px] text-mutedtext pt-1.5">{f}F</div>
                      <div className="flex flex-wrap gap-1">
                        {items.map((it, idx) => {
                          const status = it.vacant ? 'none' : (it.paymentStatus || 'none');
                          const colorKey = status === 'overdue' ? overdueColor : status === 'at_risk' ? atRiskColor : null;
                          const colorClass = colorKey && COLOR_CLASSES[colorKey]
                            ? `${COLOR_CLASSES[colorKey].bg} ${COLOR_CLASSES[colorKey].border} ${COLOR_CLASSES[colorKey].text} ${COLOR_CLASSES[colorKey].hoverBorder}`
                            : 'bg-slate-500/[0.10] border-slate-500/30 text-slate-400 dark:text-mutedtext hover:border-slate-400';
                          return (
                            <button
                              key={it.id}
                              onClick={it.onClick}
                              style={{ width: '58px', height: '44px' }}
                              className={`rounded flex flex-col items-center justify-center border shrink-0 transition-colors ${colorClass}`}
                            >
                              <div className="text-[10px] font-semibold leading-tight">{it.code}</div>
                              {it.area && <div className="text-[8px] opacity-80 leading-tight">{it.area}м²</div>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
