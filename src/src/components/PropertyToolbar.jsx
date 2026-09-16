import { SearchIcon } from './icons/Icons';

// Үл хөдлөх бүртгэл (/property) хуудасны түүлбэр — OwnersToolbar.jsx-ийн
// загварыг дахин ашигласан (Rule of two). Энэ хуудасны дата Owners/
// Clientele-ээс дүгнэн гаргадаг тул "Нэмэх" товч байхгүй.
export default function PropertyToolbar({ search, onSearchChange, showPaymentFilters, year, yearOptions, monthOptions, month, onYearChange, onMonthChange }) {
  return (
    <div className="ds-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        {showPaymentFilters && (
          <>
            <select className="ds-select" value={year} onChange={(e) => onYearChange(Number(e.target.value))} title="Он (төлбөр төлөлтийн индикаторт хамаарна)">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="ds-select" value={month} onChange={(e) => onMonthChange(Number(e.target.value))} title="Сар (төлбөр төлөлтийн индикаторт хамаарна)">
              {monthOptions.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </>
        )}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Хайх (тоотоор)..."
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
      </div>
    </div>
  );
}
