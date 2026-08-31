import { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
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
import Logs from './pages/Logs';
import UserAppConfig from './pages/UserAppConfig';
import { useTenantGate } from './hooks/useTenantGate';
import UserApp from './UserApp';
import NewsPage from './pages/News';
import Providers from './pages/Providers';
import Msgr from './pages/Msgr';
import VotingPage from './pages/VotingPage';
import VotingEditPage from './pages/VotingEditPage';
import VotingResultsPage from './pages/VotingResultsPage';
import VotingProtocolPage from './pages/VotingProtocolPage';
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
// 2026-08-19 (3-р засвар): "Сууц өмчлөгч" (owner) роль эсэхийг шалгаж,
// admin-ийн Layout (Sidebar+Topbar) эсвэл резидентийн UserApp (энгийн
// толгой+хэвтээ цэс) хоёрын алийг үзүүлэхийг сонгодог "шийдвэр өгөгч"
// wrapper. ҮҮнийг тусад нь гаргасны ач холбогдол: Layout-т owner-ийн
// код ОГТ орохгүй, UserApp-т ч мвн admin-ийн код орохгүй — 2 shell
// бүрэн цэвэр тусгаарлагдана (ирээдүйд UserApp-ыг гарган авахад бэлэн).
function TenantShell(props) {
  const { isSuperSysAdmin, user } = useAuth();
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [isOwnerRole, setIsOwnerRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperSysAdmin || !hoaId || !user) { setIsOwnerRole(false); setLoading(false); return; }
    let cancelled = false;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('tenant_id', hoaId).then(({ data }) => {
      if (cancelled) return;
      const rolesHere = (data ?? []).map((r) => r.role);
      setIsOwnerRole(rolesHere.length > 0 && rolesHere.every((r) => r === 'owner'));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hoaId, isSuperSysAdmin, user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-sidebg text-mutedtext text-sm">
        Ачаалж байна...
      </div>
    );
  }

  return isOwnerRole ? <UserApp theme={props.theme} onToggleTheme={props.onToggleTheme} /> : <Layout {...props} />;
}


function Layout({ theme, onToggleTheme, isOpen, isMobile, onToggle }) {
  const { isSuperSysAdmin } = useAuth();
  const scrollRef = useRef(null);
  usePullToRefresh(scrollRef);
  // 2026-08-19 (3-р засвар): "Сууц өмчлөгч" (owner) ролийн шалгалт,
  // whitelist-ийн логикийг бүрэн UserApp.jsx рүү гаргав. Энэ Layout зүгээр admin
  // энгийн ("Хүлээн зөвшөөргүл"/"Идэвхгүй" бүртгэл) шалгалтыг хариулна
  // (useTenantGate hook-oor хуваалцдаг).
  const { isPending, isRejected, isDeactivated } = useTenantGate();

  return (
    <div className="h-screen overflow-hidden flex font-sans text-[13px] bg-white dark:bg-appbg text-slate-800 dark:text-white">
      <Sidebar isOpen={isOpen} isMobile={isMobile} onToggle={onToggle} isSuperSysAdmin={isSuperSysAdmin} />

      <div
        className="flex-1 min-w-0 h-screen flex flex-col transition-[margin-left] duration-300 ease-in-out relative"
        style={{ marginLeft: !isMobile && isOpen ? 208 : 0 }}
      >
        <Topbar theme={theme} onToggleTheme={onToggleTheme} />

        <div ref={scrollRef} className="flex-1 min-w-0 p-2.5 overflow-y-auto overflow-x-auto bg-slate-100 dark:bg-appbg flex flex-col gap-2.5">
          {isDeactivated ? (
            <div className="ds-card p-8 flex flex-col items-center justify-center text-center gap-3" style={{ minHeight: '60vh' }}>
              <div className="text-4xl">🚫</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">Нэвтрэх эрхгүй бүртгэлийн хаяг</div>
            </div>
          ) : isPending || isRejected ? (
            <div className="ds-card p-8 flex flex-col items-center justify-center text-center gap-3" style={{ minHeight: '60vh' }}>
              <div className="text-4xl">{isPending ? '⏳' : '🚫'}</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {isPending ? 'Хүлээгдэж байна' : 'Хүсэлт татгалзагдсан'}
              </div>
              <div className="text-sm text-slate-500 dark:text-mutedtext max-w-md">
                {isPending
                  ? 'Таны үүсгэсэн СӨХ SuperSysAdmin-ийн зөвшөөрлийг хүлээж байна. Зөвшөөрсний дараа энэ хуудас руу дахин орж үзнэ уу.'
                  : 'Уучлаарай, таны үүсгэсэн СӨХ-ийн хүсэлтийг зөвшөөргдөөгүй. Дэлгэрэнгүй мэдээлэл авахыг хүсвэл СӨХ үйлчилгээ үзүүлэгчтэй холбогдоно уу.'}
              </div>
            </div>
          ) : (
            <Outlet />
          )}
          <div className="text-center text-[10.5px] text-darktext py-2">© 2026 Integrated Systems</div>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { theme, toggleTheme } = useTheme();
  const { isOpen, isMobile, toggleSidebar } = useSidebar();
  const { session, loading, roles, tenantIds, passwordRecovery } = useAuth();
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

  // 2026-08-19 хэрэглэгч тодорхой заасан: "Нууц үг сэргээх" эвент
  // үүссэн үед (recovery session), СЕССИЙН ХАРГАЛЗАХГүй ЭНЭ ХУУДСЫГ
  // үзүүлнэ — хамгийн эрэмбэ өндвр шалгалт, бусад бүх route-оос ӨМНв.
  if (passwordRecovery) {
    return <ResetPasswordPage />;
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
      <Route path="/" element={<Navigate to={`/${rootTenantId}`} replace />} />
      <Route path="/:hoaId" element={<TenantShell theme={theme} onToggleTheme={toggleTheme} isOpen={isOpen} isMobile={isMobile} onToggle={toggleSidebar} />}>
        {/* 2026-08-28: ОЛСОН БОДИТ АЛДАА — "/" рүү орход үүргүй шууд
            "/hoaId/dashboard" (админы Хянах самбар) руу чиглүүлдэг
            байсан тул OwnerApp хүртэл (Outlet-ээр) admin-ий Dashboard
            компонентыг шууд харуулдаг байв. Одоо ЗӨВХӨН tenant root
            рүү чиглүүлж, admin-д зориулсан "index" route (доор) нь
            зөвхөн admin Layout-ийн Outlet хэсэгт л хүрнэ — учир нь
            UserApp.jsx-ийн isHome шалгалт үүнээс ӨМНӨ таслан зогсоож,
            owner-д зориулсан TileGrid-ыг шууд үзүүлдэг. */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="userapp-profile" element={null} />
        <Route path="userapp-dashboard" element={null} />
        <Route path="userapp-msgr" element={null} />
        <Route path="userapp-payment" element={null} />
        <Route path="userapp-phonebook" element={null} />
        <Route path="userapp-about" element={null} />
        <Route path="userapp-classifieds" element={null} />
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
        <Route path="logs" element={<Logs />} />
        <Route path="uappconfig" element={<UserAppConfig />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="providers" element={<Providers />} />
        <Route path="msgr" element={<Msgr />} />
        <Route path="voting" element={<VotingPage />} />
        <Route path="voting/new" element={<VotingEditPage />} />
        <Route path="voting/:pollId/edit" element={<VotingEditPage />} />
        <Route path="voting/:pollId/results" element={<VotingResultsPage />} />
        <Route path="voting/:pollId/protocol" element={<VotingProtocolPage />} />
        {/* Tenant Status — SUPERSYSADMIN-ийн Төлбөрийн 3-р алхам (гараар
            invoice горим). SUPERSYSADMIN_TENANT_ITEMS-д багтдаг тул
            RequireRole ХЭРЭГТЭЙ. */}
        <Route path="tenant-status" element={<RequireRole roles={['supersysadmin']}><TenantStatus /></RequireRole>} />
        {/* Цэснийн бусад бүх линк (47 модуль) — хуудас бүтээгдэх хүртэл ижил fallback */}
        {ALL_ITEMS.filter((i) => !['/dashboard', '/owners', '/restmarket', '/tenant-status', '/clientele', '/property', '/addressing', '/news', '/providers', '/msgr', '/rolesrules', '/accounts', '/logs', '/voting', '/uappconfig'].includes(i.path)).map((item) => {
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
