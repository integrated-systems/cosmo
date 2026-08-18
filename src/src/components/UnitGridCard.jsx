// "Тоот, Зогсоол, Агуулах" (/property) хуудасны Тоот таб-ийн визуал grid
// карт — 2026-08-17 (5-р засвар) хэрэглэгчийн заасны дагуу бүрэн дахин
// зохион байгуулав:
// - Байр сонгогч (tab) БҮРМӨСӨН арилав — БҮХ байрын grid-ийг НЭГ дэлгэцэнд
//   зэрэгцүүлэн (баруун тийш цувуулж, дэлгэцний өргөнөөс хэтэрвэл шинэ
//   мөр эхэлдэг flex-wrap) харуулна. Байрууд 1-р давхараараа (доод
//   талаараа) НЭГ шугаманд байрлана (`items-end`).
// - өнгө: төлбөрийн үлдэгдэлгүй (өмчлөгчгүй ч хамаарна) — САААРАЛ,
//   үлдэгдэлтэй бол УЛААН. Цэнхэр өнгө бүрмөсүн арилав.
// TODO: бодит payments backend байхгүй тул "үлдэгдэлтэй эсэх"-ийг
// screenshot-той тохирсон ЖИШЭЭ хэвээр (индексээр эргэлдэнэ) харуулна.
const EXAMPLE_HAS_BALANCE = [false, false, true, false, false, true, false, true, false, false, true, false];

export default function UnitGridCard({ cells, hint }) {
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
                  const items = buildingCells.filter((c) => c.floor === f);
                  return (
                    <div key={f} className="flex items-start gap-2">
                      <div className="w-7 shrink-0 text-[11px] text-mutedtext pt-1.5">{f}F</div>
                      <div className="flex flex-wrap gap-1">
                        {items.map((it, idx) => {
                          const hasBalance = EXAMPLE_HAS_BALANCE[(it.exampleIdx ?? idx) % EXAMPLE_HAS_BALANCE.length];
                          const colorClass = (it.vacant || !hasBalance)
                            ? 'bg-slate-500/[0.10] border-slate-500/30 text-slate-400 dark:text-mutedtext hover:border-slate-400'
                            : 'bg-red-500/[0.12] border-red-500/40 text-customRed hover:border-customRed';
                          return (
                            <button
                              key={it.id}
                              onClick={it.onClick}
                              style={{ width: '58px', height: '44px' }}
                              className={`rounded flex flex-col items-center justify-center border shrink-0 transition-colors ${colorClass}`}
                            >
                              <div className="text-[11px] font-semibold leading-tight">{it.code}</div>
                              {it.area && <div className="text-[9px] opacity-80 leading-tight">{it.area}м²</div>}
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
