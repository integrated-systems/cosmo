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
import FinConfig from './pages/FinConfig';
import Invoice from './pages/Invoice';
import AccessRules from './pages/AccessRules';
import Accounts from './pages/Accounts';
import Logs from './pages/Logs';
import UserAppConfig from './pages/UserAppConfig';
import { useTenantGate } from './hooks/useTenantGate';
import TenantGateScreen from './components/TenantGateScreen';
import UserApp from './UserApp';
import NewsPage from './pages/News';
import Providers from './pages/Providers';
import Msgr from './pages/Msgr';
import VotingPage from './pages/VotingPage';
import AdminClassifieds from './pages/AdminClassifieds';
import ParkingPage from './pages/ParkingPage';
import FixedAssets from './pages/FixedAssets';
import FixedAssetConfig from './pages/FixedAssetConfig';
import AssetShortLink from './pages/AssetShortLink';
import AboutProgram from './components/AboutProgram';
import Plan from './pages/Plan';
import Billing from './pages/Billing';
import RenewalRecords from './pages/RenewalRecords';
import Usage from './pages/Usage';
import Employees from './pages/Employees';
import Accounting from './pages/Accounting';
import TenantSuspendedScreen from './components/TenantSuspendedScreen';
import VotingEditPage from './pages/VotingEditPage';
import VotingResultsPage from './pages/VotingResultsPage';
import VotingProtocolPage from './pages/VotingProtocolPage';
import RequireRole from './components/RequireRole';
import RequireFeature from './components/RequireFeature';
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
  const [tenantStatus, setTenantStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperSysAdmin || !hoaId || !user) { setIsOwnerRole(false); setTenantStatus(null); setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('tenant_id', hoaId),
      supabase.from('tenants').select('status').eq('id', hoaId).single(),
    ]).then(([{ data: roleRows }, { data: tenantRow }]) => {
      if (cancelled) return;
      const rolesHere = (roleRows ?? []).map((r) => r.role);
      setIsOwnerRole(rolesHere.length > 0 && rolesHere.every((r) => r === 'owner'));
      setTenantStatus(tenantRow?.status || null);
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

  // 2026-09-08 (21): Trial дуусаад "Paused" (status='suspended')
  // болсон tenant-ийн хандалтыг эндүүс хаана — өмнe нь энэ статус
  // зөвхөн DB-д тэмдэглэгддэг байсан ч, ямар ч үр дагаваргүй байсан
  // (expire_trials() cron ажилладаг ч хандалт хаагддаггүй байсан
  // бодит алдаа). SUPERSYSADMIN-д хамаарахгүй (тэд үргэлж хандах
  // ёстой).
  if (!isSuperSysAdmin && tenantStatus === 'suspended') {
    return <TenantSuspendedScreen hoaId={hoaId} />;
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

  // 2026-09-09 (34): АЛДАА ЗАСАВ — эдгээр 3 төлөвт (батлагдаагүй,
  // татгалзсан, идэвхгүй) ч Sidebar/Topbar (бүтэн менү бүтэц) үргэлж
  // харагддаг байсан, зөвхөн гол контентын хэсэг "Хүлээгдэж байна"
  // гэсэн зурвасаар сэлгэгддэг байв. Бодит мэдээлэл алдагдаагүй ч
  // (Outlet хэзээ ч зурагддаггүй) UX-ийн хувьд зохимжгүй (батлагдаагүй
  // хэрэглэгчид бүтэн менү харуулах шаардлагагүй) байсан тул
  // TenantSuspendedScreen.jsx-тэй ижил зарчимаар бүтэн дэлгэц
  // (Sidebar/Topbar-гүй) харуулдаг болгов.
  if (isDeactivated) {
    return <TenantGateScreen icon="🚫" title="Нэвтрэх эрхгүй бүртгэлийн хаяг" />;
  }
  if (isPending || isRejected) {
    return (
      <TenantGateScreen
        icon={isPending ? '⏳' : '🚫'}
        title={isPending ? 'Хүлээгдэж байна' : 'Хүсэлт татгалзагдсан'}
        message={isPending
          ? 'Таны үүсгэсэн СӨХ SuperSysAdmin-ийн зөвшөөрлийг хүлээж байна. Зөвшөөрсний дараа энэ хуудас руу дахин орж үзнэ үү.'
          : 'Уучлаарай, таны үүсгэсэн СӨХ-ны хүсэлтийг зөвшөөргдөөгүй. Дэлгэрэнгүй мэдээлэл авахыг хүсвэл СӨХ үйлчилгээ үзүүлэгчтэй холбогдоно уу.'}
      />
    );
  }

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
      {/* 2026-09-07 (12): QR-ийн БОГИНО холбоос — tenant UUID шаардахгүй,
          баркодны рег.дугаараас tenant-ыг олж бүтэн route руу шилжүүлнэ. */}
      <Route path="/a/:barcode" element={<AssetShortLink />} />
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
        <Route path="dashboard" element={<RequireFeature featureKey="dashboard"><Dashboard /></RequireFeature>} />
        <Route path="userapp-profile" element={null} />
        <Route path="userapp-dashboard" element={null} />
        <Route path="userapp-msgr" element={null} />
        <Route path="userapp-payment" element={null} />
        <Route path="userapp-phonebook" element={null} />
        <Route path="userapp-about" element={null} />
        <Route path="userapp-classifieds" element={null} />
        <Route path="owners" element={<RequireFeature featureKey="owners"><Owners /></RequireFeature>} />
        {/* restmarket СИСАДМИН (tenant-level) цэсэнд байгаа тул бусад СИСАДМИН
            модуль шиг RequireRole-гүй — зөвхөн SUPERSYSADMIN_TENANT_ITEMS +
            SUPERSYSADMIN.path л supersysadmin эрх шаарддаг */}
        <Route path="restmarket" element={<RequireFeature featureKey="restmarket"><RealEstateMarket /></RequireFeature>} />
        <Route path="clientele" element={<RequireFeature featureKey="clientele"><Clientele /></RequireFeature>} />
        <Route path="property" element={<RequireFeature featureKey="property"><Property /></RequireFeature>} />
        <Route path="addressing" element={<RequireFeature featureKey="addressing"><AddressConfig /></RequireFeature>} />
        <Route path="finconfig" element={<RequireFeature featureKey="finconfig"><FinConfig /></RequireFeature>} />
        <Route path="hrm" element={<RequireFeature featureKey="hrm"><Employees /></RequireFeature>} />
        <Route path="accounting" element={<RequireFeature featureKey="accounting"><Accounting /></RequireFeature>} />
        <Route path="invoice" element={<RequireFeature featureKey="invoice"><Invoice /></RequireFeature>} />
        <Route path="rolesrules" element={<RequireFeature featureKey="rolesrules"><AccessRules /></RequireFeature>} />
        <Route path="accounts" element={<RequireFeature featureKey="accounts"><Accounts /></RequireFeature>} />
        <Route path="logs" element={<RequireFeature featureKey="logs"><Logs /></RequireFeature>} />
        <Route path="uappconfig" element={<RequireFeature featureKey="uappconfig"><UserAppConfig /></RequireFeature>} />
        <Route path="news" element={<RequireFeature featureKey="news"><NewsPage /></RequireFeature>} />
        <Route path="providers" element={<RequireFeature featureKey="providers"><Providers /></RequireFeature>} />
        <Route path="msgr" element={<RequireFeature featureKey="msgr"><Msgr /></RequireFeature>} />
        <Route path="voting" element={<RequireFeature featureKey="voting"><VotingPage /></RequireFeature>} />
        <Route path="classifieds" element={<RequireFeature featureKey="classifieds"><AdminClassifieds /></RequireFeature>} />
        <Route path="parking" element={<RequireFeature featureKey="parking"><ParkingPage /></RequireFeature>} />
        <Route path="fixedassets" element={<RequireFeature featureKey="fixedassets"><FixedAssets /></RequireFeature>} />
        <Route path="fixedassconfig" element={<RequireFeature featureKey="fixedassconfig"><FixedAssetConfig /></RequireFeature>} />
        <Route path="about-program" element={<AboutProgram />} />
        <Route path="voting/new" element={<RequireFeature featureKey="voting"><VotingEditPage /></RequireFeature>} />
        <Route path="voting/:pollId/edit" element={<RequireFeature featureKey="voting"><VotingEditPage /></RequireFeature>} />
        <Route path="voting/:pollId/results" element={<RequireFeature featureKey="voting"><VotingResultsPage /></RequireFeature>} />
        <Route path="voting/:pollId/protocol" element={<RequireFeature featureKey="voting"><VotingProtocolPage /></RequireFeature>} />
        {/* Tenant Status — SUPERSYSADMIN-ийн Төлбөрийн 3-р алхам (гараар
            invoice горим). SUPERSYSADMIN_TENANT_ITEMS-д багтдаг тул
            RequireRole ХЭРЭГТЭЙ. */}
        <Route path="tenant-status" element={<RequireRole roles={['supersysadmin']}><TenantStatus /></RequireRole>} />
        <Route path="plan" element={<RequireRole roles={['supersysadmin']}><Plan /></RequireRole>} />
        <Route path="billing" element={<RequireRole roles={['supersysadmin']}><Billing /></RequireRole>} />
        <Route path="renewal" element={<RequireRole roles={['supersysadmin']}><RenewalRecords /></RequireRole>} />
        <Route path="usage" element={<RequireRole roles={['supersysadmin']}><Usage /></RequireRole>} />
        {/* Цэснийн бусад бүх линк (47 модуль) — хуудас бүтээгдэх хүртэл ижил fallback */}
        {ALL_ITEMS.filter((i) => !['/dashboard', '/owners', '/restmarket', '/tenant-status', '/plan', '/billing', '/renewal', '/usage', '/clientele', '/property', '/addressing', '/finconfig', '/hrm', '/accounting', '/invoice', '/news', '/providers', '/msgr', '/rolesrules', '/accounts', '/logs', '/voting', '/uappconfig'].includes(i.path)).map((item) => {
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
