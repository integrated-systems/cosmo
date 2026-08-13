import { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import PageInProgress from './pages/PageInProgress';
import Dashboard from './pages/Dashboard';
import Owners from './pages/Owners';
import RequireRole from './components/RequireRole';
import { useTheme } from './hooks/useTheme';
import { useSidebar } from './hooks/useSidebar';
import { MENU_SECTIONS, SUPERSYSADMIN, SUPERSYSADMIN_TENANT_ITEMS } from './config/menu';

const ALL_ITEMS = [...MENU_SECTIONS.flatMap((s) => s.items), SUPERSYSADMIN, ...SUPERSYSADMIN_TENANT_ITEMS];
const TENANT_ITEM_PATHS = SUPERSYSADMIN_TENANT_ITEMS.map((i) => i.path);

// Layout нь "/:hoaId" Route-ийн element-ээр нь ажилладаг тул Sidebar/Topbar
// (болон тэдгээрийн дотор ашигладаг useParams()) энэ Route-ийн ДОТОР
// байрлаж, :hoaId параметрийг зөв уншина. 2026-08-13 архитектурын аудитаар
// Sidebar нь <Routes>-ийн гадна (sibling) байрлаж, useParams() үргэлж
// хоосон буцааж байсан алдааг олж, nested-route+<Outlet/> загварт шилжүүлсэн.
function Layout({ theme, onToggleTheme, isOpen, isMobile, onToggle }) {
  return (
    <div className="h-screen overflow-hidden flex font-sans text-[13px] bg-white dark:bg-appbg text-slate-800 dark:text-white">
      <Sidebar isOpen={isOpen} isMobile={isMobile} onToggle={onToggle} />

      <div
        className="flex-1 h-screen flex flex-col transition-[margin-left] duration-300 ease-in-out relative"
        style={{ marginLeft: !isMobile && isOpen ? 208 : 0 }}
      >
        <Topbar theme={theme} onToggleTheme={onToggleTheme} />

        <div className="flex-1 p-2.5 overflow-y-auto bg-slate-100 dark:bg-appbg flex flex-col gap-2.5">
          <Outlet />
          <div className="text-center text-[10.5px] text-darktext py-2">© 2026 Integrated Systems™</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { isOpen, isMobile, toggleSidebar } = useSidebar();
  // TODO: Supabase auth session-оор солих — одоогоор зөвхөн UI урсгал шалгах local state
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/hoa1/dashboard" replace />} />
      <Route path="/:hoaId" element={<Layout theme={theme} onToggleTheme={toggleTheme} isOpen={isOpen} isMobile={isMobile} onToggle={toggleSidebar} />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="owners" element={<Owners />} />
        {/* Цэсний бусад бүх линк (49 модуль) — хуудас бүтээгдэх хүртэл ижил fallback */}
        {ALL_ITEMS.filter((i) => !['/dashboard', '/owners'].includes(i.path)).map((item) => {
          const isTenantSaasItem = TENANT_ITEM_PATHS.includes(item.path) || item.path === SUPERSYSADMIN.path;
          const element = isTenantSaasItem
            ? <RequireRole roles={['supersysadmin']}><PageInProgress /></RequireRole>
            : <PageInProgress />;
          return <Route key={item.path} path={item.path.slice(1)} element={element} />;
        })}
      </Route>
    </Routes>
  );
}
