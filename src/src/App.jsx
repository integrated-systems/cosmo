import { useState, useRef } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import OnboardingPage from './pages/OnboardingPage';
import PageInProgress from './pages/PageInProgress';
import Dashboard from './pages/Dashboard';
import Owners from './pages/Owners';
import RealEstateMarket from './pages/RealEstateMarket';
import TenantStatus from './pages/TenantStatus';
import Clientele from './pages/Clientele';
import Property from './pages/Property';
import AddressConfig from './pages/AddressConfig';
import AccessRules from './pages/AccessRules';
import Accounts from './pages/Accounts';
import NewsPage from './pages/News';
import Providers from './pages/Providers';
import Msgr from './pages/Msgr';
import RequireRole from './components/RequireRole';
import { useTheme } from './hooks/useTheme';
import { useSidebar } from './hooks/useSidebar';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { MENU_SECTIONS, SUPERSYSADMIN, SUPERSYSADMIN_TENANT_ITEMS } from './config/menu';
import { DEFAULT_TENANT_ID } from './config/tenant';

const ALL_ITEMS = [...MENU_SECTIONS.flatMap((s) => s.items), SUPERSYSADMIN, ...SUPERSYSADMIN_TENANT_ITEMS];
const TENANT_ITEM_PATHS = SUPERSYSADMIN_TENANT_ITEMS.map((i) => i.path);

// Layout нь "/:hoaId" Route-ийн element-ээр нь ажилладаг тул Sidebar/Topbar
// (болон тэдгээрийн дотор ашигладаг useParams()) энэ Route-ийн ДОТОР
// байрлаж, :hoaId параметрийг зөв уншина. 2026-08-13 архитектурын аудитаар
// Sidebar нь <Routes>-ийн гадна (sibling) байрлаж, useParams() үргэлж
// хоосон буцааж байсан алдааг олж, nested-route+<Outlet/> загварт шилжүүлсэн.
function Layout({ theme, onToggleTheme, isOpen, isMobile, onToggle }) {
  const { isSuperSysAdmin } = useAuth();
  const scrollRef = useRef(null);
  usePullToRefresh(scrollRef);
  return (
    <div className="h-screen overflow-hidden flex font-sans text-[13px] bg-white dark:bg-appbg text-slate-800 dark:text-white">
      <Sidebar isOpen={isOpen} isMobile={isMobile} onToggle={onToggle} isSuperSysAdmin={isSuperSysAdmin} />

      <div
        className="flex-1 min-w-0 h-screen flex flex-col transition-[margin-left] duration-300 ease-in-out relative"
        style={{ marginLeft: !isMobile && isOpen ? 208 : 0 }}
      >
        <Topbar theme={theme} onToggleTheme={onToggleTheme} />

        <div ref={scrollRef} className="flex-1 min-w-0 p-2.5 overflow-y-auto overflow-x-auto bg-slate-100 dark:bg-appbg flex flex-col gap-2.5">
          <Outlet />
          <div className="text-center text-[10.5px] text-darktext py-2">© 2026 Integrated Systems</div>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { theme, toggleTheme } = useTheme();
  const { isOpen, isMobile, toggleSidebar } = useSidebar();
  const { session, loading, roles, tenantIds } = useAuth();
  // Login/Sign-Up хоёрын хооронд сэлгэх — session алга үед ЭДГЭЭР 2
  // хуудас <Routes>-ийн бүрэн гадна, энгийн local state-ээр сэлгэгддэг
  // (auth хийгдээгүй үед бүтэн route бүтэц шаардлагагүй).
  const [authView, setAuthView] = useState('login');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-sidebg text-mutedtext text-sm">
        Ачаалж байна...
      </div>
    );
  }


  if (!session) {
    return authView === 'signup'
      ? <SignUpPage onBackToLogin={() => setAuthView('login')} />
      : <LoginPage onSignUpClick={() => setAuthView('signup')} />;
  }

  // Session бий боловч user_roles-д ямар ч мөр байхгүй (жиш нь шинэ
  // Sign-Up хийсэн, tenant үүсгээгүй хэрэглэгч) — Onboarding харуулна.
  if (roles.length === 0) {
    return <OnboardingPage />;
  }

  // 2026-08-15 олдож засагдсан ЧУХАЛ алдаа: өмнө "/" root redirect
  // ГҮЙЦЭТ hardcode DEFAULT_TENANT_ID (bootstrap tenant)-руу л заадаг
  // байсан тул шинэ tenant үүсгэсэн ХЭН ч өөрийн бус (эхний bootstrap)
  // tenant-ийн dashboard-т чиглэгдэж, RLS-ээр дата хоосон харагдаж
  // "эвдэрсэн" мэт санагддаг байв. Одоо нэвтэрсэн хэрэглэгчийн өөрийн
  // tenantIds[0]-г эхэнд нь ашиглана, зөвхөн tenant-гүй (жиш нь
  // supersysadmin, tenant_id=null role) үед л DEFAULT_TENANT_ID-руу
  // (аюулгүй нөөц) буцна.
  const rootTenantId = tenantIds[0] || DEFAULT_TENANT_ID;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${rootTenantId}/dashboard`} replace />} />
      <Route path="/:hoaId" element={<Layout theme={theme} onToggleTheme={toggleTheme} isOpen={isOpen} isMobile={isMobile} onToggle={toggleSidebar} />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="owners" element={<Owners />} />
        {/* restmarket СИСАДМИН (tenant-level) цэсэнд байгаа тул бусад СИСАДМИН
            модуль шиг RequireRole-гүй — зөвхөн SUPERSYSADMIN_TENANT_ITEMS +
            SUPERSYSADMIN.path л supersysadmin эрх шаарддаг */}
        <Route path="restmarket" element={<RealEstateMarket />} />
        <Route path="clientele" element={<Clientele />} />
        <Route path="property" element={<Property />} />
        <Route path="addressing" element={<AddressConfig />} />
        <Route path="rolesrules" element={<AccessRules />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="providers" element={<Providers />} />
        <Route path="msgr" element={<Msgr />} />
        {/* Tenant Status — SUPERSYSADMIN-ийн Төлбөрийн 3-р алхам (гараар
            invoice горим). SUPERSYSADMIN_TENANT_ITEMS-д багтдаг тул
            RequireRole ХЭРЭГТЭЙ. */}
        <Route path="tenant-status" element={<RequireRole roles={['supersysadmin']}><TenantStatus /></RequireRole>} />
        {/* Цэсний бусад бүх линк (47 модуль) — хуудас бүтээгдэх хүртэл ижил fallback */}
        {ALL_ITEMS.filter((i) => !['/dashboard', '/owners', '/restmarket', '/tenant-status', '/clientele', '/property', '/addressing', '/news', '/providers', '/msgr', '/rolesrules', '/accounts'].includes(i.path)).map((item) => {
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

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
