import { NEWS_CATEGORIES } from '../data/newsCategories';

// "Мэдээ, мэдээлэл" (/news) хуудасны түүлбэр — 2026-08-19 screenshot-оор
// өгсөн ганцхан "Бүгдийг харах" ангилалын dropdown (PropertyToolbar шиг
// хайлт биш, категориор шvvнэ).
export default function NewsToolbar({ category, onCategoryChange }) {
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
    </div>
  );
}
