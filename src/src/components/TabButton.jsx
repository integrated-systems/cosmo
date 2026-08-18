// Дахин ашиглагдах таб товч — Property.jsx-ийн "Тоот/Зогсоол/Агуулах"
// дизайнаас гарсан (2026-08-19). Background ашиглахгүй, зөвхөн хүрээгээр
// (border) идэвхтэй/hover төлөвийг ялгана: idle=bordercol, active/hover=цэнхэр.
export default function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-4 flex items-center text-sm font-medium rounded border transition-colors ${
        active
          ? 'border-customBlue text-slate-900 dark:text-white'
          : 'border-bordercol text-mutedtext hover:border-customBlue hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
