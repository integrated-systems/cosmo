import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './lib/AuthContext';
import { useAccessRules } from './hooks/useAccessRules';
import { useTenantGate } from './hooks/useTenantGate';
import { DEFAULT_TENANT_ID } from './config/tenant';
import { MENU_SECTIONS } from './config/menu';

// 2026-08-19 хэрэглэгчтэй тохиролцсон архитектур (C хувилбар): резидент
// (owner) хэрэглэгчид зориулсан БүРЭН ТУСДАА "shell" — Layout.jsx (admin
// Sidebar+Topbar)-ыг ОГТ ашигладаггүй, вврийн энгийн, мобайл-д
// тохиромжтой толгой+доод цэс ашиглана. Гэхдээ ижил bundle, ижил route
// tree дотор — Мэдээ/Мессенжер/Voting гэх мэт хуудасны КОМПОНЕНТүүдийг
// admin-тай ХАМТ ашиглана (кодыг 2 удаа бичихгүй).
//
// ИРЭЭДүй: энэ файл (+ hooks/useTenantGate.js, hooks/useAccessRules.js)
// нь код зохион байгуулалтын хувьд аль хэдийн бүрэн тусгаарлагдсан тул,
// хэрэв ирээдүйд бүрэн тусдаа project (эсвэл PWA→Android/iOS апп) болгож
// "гарган авах" шаардлага гарвал, зүгээр эдгээр файлыг хуулж, дундаа
// байгаа page компонентуудын import зам солиход л хүрэлцэнэ.
const ALL_MENU_ITEMS = MENU_SECTIONS.flatMap((s) => s.items);

export default function UserApp({ theme, onToggleTheme }) {
  const { user } = useAuth();
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isPending, isRejected, isDeactivated } = useTenantGate();
  const { can, loading: accessLoading } = useAccessRules(hoaId);
  const [userappEnabled, setUserappEnabled] = useState({});
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    supabase.from('userapp_config').select('page_key,enabled').eq('tenant_id', hoaId).then(({ data }) => {
      if (cancelled) return;
      const map = {};
      (data ?? []).forEach((r) => { map[r.page_key] = r.enabled; });
      setUserappEnabled(map);
    });
    supabase.from('tenants').select('name').eq('id', hoaId).single().then(({ data }) => {
      if (!cancelled) setTenantName(data?.name || '');
    });
    return () => { cancelled = true; };
  }, [hoaId]);

  // Резидент апп-д зориулсан цэс — зүгээр л userapp_config.enabled !==
  // false БОЛОН access_rules-ийн Харах=Тийм хоёул үнэн үед л үзүүлнэ.
  const allowedItems = ALL_MENU_ITEMS.filter((item) => (userappEnabled[item.key] !== false) && can(item.key, 'view'));

  const pathAfterHoa = location.pathname.replace(/^\/[^/]+/, '');
  const currentItem = ALL_MENU_ITEMS.find((i) => pathAfterHoa === i.path || pathAfterHoa.startsWith(i.path + '/'));
  const isCurrentPageAllowed = currentItem
    ? (userappEnabled[currentItem.key] !== false) && can(currentItem.key, 'view')
    : false;

  let content;
  if (isDeactivated) {
    content = <GateMessage icon="🚫" title="Нэвтрэх эрхгүй бүртгэлийн хаяг" />;
  } else if (isPending || isRejected) {
    content = (
      <GateMessage
        icon={isPending ? '⏳' : '🚫'}
        title={isPending ? 'Хүлээгдэж байна' : 'Хүсэлт татгалзагдсан'}
      />
    );
  } else if (accessLoading) {
    content = <div className="text-center text-mutedtext py-10 text-sm">Ачаалж байна...</div>;
  } else if (!isCurrentPageAllowed) {
    content = <GateMessage icon="🚫" title="Нэвтрэх эрхгүй хуудас" />;
  } else {
    content = <Outlet />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-appbg text-slate-800 dark:text-white">
      <header className="h-14 bg-white dark:bg-sidebg border-b border-slate-200 dark:border-bordercol flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{tenantName || 'COSMO'}</span>
          <span className="text-[10px] text-mutedtext">{user?.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleTheme} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol flex items-center justify-center text-slate-600 dark:text-mutedtext">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => supabase.auth.signOut()} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol flex items-center justify-center text-slate-600 dark:text-mutedtext">
            ⎋
          </button>
        </div>
      </header>

      <nav className="flex overflow-x-auto gap-1 px-3 py-2 bg-white dark:bg-sidebg border-b border-slate-200 dark:border-bordercol">
        {allowedItems.map((item) => {
          const isActive = pathAfterHoa === item.path || pathAfterHoa.startsWith(item.path + '/');
          return (
            <button
              key={item.key}
              onClick={() => navigate(`/${hoaId}${item.path}`)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-mutedtext hover:bg-slate-100 dark:hover:bg-appbg'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <main className="p-3">{content}</main>

      <div className="text-center text-[10px] text-darktext py-3">© 2026 Integrated Systems</div>
    </div>
  );
}

function GateMessage({ icon, title }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-16">
      <div className="text-4xl">{icon}</div>
      <div className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</div>
    </div>
  );
}
