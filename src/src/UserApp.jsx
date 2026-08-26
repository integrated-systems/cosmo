import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './lib/AuthContext';
import { useAccessRules } from './hooks/useAccessRules';
import { useTenantGate } from './hooks/useTenantGate';
import { DEFAULT_TENANT_ID } from './config/tenant';
import { MENU_SECTIONS } from './config/menu';
import TileGrid from './components/UserApp/TileGrid';
import TabBar from './components/UserApp/TabBar';
import UserAppProfile from './components/UserApp/UserAppProfile';
import './userapp.css';

// 2026-08-19: резидент (owner) shell — the2m26/suh (GitHub: userapp-react)
// прожектийн бодитоор туршигдсан, бүтэн PWA UI/UX (TileGrid+TabBar)-ыг
// Cosmo-ийн бодит эрхийн систем (useAccessRules+userapp_config)-той
// hолбож дасан зохицуулав. Үвр Supabase project/схем ОГТ ашиглаагүй —
// зүгээр л дизайн/interaction кодыг л "аврч" авав.
//
// Одоогоор бодит Cosmo backend-тэй hолбогдсон модуль: news, voting, msgr.
// Үлдсэн (Дашбоард-ийн санхүүгийн график, Твлбвр/QPay, Зочин урих,
// Хэрэгцээт мэдээлэл г.м) — Cosmo-д тэдгээрийн backend hараахан
// байгуулагдаагүй тул "Түн удахгүй" гэсэн placeholder-ээр үзүүлнэ.
const ALL_MENU_ITEMS = MENU_SECTIONS.flatMap((s) => s.items);
const BUILT_PAGE_KEYS = ['news', 'voting', 'msgr'];

const TABS = [
  { key: 'home', label: 'Home', icon: <HomeIcon /> },
  { key: 'payment', label: 'Твлбвр', icon: <PaymentIcon /> },
  { key: 'profile', label: 'Profile', icon: <ProfileIcon /> },
];

export default function UserApp({ theme, onToggleTheme }) {
  const { user } = useAuth();
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isPending, isRejected, isDeactivated } = useTenantGate();
  const { can, loading: accessLoading } = useAccessRules(hoaId);
  const [userappEnabled, setUserappEnabled] = useState({});
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

  const allowedItems = ALL_MENU_ITEMS.filter((item) => (userappEnabled[item.key] !== false) && can(item.key, 'view'));

  const pathAfterHoa = location.pathname.replace(/^\/[^/]+/, '');
  const isHome = pathAfterHoa === '' || pathAfterHoa === '/';
  const currentItem = ALL_MENU_ITEMS.find((i) => pathAfterHoa === i.path || pathAfterHoa.startsWith(i.path + '/'));
  const isCurrentPageAllowed = currentItem
    ? (userappEnabled[currentItem.key] !== false) && can(currentItem.key, 'view')
    : false;

  function handleOpenTile(item) {
    if (BUILT_PAGE_KEYS.includes(item.key)) {
      navigate(`/${hoaId}${item.path}`);
    } else {
      setComingSoonTitle(item.label);
    }
  }

  function handleTabChange(key) {
    setBottomTab(key);
    if (key === 'home') navigate(`/${hoaId}`);
    else if (key === 'profile') navigate(`/${hoaId}/userapp-profile`);
    else setComingSoonTitle('Твлбвр');
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
      <TileGrid
        items={allowedItems}
        onOpenTile={handleOpenTile}
        showAddModal={showAddModal}
        onCloseAddModal={() => setShowAddModal(false)}
      />
    );
  } else if (pathAfterHoa.startsWith('/userapp-profile')) {
    mainContent = <UserAppProfile user={user} theme={theme} onToggleTheme={onToggleTheme} />;
  } else if (!isCurrentPageAllowed) {
    mainContent = <GateMessage icon="🚫" title="Нэвтрэх эрхгүй хуудас" />;
  } else {
    mainContent = <Outlet />;
  }

  return (
    <div className="userapp-root app-shell" data-theme={theme === 'dark' ? 'dark' : 'light'}>
      <div className="home-header">
        <div>
          <div className="app-title">{tenantName || 'COSMO'}</div>
          <div className="user-greeting">{user?.email} · Сууц вмчлвгч</div>
        </div>
        <div className="header-actions">
          {isHome && (
            <button className="icon-btn" onClick={() => setShowAddModal(true)} aria-label="Нуусан товч">+</button>
          )}
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} aria-label="Гарах">⎋</button>
        </div>
      </div>

      <div className="content-body">{mainContent}</div>

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
