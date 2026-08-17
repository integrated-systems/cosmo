import { useState } from 'react';

// "Үл хөдлөх бүртгэл" (/property) хуудасны 4 табанд дахин ашиглагдах
// байр сонгогч+давхар/тоот grid карт — screenshot-той тохирсон визуал.
// 2026-08-17: одоохондоо бодит бүртгэлтэй (өмчлөгчтэй) нүүдтэй л
// харуулна — бүтэн (хоосон нүүдтэй) байрны зохион байгуулалт "Хаягжилт
// тохиргоо" (ирээдүйд бүтээгдэх СИСАДМИН хуудас) тохируулгаас хамаарна.
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

      <div className="ds-card !p-3 bg-slate-50 dark:bg-appbg">
        {activeBuilding && (
          <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{activeBuilding}-р байр</div>
        )}
        {floors.length === 0 && (
          <div className="text-sm text-darktext py-6 text-center">Мэдээлэл олдсонгүй</div>
        )}
        {floors.map((f) => {
          const items = buildingCells.filter((c) => c.floor === f);
          return (
            <div key={f} className="flex items-start gap-3 py-2 border-b border-bordercol/40 last:border-none">
              <div className="w-9 shrink-0 text-xs text-mutedtext pt-2">{f}F</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((it) => (
                  <button
                    key={it.id}
                    onClick={it.onClick}
                    title={it.sublabel}
                    className="px-2.5 py-1.5 rounded border border-blue-500/40 hover:border-blue-500 text-left transition-colors min-w-[68px]"
                  >
                    <div className="text-[11px] font-semibold text-slate-900 dark:text-white">{it.code}</div>
                    {it.sublabel && <div className="text-[10px] text-mutedtext truncate max-w-[90px]">{it.sublabel}</div>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
