import { SearchIcon } from './icons/Icons';

// Clientele.jsx-ийн түүлбэр — OwnersToolbar.jsx-ийн загварыг дахин
// ашигласан (Rule of two).
export default function ClienteleToolbar({ search, onSearchChange, onAddClick }) {
  return (
    <div className="ds-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Хайх (хуулийн этгээд, регистр, утас, имэйл)..."
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
        <button className="ds-btn-primary" onClick={onAddClick}>+ Аж ахуйн нэгж нэмэх</button>
      </div>
    </div>
  );
}
