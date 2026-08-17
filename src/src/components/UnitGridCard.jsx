import { useState } from 'react';

// "Үл хөдлөх бүртгэл" (/property) хуудасны байр сонгогч+давхар/тоот
// grid карт — 2026-08-17 хэрэглэгчийн заасны дагуу дахин зохион
// байгуулав: тогтмол px хэмжээтэй тэгш хэмт tile (rounded 4px), доторх
// нь ЗӨВХӨН дугаар+м², өнгө нь төлбөрийн үлдэгдэлтэй эсэхээс хамаарна.
// Менежерийн зорилго: аль байрны төлбөр ямар байгааг нүдэн баримжаагаар
// үнэлэх — төлбөрийн үлдэгдэлгүй бол customBlue, үлдэгдэлтэй бол
// customRed (Owners.jsx-ийн мөрийн дугаарын өнгөний дүрэмтэй адил).
//
// TODO: бодит payments backend байхгүй тул "үлдэгдэлтэй эсэх"-ийг
// screenshot-той тохирсон ЖИШЭЭ хэвээр (индексээр эргэлдэнэ) харуулна.
const EXAMPLE_HAS_BALANCE = [false, false, true, false, false, true, false, true, false, false, true, false];

export default function UnitGridCard({ cells, hint }) {
  const buildings = [...new Set(cells.map((c) => c.buildingNo))].sort((a, b) => a - b);
  const [selectedBuilding, setSelectedBuilding] = useState(buildings[0]);
  const activeBuilding = buildings.includes(selectedBuilding) ? selectedBuilding : buildings[0];

  const buildingCells = cells.filter((c) => c.buildingNo === activeBuilding);
  const floors = [...new Set(buildingCells.map((c) => c.floor))].sort((a, b) => (b > a ? 1 : -1));

  if (buildings.length === 0) {
    return <div className="ds-card p-8 text-center text-darktext text-sm">Мэдээлэл олдсонгүй</div>;
  }

  return (
    <div className="ds-card p-4">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {buildings.map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBuilding(b)}
            className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
              b === activeBuilding
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-bordercol text-mutedtext hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {hint && <div className="text-xs text-mutedtext mb-3">{hint}</div>}

      {floors.length === 0 && (
        <div className="text-sm text-darktext py-6 text-center">Мэдээлэл олдсонгүй</div>
      )}
      {floors.map((f) => {
        const items = buildingCells.filter((c) => c.floor === f);
        return (
          <div key={f} className="flex items-start gap-2 py-1">
            <div className="w-7 shrink-0 text-[11px] text-mutedtext pt-2.5">{f}F</div>
            <div className="flex flex-wrap gap-1">
              {items.map((it, idx) => {
                const hasBalance = EXAMPLE_HAS_BALANCE[(it.exampleIdx ?? idx) % EXAMPLE_HAS_BALANCE.length];
                return (
                  <button
                    key={it.id}
                    onClick={it.onClick}
                    style={{ width: '68px', height: '46px' }}
                    className={`rounded flex flex-col items-center justify-center border shrink-0 transition-colors ${
                      hasBalance
                        ? 'bg-red-500/[0.12] border-red-500/40 text-customRed hover:border-customRed'
                        : 'bg-blue-500/[0.12] border-blue-500/40 text-customBlue hover:border-customBlue'
                    }`}
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
  );
}
