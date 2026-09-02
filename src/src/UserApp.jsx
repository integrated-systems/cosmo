import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './lib/AuthContext';
import { useAccessRules } from './hooks/useAccessRules';
import { useTenantGate } from './hooks/useTenantGate';
import { useUserAppPrefs } from './hooks/useUserAppPrefs';
import { presetBackgroundUrl } from './config/presetBackgrounds';
import { formatUnitLabel } from './lib/ownersFormat';
import { DEFAULT_TENANT_ID } from './config/tenant';
import { MENU_SECTIONS } from './config/menu';
import TileGrid from './components/UserApp/TileGrid';
import TabBar from './components/UserApp/TabBar';
import UserAppProfile from './components/UserApp/UserAppProfile';
import HeroQuorumCard from './components/UserApp/HeroQuorumCard';
import OwnerMsgrThread from './components/UserApp/OwnerMsgrThread';
import OwnerPaymentPlaceholder from './components/UserApp/OwnerPaymentPlaceholder';
import OwnerClassifieds from './components/UserApp/OwnerClassifieds';
import OwnerParking from './components/UserApp/OwnerParking';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import OwnerPhonebook from './components/UserApp/OwnerPhonebook';
import OwnerAbout from './components/UserApp/OwnerAbout';
import OwnerDashboard from './pages/OwnerDashboard';
import './userapp.css';

// 2026-08-28: Хуучин "suh" (userapp-react) App.jsx-ийн header 3 SVG
// товчийг (Мэдэгдэл/Bell, Нуусан tile сэргээх/Plus, Гарах/Logout) ЯГ
// ИЖИЛ шилжүүлэв — хэрэглэгчийн 2026-08-28 хүсэлт: "хуучин userapp-аас
// эдгээр svg товчнуудыг сэргээе".
function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// hex өнгийг [r,g,b] массив руу хувиргана — 2026-08-27, зурган хүснэгэсээр
// баталгаажсан "5 леир, 5 слайдер" систем (Леир 4-ийн custom өнгийг
// opacity-той хольж нэг CSS хувьсагч болгоход ашиглана).
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r, g, b];
}

// 2026-08-19: резидент (owner) shell — the2m26/suh (GitHub: userapp-react)
// прожектийн бодитоор туршигдсан, бүтэн PWA UI/UX (TileGrid+TabBar)-ыг
// Cosmo-ийн бодит эрхийн систем (useAccessRules+userapp_config)-той
// холбож дасан зохицуулав. Өөр Supabase project/схем ОГТ ашиглаагүй —
// зүгээр л дизайн/interaction кодыг л "аврч" авав.
//
// Одоогоор бодит Cosmo backend-тэй холбогдсон модуль: news, voting, msgr.
// Үлдсэн (Дашбоард-ийн санхүүгийн график, Төлбөр/QPay, Зочин урих,
// Хэрэгцээт мэдээлэл г.м) — Cosmo-д тэдгээрийн backend хараахан
// байгуулагдаагүй тул "Түн удахгүй" гэсэн placeholder-ээр үзүүлнэ.
// 2026-08-27: Профайл хуудасны Интерфейс тохиргоо (theme/дэвсгэр/картны
// тунгалагшил г.м) хуучин "suh" төслөөс бүрэн шилжив — useUserAppPrefs()
// hook-оор дамжуулан СЕРВЕР талд (userapp_prefs) хадгалагдаж,
// төхөөрөмж хооронд синк хийгддэг (хуучин device-local зарчмаас илүү).
const ALL_MENU_ITEMS = MENU_SECTIONS.flatMap((s) => s.items);
const BUILT_PAGE_KEYS = ['news', 'voting', 'msgr', 'dashboard', 'phonebook', 'about', 'classifieds', 'parking'];

const TABS = [
  { key: 'home', label: 'Home', icon: <HomeIcon /> },
  { key: 'payment', label: 'Төлбөр', icon: <PaymentIcon /> },
  { key: 'profile', label: 'Profile', icon: <ProfileIcon /> },
];

export default function UserApp({ theme, onToggleTheme }) {
  const { user } = useAuth();
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isPending, isRejected, isDeactivated } = useTenantGate();
  const { can, loading: accessLoading } = useAccessRules(hoaId);
  const { prefs, savePrefs } = useUserAppPrefs(user?.id, hoaId);
  const bgImageUrl = presetBackgroundUrl(prefs.bg_preset);
  const [userappEnabled, setUserappEnabled] = useState({});
  const [badges, setBadges] = useState({});
  const [ownerUnit, setOwnerUnit] = useState(null); // "Байр, Тоот" формат (2026-08-28)
  const [tenantName, setTenantName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState(null);
  // 2026-08-31: Хэрэглэгчийн хүсэлт — OwnerApp-ийн бүх хуудасыг доош
  // чирэхэд рефреш хийдэг болгов. үвүр нь энэ hook зөвхөн admin-ийн
  // Layout-д л холбогдсон байсан, OwnerApp-д огт ашиглагддаггүй байв.
  //
  // 2026-08-31 (2): ОЛСОН БОДИТ АЛДАА — "window.location.reload()"
  // бүтэн хуудсыг дахин ачаалж, хар хөх "ачаалж байна" нүүр агшин
  // зуур харагддаг, мөн апп-ийн эхлэлийн redirect логикоос болж
  // навигацийн slider Home руу буцдаг байв. Одоо БүТЭН reload биш,
  // зүгээр "refreshKey"-г нэмэгдүүлж, mainContent-ийг key-based
  // remount хийлгэнэ (тухайн дэд компонентын useEffect дахин
  // ажиллаж, дата дахин ачаалагдана) — ямар ч ачаалж
  // байна нүүр, навигацийн алдаа үүсэхгүй.
  const contentScrollRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  usePullToRefresh(contentScrollRef, () => setRefreshKey((k) => k + 1));
  const [bottomTab, setBottomTab] = useState('home');
  const [myOwnerId, setMyOwnerId] = useState(null);

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

  useEffect(() => {
    // 2026-08-27: Bento tile badge-үүд — msgr бол БОДИТ unread_count
    // (msgr_list, RLS-ээр зөвхөн ӨӨРИЙН мвр), news бол backend-д
    // per-user "уншсан эсэх" хүснэгэл байхгүй тул localStorage-д
    // хадгалсан "сүүлд үзсэн" огноогоос хойших шинэ мэдээний тоог
    // тооцоолно (хүнгэн, нэмэлт хүснэгэлгүй).
    if (!hoaId || !user?.id) return;
    let cancelled = false;
    (async () => {
      const [{ data: ownerRow }, { data: newsRows }, { data: layouts }] = await Promise.all([
        supabase.from('owners').select('id, building_no, floor, door_no').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle(),
        supabase.from('news').select('created_at').eq('tenant_id', hoaId).order('created_at', { ascending: false }).limit(30),
        // 2026-08-28: "Хаягжилт тохиргоо" (AddressConfig)-д тохируулсан
        // форматыг (Байр-Давхар-Тоот эсвэл Байр-Орц-Тоот) яг ижил
        // ашиглана — хэрэглэгчийн заасны дагуу Owners бүртгэлийн
        // жагсаалтад ашигладаг формат л энд хэрэглэгдэнэ.
        supabase.from('unit_layouts').select('building_no,floor,door_no,structure_type,entrance_no').eq('tenant_id', hoaId),
      ]);
      if (cancelled) return;
      if (ownerRow) {
        setMyOwnerId(ownerRow.id);
        const layoutRow = (layouts ?? []).find((u) => u.building_no === ownerRow.building_no && u.floor === ownerRow.floor && u.door_no === ownerRow.door_no);
        setOwnerUnit(formatUnitLabel(ownerRow.building_no, layoutRow?.structure_type, ownerRow.floor, layoutRow?.entrance_no, ownerRow.door_no));
      }
      const next = {};
      if (ownerRow) {
        const { data: msgrRow } = await supabase.from('msgr_list').select('owner_unread_count').eq('owner_id', ownerRow.id).eq('tenant_id', hoaId).maybeSingle();
        if (!cancelled && msgrRow?.owner_unread_count) next.msgr = msgrRow.owner_unread_count;
      }
      const lastSeenKey = `cosmo_userapp_news_seen_${hoaId}`;
      const lastSeen = localStorage.getItem(lastSeenKey);
      if (!lastSeen) {
        localStorage.setItem(lastSeenKey, new Date().toISOString());
      } else if (newsRows) {
        next.news = newsRows.filter((n) => new Date(n.created_at) > new Date(lastSeen)).length;
      }
      if (!cancelled) setBadges(next);
    })();
    return () => { cancelled = true; };
  }, [hoaId, user?.id]);

  useEffect(() => {
    // 2026-08-28: Мессенжерийн badge-ыг Realtime болгов — шинэ зурвас
    // (unread_count шинэчлэгдэх) орж ирэхэд tile badge хуудас дахин
    // ачаалахгүйгээр шууд шинэчлэгдэнэ.
    if (!myOwnerId || !hoaId) return;
    const channel = supabase
      .channel(`userapp-msgr-badge-${myOwnerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'msgr_list', filter: `owner_id=eq.${myOwnerId}` }, (payload) => {
        setBadges((b) => ({ ...b, msgr: payload.new?.owner_unread_count || 0 }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myOwnerId, hoaId]);

  // 2026-08-27: зурган хүснэгэсээр баталгаажсан "5 леир, 5 слайдер"
  // систем — доод → дээш: Леир1(bg)→Леир2(хар,slider1)→Леир3(blur,
  // slider2)→[агуулга]→Леир4(картны өнгө,slider3)→Леир5(картны хар
  // wash,slider4)→(хүүрээ,slider5).

  // Леир 4 (Слайдер 3): тайл/картны background өнгө + опаситиг нэг
  // хувьсагчид нэгтгэнэ (custom өнгөгүй бол theme-ийн анхны өнгө).
  useEffect(() => {
    const opacity = Math.max(0, Math.min(100, prefs.card_fill_opacity ?? 100)) / 100;
    const themeDefaultRgb = theme === 'light' ? [255, 255, 255] : [22, 36, 64];
    const [r, g, b] = hexToRgb(prefs.card_color) || themeDefaultRgb;
    document.documentElement.style.setProperty('--card-bg-computed', `rgba(${r},${g},${b},${opacity})`);
  }, [prefs.card_color, prefs.card_fill_opacity, theme]);

  // Леир 5 (Слайдер 4): ЗӨВХӨН тайл/картыг бүүрхсэн хар wash.
  useEffect(() => {
    const opacity = Math.max(0, Math.min(100, prefs.card_wash_opacity ?? 0)) / 100;
    document.documentElement.style.setProperty('--card-tint-overlay', `rgba(0,0,0,${opacity})`);
  }, [prefs.card_wash_opacity]);

  // Слайдер 5: тайл/картны хүүрээний өнгө хар(0)→цагаан(255).
  useEffect(() => {
    if (prefs.card_border_gray == null) {
      document.documentElement.style.removeProperty('--card-border-computed');
      return;
    }
    const g = Math.max(0, Math.min(255, prefs.card_border_gray));
    const hex = g.toString(16).padStart(2, '0');
    document.documentElement.style.setProperty('--card-border-computed', `#${hex}${hex}${hex}`);
  }, [prefs.card_border_gray]);

  // Слайдер 6: тайл/карт/Hero-ийн border-radius (4-30px) — гурвыг нь
  // ижил бүлэг мэт харагдуулна.
  useEffect(() => {
    const r = Math.max(4, Math.min(30, prefs.card_radius ?? 20));
    document.documentElement.style.setProperty('--card-radius-computed', `${r}px`);
  }, [prefs.card_radius]);

  // Леир 2 (Слайдер 1): дэлгэцийг бүүрхэх хар давхаргын opacity.
  useEffect(() => {
    const opacity = Math.max(0, Math.min(100, prefs.bg_tint ?? 0)) / 100;
    document.documentElement.style.setProperty('--bg-l2-opacity', opacity);
  }, [prefs.bg_tint]);

  // Леир 3 (Слайдер 2): дэлгэцийг бүүрхэх өнгөгүүй blur давхаргын хэмжээ.
  useEffect(() => {
    const pct = Math.max(0, Math.min(100, prefs.bg_blur ?? 0));
    document.documentElement.style.setProperty('--bg-l3-blur', `${(pct / 100) * 24}px`);
  }, [prefs.bg_blur]);

  // 2026-08-30: OwnerApp талд зүгээр tile-ийн НЭРИЙГ (label) л (admin
  // Sidebar-ийн жинхэнэ нэрийг үл хүндэтгэж) солих, мвн зарим tile-ыг
  // owner-т ОГТ үзүүлэхгүй байх хэрэглэгчийн хүсэлт:
  //   - "parking" (Түр зогсоол бүртгэл) -> "Зочин урих" — хэрэглэгч
  //     БАТАЛГААЖУУЛСАН: энэ бол НЭГ ХүСНЭГЛИЙН 2 нэр (owner зочны
  //     машины дугаар илгээж, түр зогсоолд орох зөвшөөрөл авах бодит
  //     функц) тул routing-ийг ХЭВЭЭР үлдээнэ.
  //   - "owners" (Сууц өмчлөгч бүртгэл) — ЭНЭ бол цэвэр СӨХ-ны
  //     менежерийн ажлын хуудас, сууц өмчлөгч нэвтрэх ШААРДЛАГАГүй
  //     гэдгийг хэрэглэгч тодруулав. Иймд OwnerApp-аас БүРЭН нуугдана
  //     (invoice-той адил). "Зарын самбар" бол үүнтэй ОГТ ХОЛБООГүй,
  //     ирээдүйд шинээр үүсэх ТУСДАА tile — доор synthetic tile
  //     байдлаар нэмж, одоогоор "түн удахгүй" (coming soon) горимоор
  //     ажиллана (бодит backend/хуудас үүсэх хүртэл).
  //   - "invoice" (Нэхэмжлэх) -> owner-т ОГТ харагдахгүй
  const OWNERAPP_LABEL_OVERRIDES = { parking: 'Зочин урих' };
  const OWNERAPP_HIDDEN_KEYS = ['invoice', 'owners', 'classifieds'];
  const allowedItems = ALL_MENU_ITEMS
    .filter((item) => (userappEnabled[item.key] !== false) && can(item.key, 'view') && !OWNERAPP_HIDDEN_KEYS.includes(item.key))
    .map((item) => (OWNERAPP_LABEL_OVERRIDES[item.key] ? { ...item, label: OWNERAPP_LABEL_OVERRIDES[item.key] } : item));
  // "Зарын самбар" — үндсэн программын ЯМАР Ч хуудастай холбоогүй,
  // OwnerApp-д зориулсан цоо шинэ, 2026-08-31-с хойш БОДИТ (бүрэн
  // ажилладаг) tile — сууц өмчлөгч Facebook-ийн пост шиг
  // зар нийтэлж, реакц, коммент бичих боломжтой.
  if (userappEnabled.classifieds !== false) {
    allowedItems.push({ key: 'classifieds', label: 'Зарын самбар', path: '/userapp-classifieds' });
  }
  // 2026-08-31: "Утасны жагсаалт" болон "СӨХ-ны тухай" — мөн
  // үндсэн программын ЯМАР Ч хуудастай (Sidebar-ийн)
  // холбоогүй, OwnerApp-д зориулсан БОДИТ (бүрэн ажилладаг) synthetic
  // tile-үүд. "Userapp тохиргоо"-ны тохиргоог л дагана (userappEnabled).
  if (userappEnabled.phonebook !== false) {
    allowedItems.push({ key: 'phonebook', label: 'Утасны жагсаалт', path: '/userapp-phonebook' });
  }
  if (userappEnabled.about !== false) {
    allowedItems.push({ key: 'about', label: 'СӨХ-ны тухай', path: '/userapp-about' });
  }


  const pathAfterHoa = location.pathname.replace(/^\/[^/]+/, '');
  const isHome = pathAfterHoa === '' || pathAfterHoa === '/';
  const currentItem = ALL_MENU_ITEMS.find((i) => pathAfterHoa === i.path || pathAfterHoa.startsWith(i.path + '/'));
  const isCurrentPageAllowed = currentItem
    ? (userappEnabled[currentItem.key] !== false) && can(currentItem.key, 'view')
    : false;

  function handleOpenTile(item) {
    if (item.key === 'msgr') {
      // ОЛСОН ЦООРХОЙ: 'msgr' нь admin-ийн /msgr (staff БүХ харилцан
      // ярианы удирдлагын dashboard) руу шууд чиглүүлдэг байсан тул
      // owner бусдын харилцан ярааг ч харж чадах эрсдэлтэй байв. Одоо
      // OwnerMsgrThread (зөвхөн ӨӨРИЙН харилцан яриа) руу чиглүүлнэ.
      navigate(`/${hoaId}/userapp-msgr`);
      return;
    }
    if (item.key === 'news') {
      // Мэдээ уншсаны дараа badge тоолуурыг арилгана.
      localStorage.setItem(`cosmo_userapp_news_seen_${hoaId}`, new Date().toISOString());
      setBadges((b) => ({ ...b, news: 0 }));
    }
    if (item.key === 'dashboard') {
      // Dashboard: admin талын /dashboard-той ОГТ өөр (энгийн статик)
      // компонент тул shared route биш, /userapp-dashboard тусдаа
      // зам ашиглана (мвн адил зарчмаар /userapp-profile).
      navigate(`/${hoaId}/userapp-dashboard`);
    } else if (BUILT_PAGE_KEYS.includes(item.key)) {
      navigate(`/${hoaId}${item.path}`);
    } else {
      setComingSoonTitle(item.label);
    }
  }

  function handleTabChange(key) {
    setBottomTab(key);
    if (key === 'home') navigate(`/${hoaId}`);
    else if (key === 'profile') navigate(`/${hoaId}/userapp-profile`);
    else navigate(`/${hoaId}/userapp-payment`);
  }

  let mainContent;
  if (isDeactivated) {
    mainContent = <GateMessage icon="🚫" title="Нэвтрэх эрхгүй бүртгэлийн хаяг" />;
  } else if (isPending || isRejected) {
    mainContent = <GateMessage icon={isPending ? '⏳' : '🚫'} title={isPending ? 'Хүлээгдэж байна' : 'Хүсэлт татгалзагдсан'} />;
  } else if (accessLoading) {
    mainContent = <div className="pool-empty">Ачаалж байна...</div>;
  } else if (isHome) {
    mainContent = (
      <>
        <HeroQuorumCard hoaId={hoaId} />
        <TileGrid
          items={allowedItems}
          onOpenTile={handleOpenTile}
          showAddModal={showAddModal}
          onCloseAddModal={() => setShowAddModal(false)}
          badges={badges}
        />
      </>
    );
  } else if (pathAfterHoa.startsWith('/userapp-dashboard')) {
    mainContent = <OwnerDashboard hoaId={hoaId} />;
  } else if (pathAfterHoa.startsWith('/userapp-msgr')) {
    mainContent = <OwnerMsgrThread hoaId={hoaId} />;
  } else if (pathAfterHoa.startsWith('/userapp-payment')) {
    mainContent = <OwnerPaymentPlaceholder />;
  } else if (pathAfterHoa.startsWith('/userapp-phonebook')) {
    mainContent = <OwnerPhonebook hoaId={hoaId} />;
  } else if (pathAfterHoa.startsWith('/userapp-about')) {
    mainContent = <OwnerAbout hoaId={hoaId} />;
  } else if (pathAfterHoa.startsWith('/userapp-classifieds')) {
    mainContent = <OwnerClassifieds hoaId={hoaId} />;
  } else if (pathAfterHoa.startsWith('/parking')) {
    // "parking" бол үндсэн менюгийн БОДИТ page_key ("Түр зогсоол
    // бүртгэл", admin-д зориулсан жинхэнэ зам "/parking") тул
    // synthetic tile-үүдээс (userapp-*) ялгаатайгаар, ЯГ ТЭР ЗАМЫГ
    // л ашиглана. Owner үед л ЭНЭ branch-аар мэдэгдэнэ, staff үед
    // admin Layout-ийн Outlet-ээр ParkingPage.jsx харагдана.
    mainContent = <OwnerParking hoaId={hoaId} />;
  } else if (pathAfterHoa.startsWith('/userapp-profile')) {
    mainContent = (
      <UserAppProfile
        user={user} theme={theme} onToggleTheme={onToggleTheme}
        prefs={prefs} savePrefs={savePrefs}
      />
    );
  } else if (!isCurrentPageAllowed) {
    mainContent = <GateMessage icon="🚫" title="Нэвтрэх эрхгүй хуудас" />;
  } else {
    mainContent = <Outlet />;
  }

  return (
    <div className="userapp-root app-shell" data-theme={theme === 'dark' ? 'dark' : 'light'}>
      {/* 2026-08-27: Леир 1/2/3 — үүргэлж БүүРЭН тусад нь оршдог 3
          давхарга (тодорхойлолтоор үүлдэн бүүрхэх). Custom өнгө/зураг
          сонгоогүй үед Леир 1 тунгалаг үлдэж, доорх theme-ийн анхны
          дэвсгэр (--bg-page) харагдана. */}
      <div
        className="app-bg-l1"
        style={{
          backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
          backgroundColor: !bgImageUrl && prefs.bg_color ? prefs.bg_color : undefined,
        }}
      />
      <div className="app-bg-l2" style={{ opacity: 'var(--bg-l2-opacity, 0)' }} />
      <div className="app-bg-l3" />
      <div className="home-header">
        <div>
          <div className="app-title">{tenantName || 'COSMO'}</div>
          <div className="user-greeting">{ownerUnit || `${user?.email} · Сууц өмчлөгч`}</div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => navigate(`/${hoaId}/userapp-msgr`)} aria-label="Мэдэгдэл"><BellIcon /></button>
          {isHome && (
            <button className="icon-btn" onClick={() => setShowAddModal(true)} aria-label="Нуусан товч"><PlusIcon /></button>
          )}
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} aria-label="Гарах"><LogoutIcon /></button>
        </div>
      </div>

      {/* 2026-08-28: ОЛСОН БОДИТ АЛДАА — "content-body-transition" +
          key={pathAfterHoa} нь хуудас солигдох БүРД (Home→бусад→Home
          гэх мэт) БүХ дэд компонентыг (Hero, TileGrid, badges) ШИНЭЭР
          mount хийж, ДАТАГ ДАХИН АЧААЛУУЛДАГ байсан — яг энэ нь "Hero
          алга болчихоод дахин гарч ирдэг", "товч дарахад гацалт
          ажиглагдах", "апп удаан ачаалагдах" гэсэн 3 тайлбарласан
          зүйлийн НЭГ л үндсэн шалтгаан байв. Хүнгэн шилжилтийн
          "мэдрэмж" нь ЭНЭ үнэ цэнэтэй биш тул зүгээр арилгав. */}
      <div ref={contentScrollRef} className="content-body">
        <div key={refreshKey}>{mainContent}</div>
      </div>

      {comingSoonTitle && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setComingSoonTitle(null)}>
          <div className="qpay-modal">
            <div className="add-tile-title">{comingSoonTitle}</div>
            <div className="pool-empty" style={{ padding: '10px 0 20px' }}>Энэ модуль түн удахгүй нэмэгдэнэ.</div>
            <button className="login-btn" onClick={() => setComingSoonTitle(null)}>Хаах</button>
          </div>
        </div>
      )}

      <div className="tab-bar-wrap">
        <TabBar
          tabs={TABS}
          active={TABS.findIndex((t) => t.key === bottomTab)}
          onChange={(idx) => handleTabChange(TABS[idx].key)}
        />
      </div>
    </div>
  );
}

function GateMessage({ icon, title }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{title}</div>
    </div>
  );
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 2.5 11h2.3v9.3h6V15h2.4v5.3h6V11h2.3z" /></svg>;
}
function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19a4 4 0 014-3h8a4 4 0 014 3" /><circle cx="12" cy="8" r="4" />
    </svg>
  );
}
