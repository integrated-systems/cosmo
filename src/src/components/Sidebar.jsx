import { NavLink } from 'react-router-dom';
import { MENU_SECTIONS, SIDEBAR_STATS, SUPERSYSADMIN } from '../config/menu';

const navItemBase = 'px-4 py-1.5 text-[13px] cursor-pointer flex items-center justify-between no-underline transition-colors';
const navItemInactive = 'text-slate-600 dark:text-mutedtext hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-menuhover';
const navItemActive = 'text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-menuactive border-r-[3px] border-blue-600 dark:border-blue-500';

export default function Sidebar({ isOpen, isMobile, onToggle }) {
  return (
    <aside
      className={`w-[208px] h-screen bg-slate-50 dark:bg-sidebg border-r border-slate-200 dark:border-bordercol
        flex flex-col fixed top-0 left-0 transition-transform duration-300 ease-in-out z-[1000]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Хураах товч */}
      <button
        onClick={onToggle}
        title="Сайдбар хураах/нээх"
        className="absolute -right-[13px] top-1/2 -translate-y-1/2 w-[26px] h-[26px] bg-white dark:bg-sidebg
          border border-slate-200 dark:border-bordercol rounded-full text-mutedtext flex items-center justify-center
          cursor-pointer z-[1001] transition-colors hover:bg-slate-100 dark:hover:bg-bordercol
          hover:text-slate-900 dark:hover:text-white shadow-md"
      >
        <svg
          className={`w-[14px] h-[14px] transition-transform duration-300 ease-in-out ${!isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Толгой хэсэг — олон СөХ (multi-tenant) архитектур: дээд мөр
          Integrated Systems брэнд (тогтмол), доод мөр тухайн СөХ-ийн нэр
          (backend-ээс dynamic ирнэ, одоогоор жишээ утга). */}
      <div className="h-[50px] px-3 flex items-center gap-2 border-b border-slate-200 dark:border-bordercol">
        <img src={`${import.meta.env.BASE_URL}logicon.png`} alt="" className="w-7 h-7 shrink-0 rounded-md" />
        <div className="min-w-0 leading-[1.2]">
          <div className="font-semibold text-slate-900 dark:text-white text-[13px] truncate">COSMO™</div>
          <div className="text-slate-500 dark:text-mutedtext text-[11px] truncate">Integrated Systems®</div>
        </div>
      </div>

      {/* Меню хэсэг */}
      <nav className="flex-1 overflow-y-auto py-2">
        {MENU_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] text-darktext px-4 py-1.5 tracking-[0.5px] font-bold uppercase mt-1.5 first:mt-0">
              {section.title}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) => `${navItemBase} ${isActive ? navItemActive : navItemInactive}`}
              >
                <span>{item.label}</span>
                {item.badge != null && (
                  <span className="bg-customRed text-white text-[10px] px-1.5 py-0.5 rounded-[10px] font-semibold leading-none">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
        {/* SUPERSYSADMIN — платформын дээд түвшний админ, 7 бүлгээс тусад нь */}
        <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-bordercol">
          <NavLink
            to={SUPERSYSADMIN.path}
            className={({ isActive }) => `${navItemBase} font-bold ${isActive ? navItemActive : navItemInactive}`}
          >
            <span>{SUPERSYSADMIN.label}</span>
          </NavLink>
        </div>
      </nav>

      {/* Доод карт хэсэг */}
      <div className="p-2 border-t border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg">
        <div className="bg-white dark:bg-appbg border border-slate-200 dark:border-bordercol rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[12px] font-semibold leading-[1.2] text-slate-900 dark:text-white">SuperAdmin</div>
              <div className="text-[10px] text-slate-500 dark:text-mutedtext mt-[1px] leading-[1.2]">Админ</div>
            </div>
            <button
              title="Гарах"
              className="bg-transparent border-none cursor-pointer text-slate-500 dark:text-mutedtext flex items-center
                justify-center p-0.5 transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 16l4-4m0 0-4-4m4 4H8m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-mutedtext leading-[1.5]">
            {SIDEBAR_STATS.map((s) => (
              <div key={s.label} className="flex justify-between">
                <span>{s.label}</span>
                {s.value != null && <span>{s.value}</span>}
              </div>
            ))}
          </div>
          <div className="mt-2 text-[9px] text-darktext">Management system v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}
