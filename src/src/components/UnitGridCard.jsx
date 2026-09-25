// "Тоот, Зогсоол, Агуулах" (/property) хуудасны Тоот таб-ийн визуал grid
// карт — 2026-08-17 (5-р засвар) хэрэглэгчийн заасны дагуу бүрэн дахин
// зохион байгуулав:
// - Байр сонгогч (tab) БҮРМӨСӨН арилав — БүХ байрын grid-ийг НЭГ дэлгэцэнд
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

// 2026-09-24 (6-р шинэчлэл): хэрэглэгчийн заасны дагуу ТУРШИЛТ —
// background/текст ХАМТАД төлбөрийн eнгeeр солигдож байсан нь "хэт
// эрээн мяраан" харагдуулж байсан тул, ОДОО ЗӨВХӨН хүрээ л (border)
// төлбөрийн eнгeeр тодруулагдана — background, текст үргэлж
// НЕЙТРАЛЬ хэвээр үлдэнэ. (2-р туршилт: 1px, opacity 100% — үүнээс
// өмнө border-2, opacity 70% байсан.)
const COLOR_CLASSES = {
  customYellow: { border: 'border-[#f8f23d]' },
  customRed: { border: 'border-red-500' },
  customBlue: { border: 'border-blue-500' },
  customGreen: { border: 'border-emerald-500' },
};
const NEUTRAL_CLASS = 'bg-slate-500/[0.10] text-slate-400 dark:text-mutedtext hover:border-slate-400';
const NEUTRAL_BORDER = 'border-slate-500/30';

export default function UnitGridCard({ cells, hint, overdueColor = 'customYellow', atRiskColor = 'customRed', pendingColor = 'default', paidColor = 'customGreen' }) {
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
                          const colorKey = status === 'overdue' ? overdueColor : status === 'at_risk' ? atRiskColor : status === 'pending' ? pendingColor : status === 'paid' ? paidColor : null;
                          const borderClass = colorKey && colorKey !== 'default' && COLOR_CLASSES[colorKey] ? COLOR_CLASSES[colorKey].border : NEUTRAL_BORDER;
                          return (
                            <button
                              key={it.id}
                              onClick={it.onClick}
                              style={{ width: '58px', height: '44px' }}
                              className={`rounded flex flex-col items-center justify-center border shrink-0 transition-colors ${NEUTRAL_CLASS} ${borderClass}`}
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
