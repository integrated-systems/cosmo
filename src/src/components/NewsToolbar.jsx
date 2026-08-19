import { NEWS_CATEGORIES } from '../data/newsCategories';

// "Мэдээ, мэдээлэл" (/news) хуудасны түүлбэр — 2026-08-19 screenshot-оор
// өгсөн ганцхан "Бүгдийг харах" ангилалын dropdown (PropertyToolbar шиг
// хайлт биш, категориор шvvнэ). onCreateClick заасан vед (Мэдээний
// агрегат таб идэвхтэй vед) баруун талд "+ Шинэ мэдээ үүсгэх" товч нэмнэ.
export default function NewsToolbar({ category, onCategoryChange, onCreateClick }) {
  return (
    <div className="ds-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="ds-select min-w-[200px]"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">Бүгдийг харах</option>
          {NEWS_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      {onCreateClick && (
        <button className="ds-btn-primary" onClick={onCreateClick}>+ Шинэ мэдээ үүсгэх</button>
      )}
    </div>
  );
}
