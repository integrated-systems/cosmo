import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MENU_SECTIONS, SUPERSYSADMIN, SUPERSYSADMIN_TENANT_ITEMS } from '../config/menu';
import { MailIcon, SunIcon, MoonIcon } from './icons/Icons';

const ALL_ITEMS = [...MENU_SECTIONS.flatMap((s) => s.items), SUPERSYSADMIN, ...SUPERSYSADMIN_TENANT_ITEMS];

export default function Topbar({ theme, onToggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hoaId } = useParams();
  // URL нь /:hoaId/xxx хэлбэртэй тул эхний segment-ийг (hoaId) тайлж
  // match хийнэ.
  const pathAfterHoa = location.pathname.replace(/^\/[^/]+/, '');
  const current = ALL_ITEMS.find((i) => i.path === pathAfterHoa);
  const title = current?.label || 'Хянах самбар';

  return (
    <header className="h-[50px] bg-white dark:bg-appbg border-b border-slate-200 dark:border-bordercol
      flex items-center px-5 sticky top-0 z-[900] justify-between">
      <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</span>

      <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(`/${hoaId}/emails`)}
        title="Имэйл"
        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
          flex items-center justify-center text-slate-600 dark:text-mutedtext hover:text-slate-900
          dark:hover:text-white transition-colors cursor-pointer"
      >
        <MailIcon />
      </button>

      <button
        onClick={onToggleTheme}
        title="Тема солих"
        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
          flex items-center justify-center text-slate-600 dark:text-mutedtext hover:text-slate-900
          dark:hover:text-white transition-colors cursor-pointer"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      </div>
    </header>
  );
}
