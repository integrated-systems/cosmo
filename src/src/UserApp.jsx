import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './lib/AuthContext';
import { useAccessRules } from './hooks/useAccessRules';
import { useTenantGate } from './hooks/useTenantGate';
import { useUserAppPrefs } from './hooks/useUserAppPrefs';
import { DEFAULT_TENANT_ID } from './config/tenant';
import { MENU_SECTIONS } from './config/menu';
import TileGrid from './components/UserApp/TileGrid';
import TabBar from './components/UserApp/TabBar';
import UserAppProfile from './components/UserApp/UserAppProfile';
import HeroQuorumCard from './components/UserApp/HeroQuorumCard';
import OwnerMsgrThread from './components/UserApp/OwnerMsgrThread';
import OwnerDashboard from './pages/OwnerDashboard';
import './userapp.css';

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
const BUILT_PAGE_KEYS = ['news', 'voting', 'msgr', 'dashboard'];

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
  const { prefs, bgImageUrl, savePrefs, uploadBgImage } = useUserAppPrefs(user?.id, hoaId);
  const [userappEnabled, setUserappEnabled] = useState({});
  const [badges, setBadges] = useState({});
  const [tenantName, setTenantName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState(null);
  const [bottomTab, setBottomTab] = useState('home');

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
      const [{ data: ownerRow }, { data: newsRows }] = await Promise.all([
        supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle(),
        supabase.from('news').select('created_at').eq('tenant_id', hoaId).order('created_at', { ascending: false }).limit(30),
      ]);
      if (cancelled) return;
      const next = {};
      if (ownerRow) {
        const { data: msgrRow } = await supabase.from('msgr_list').select('unread_count').eq('owner_id', ownerRow.id).eq('tenant_id', hoaId).maybeSingle();
        if (!cancelled && msgrRow?.unread_count) next.msgr = msgrRow.unread_count;
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

  const allowedItems = ALL_MENU_ITEMS.filter((item) => (userappEnabled[item.key] !== false) && can(item.key, 'view'));

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
    else setComingSoonTitle('Төлбөр');
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
  } else if (pathAfterHoa.startsWith('/userapp-profile')) {
    mainContent = (
      <UserAppProfile
        user={user} theme={theme} onToggleTheme={onToggleTheme}
        prefs={prefs} bgImageUrl={bgImageUrl} savePrefs={savePrefs} uploadBgImage={uploadBgImage}
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
          <div className="user-greeting">{user?.email} · Сууц өмчлөгч</div>
        </div>
        <div className="header-actions">
          {isHome && (
            <button className="icon-btn" onClick={() => setShowAddModal(true)} aria-label="Нуусан товч">+</button>
          )}
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} aria-label="Гарах">⎋</button>
        </div>
      </div>

      <div className="content-body content-body-transition" key={pathAfterHoa}>{mainContent}</div>

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
