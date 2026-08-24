import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MENU_SECTIONS, SUPERSYSADMIN, SUPERSYSADMIN_TENANT_ITEMS } from '../config/menu';
import { MailIcon, SunIcon, MoonIcon } from './icons/Icons';
import { supabase } from '../lib/supabaseClient';

const ALL_ITEMS = [...MENU_SECTIONS.flatMap((s) => s.items), SUPERSYSADMIN, ...SUPERSYSADMIN_TENANT_ITEMS];

// YYYY/MM/DD формат — хэрэглэгчийн тодорхой заасан.
function formatExpiryDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function Topbar({ theme, onToggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hoaId } = useParams();
  const [expiryLabel, setExpiryLabel] = useState(null);

  // 2026-08-19 хэрэглэгч тодорхой заасан: "Захиалах" товчны дизайн/
  // хүрээг ОГТ өөрчлөхгүйгээр, дотор нь тухайн tenant-ийн Төлбөрийн
  // хугацаа (trial_ends_at) дуусах огноог YYYY/MM/DD форматаар
  // харуулна (аль ч багцийн tenant-д хамаарна — зөвхөн Trial биш).
  // Огноо байхгүй бол хуучин "Захиалах" текст хэвээрээ үлдэнэ.
  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    supabase.from('tenants').select('trial_ends_at').eq('id', hoaId).single().then(({ data }) => {
      if (!cancelled) setExpiryLabel(data?.trial_ends_at ? formatExpiryDate(data.trial_ends_at) : null);
    });
    return () => { cancelled = true; };
  }, [hoaId]);

  // URL нь /:hoaId/xxx хэлбэртэй тул эхний segment-ийг (hoaId) тайлж
  // match хийнэ.
  const pathAfterHoa = location.pathname.replace(/^\/[^/]+/, '');
  const current = ALL_ITEMS.find((i) => i.path === pathAfterHoa);
  const title = current?.label || 'Хянах самбар';

  return (
    <header className="h-[50px] bg-white dark:bg-appbg border-b border-slate-200 dark:border-bordercol
      flex items-center pl-5 pr-2.5 sticky top-0 z-[900] justify-between">
      <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</span>

      <div className="flex items-center gap-2">
      <button
        onClick={() => {}}
        title={expiryLabel ? `Төлбөрийн хугацаа дуусах: ${expiryLabel}` : 'Захиалах'}
        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
          flex items-center justify-center text-[12px] font-medium text-slate-600 dark:text-mutedtext hover:text-slate-900
          dark:hover:text-white transition-colors cursor-pointer"
      >
        {expiryLabel || 'Захиалах'}
      </button>

      <button
        onClick={() => {}}
        title="Сунгах"
        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
          flex items-center justify-center text-[12px] font-medium text-slate-600 dark:text-mutedtext hover:text-slate-900
          dark:hover:text-white transition-colors cursor-pointer"
      >
        Сунгах
      </button>

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
