import { SearchIcon } from './icons/Icons';

// Owners.jsx-ийн тvvлбэр (шvvлтvvр+хайлт+vйлдлийн товчнууд) — 2026-08-15
// хэрэглэгчийн заасны дагуу тусдаа компонент болгов (Rule of two,
// ирээдvйд бусад хvснэгэлт хуудсанд дахин ашиглагдана).
// 2026-08-19: "Байр" dropdown статик placeholder-ээс bodit Supabase
// (unit_layouts) дата руу динамик болов; "Орц" dropdown БvРМвСвН
// арилгав — 100-200 орцноос шvvх шаардлага бодит хэрэглээнд гардаггvй.
export default function OwnersToolbar({ search, onSearchChange, onAddClick, buildingOptions, buildingFilter, onBuildingFilterChange }) {
  return (
    <div className="ds-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        <select className="ds-select" value={buildingFilter} onChange={(e) => onBuildingFilterChange(e.target.value)}>
          <option value="">Бүх байр</option>
          {buildingOptions.map((b) => (
            <option key={b} value={b}>{b}-р байр</option>
          ))}
        </select>
        <div className="relative min-w-[200px]">
          <input
            type="text"
            placeholder="Хайх (тоот, нэр, утас, имэйл)..."
            className="ds-input w-full pl-8"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <SearchIcon className="w-4 h-4 text-slate-400 dark:text-mutedtext absolute left-2.5 top-2" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="ds-btn-secondary">Хэвлэх</button>
        <button className="ds-btn-secondary">Экспортлох</button>
        <button className="ds-btn-primary" onClick={onAddClick}>+ Сууц өмчлөгч нэмэх</button>
      </div>
    </div>
  );
}
