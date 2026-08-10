import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PageInProgress from './pages/PageInProgress';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import { useTheme } from './hooks/useTheme';
import { useSidebar } from './hooks/useSidebar';
import { MENU_SECTIONS } from './config/menu';

const ALL_ITEMS = MENU_SECTIONS.flatMap((s) => s.items);

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { isOpen, isMobile, toggleSidebar } = useSidebar();

  return (
    <div className="h-screen overflow-hidden flex font-sans text-[13px] bg-white dark:bg-appbg text-slate-800 dark:text-white">
      <Sidebar isOpen={isOpen} isMobile={isMobile} onToggle={toggleSidebar} />

      <div
        className="flex-1 h-screen flex flex-col transition-[margin-left] duration-300 ease-in-out relative"
        style={{ marginLeft: !isMobile && isOpen ? 208 : 0 }}
      >
        <Topbar theme={theme} onToggleTheme={toggleTheme} />

        <div className="flex-1 p-2.5 overflow-y-auto bg-slate-100 dark:bg-[#0b132b] flex flex-col gap-2.5">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/residents" element={<Residents />} />
            {/* Цэсний бусад бүх линк — хуудас бүтээгдэх хүртэл ижил fallback */}
            {ALL_ITEMS.filter((i) => !['/dashboard', '/residents'].includes(i.path)).map((item) => (
              <Route key={item.path} path={item.path} element={<PageInProgress />} />
            ))}
          </Routes>
          <div className="text-center text-[10.5px] text-darktext py-2">© 2026 Integrated Systems™</div>
        </div>
      </div>
    </div>
  );
}
