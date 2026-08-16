import { SearchIcon } from './icons/Icons';

// Owners.jsx-ийн түүлбэр (шүүлтүүр+хайлт+үйлдлийн товчнууд) — 2026-08-15
// хэрэглэгчийн заасны дагуу тусдаа компонент болгов (Rule of two,
// ирээдүйд бусад хүснэгэлт хуудсанд дахин ашиглагдана).
export default function OwnersToolbar({ search, onSearchChange, onAddClick }) {
  return (
    <div className="ds-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        <select className="ds-select">
          <option>Бүх байр</option>
        </select>
        <select className="ds-select">
          <option>Бүх орц</option>
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
