import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MENU_SECTIONS, SUPERSYSADMIN, SUPERSYSADMIN_TENANT_ITEMS } from '../config/menu';
import { MailIcon, SunIcon, MoonIcon, SettingsIcon } from './icons/Icons';
import { supabase } from '../lib/supabaseClient';
import { usePlans } from '../hooks/usePlans';
import ProfileModal from './ProfileModal';
import { usePushNotifications } from '../hooks/usePushNotifications';

const ALL_ITEMS = [...MENU_SECTIONS.flatMap((s) => s.items), SUPERSYSADMIN, ...SUPERSYSADMIN_TENANT_ITEMS];

// YYYY/MM/DD формат — хэрэглэгчийн тодорхой заасан.
function formatExpiryDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// 2026-09-08 (24): АЛДАА ЗАСАВ — эхний талбар үүрд өөрчлөгддөггүй
// `trial_ends_at`-ыг л харуулдаг байсан тул, Trial-с бодит багц руу
// шилжсэний дараа ч хуучин Trial-ийн дуусах огноог (динамикаар
// солигдохгүйгээр) харуулсаар байв. Одоо `plan_activated_at`
// (багц СүүЛД идэвхжсэн/солигдсон өдөр — Billing/TenantStatus/
// Багц ахиулах батлах бүгд үүнийг шинэчилдэг) дээр үндэслэж,
// САРЫН мөчлөөр (+1 сар) төлбөрийн дараагийн огноог тооцоолж харуулна.
function addOneMonth(iso) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export default function Topbar({ theme, onToggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hoaId } = useParams();
  const { plans } = usePlans();
  const [tenantInfo, setTenantInfo] = useState(null);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // 2026-08-30: Мессенжерийн push notification-ийг STAFF тал хүлээн
  // авахын тулд БүРТГүүЛЭХ UI шаардлагатай байсан — өмнө нь ЗөВХөН
  // OwnerApp-ийн Профайл хуудсанд л ийм товч байсан тул admin/staff
  // хэзээ ч push мэдэгдэл хүлээж авдаггүй байв.
  const { supported: pushSupported, subscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications(hoaId);

  // 2026-08-19 хэрэглэгч тодорхой заасан: "Захиалах" товчны дизайн/
  // хүрээг ОГТ өөрчлөхгүйгээр, дотор нь тухайн tenant-ийн Төлбөрийн
  // хугацаа дуусах огноог YYYY/MM/DD форматаар харуулна (аль ч
  // багцийн tenant-д хамаарна — зөвхөн Trial биш).
  // 2026-09-08 (24): plan_activated_at+1 сараар тооцоолж, plan_key-г
  // ч хамт татаж "Сунгах" товчинд идэвхтэй багцын нэрийг харуулна.
  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    supabase.from('tenants').select('plan_key, plan_activated_at').eq('id', hoaId).single().then(({ data }) => {
      if (!cancelled) setTenantInfo(data || null);
    });
    return () => { cancelled = true; };
  }, [hoaId]);

  const expiryLabel = tenantInfo?.plan_activated_at ? formatExpiryDate(addOneMonth(tenantInfo.plan_activated_at)) : null;
  const currentPlanLabel = plans.find((p) => p.key === tenantInfo?.plan_key)?.label || null;

  // URL нь /:hoaId/xxx хэлбэртэй тул эхний segment-ийг (hoaId) тайлж
  // match хийнэ.
  const pathAfterHoa = location.pathname.replace(/^\/[^/]+/, '');
  const current = ALL_ITEMS.find((i) => i.path === pathAfterHoa);
  // 2026-08-19: "Сонгууль, санал асуулга" хуудасны дэд route-үүд
  // (/voting/new, /voting/:id/edit) яг таарахгүй тул үндсэн Voting
  // цэсний гарчгийг ашиглана — энэ нь тусдаа "Хянах самбар" хуудас
  // БИШ, зүгээр л үүний нэг хэсэг.
  const votingItem = ALL_ITEMS.find((i) => i.path === '/voting');
  const title = current?.label || (pathAfterHoa.startsWith('/voting') ? votingItem?.label : null) || 'Хянах самбар';

  return (
    <header className="h-[50px] bg-white dark:bg-appbg border-b border-slate-200 dark:border-bordercol
      flex items-center pl-5 pr-2.5 sticky top-0 z-[900] justify-between">
      <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</span>

      <div className="flex items-center gap-2">
      <div
        title={expiryLabel ? `Төлбөрийн хугацаа дуусах: ${expiryLabel}` : 'Захиалах'}
        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
          flex items-center justify-center text-[12px] font-medium text-slate-600 dark:text-mutedtext select-none"
      >
        {expiryLabel || 'Захиалах'}
      </div>

      <div
        title={currentPlanLabel || 'Сунгах'}
        className="h-8 px-3 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
          flex items-center justify-center text-[12px] font-medium text-slate-600 dark:text-mutedtext select-none"
      >
        {currentPlanLabel || 'Сунгах'}
      </div>

      <button
        onClick={() => navigate(`/${hoaId}/emails`)}
        title="Имэйл"
        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
          flex items-center justify-center text-slate-600 dark:text-mutedtext hover:text-slate-900
          dark:hover:text-white transition-colors cursor-pointer"
      >
        <MailIcon />
      </button>

      {pushSupported && (
        <button
          onClick={() => (pushSubscribed ? pushUnsubscribe() : pushSubscribe())}
          title={pushSubscribed ? 'Push мэдэгдэл идэвхтэй (унтраах бол дар)' : 'Push мэдэгдэл идэвхжүүлэх'}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
            pushSubscribed
              ? 'border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:border-blue-500/40 dark:text-blue-300'
              : 'border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg text-slate-600 dark:text-mutedtext hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        </button>
      )}

      <button
        onClick={onToggleTheme}
        title="Тема солих"
        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
          flex items-center justify-center text-slate-600 dark:text-mutedtext hover:text-slate-900
          dark:hover:text-white transition-colors cursor-pointer"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* 2026-08-19: Багц ахиулах/сунгах placeholder — одоогоор бодит
          төлбөрийн логик хүлээгдэж буй, зүгээр dropdown үзүүлнэ.
          Дараа хвгжүүлнэ. */}
      <div className="relative">
        <button
          onClick={() => setPlanMenuOpen((v) => !v)}
          title="Тохиргоо"
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg
            flex items-center justify-center text-slate-600 dark:text-mutedtext hover:text-slate-900
            dark:hover:text-white transition-colors cursor-pointer"
        >
          <SettingsIcon />
        </button>
        {planMenuOpen && (
          <>
            <div className="fixed inset-0 z-[901]" onClick={() => setPlanMenuOpen(false)} />
            <div className="absolute right-0 top-[calc(100%+6px)] z-[902] w-[180px] rounded-lg border border-slate-200 dark:border-bordercol bg-white dark:bg-sidebg shadow-lg overflow-hidden">
              <button
                onClick={() => { setPlanMenuOpen(false); setProfileOpen(true); }}
                className="w-full text-left px-3.5 py-2.5 text-[12.5px] text-slate-700 dark:text-text hover:bg-slate-100 dark:hover:bg-appbg transition-colors"
              >
                Профайл
              </button>
              <button
                onClick={() => setPlanMenuOpen(false)}
                className="w-full text-left px-3.5 py-2.5 text-[12.5px] text-slate-700 dark:text-text hover:bg-slate-100 dark:hover:bg-appbg transition-colors border-t border-slate-200 dark:border-bordercol"
              >
                Багц ахиулах
              </button>
              <button
                onClick={() => setPlanMenuOpen(false)}
                className="w-full text-left px-3.5 py-2.5 text-[12.5px] text-slate-700 dark:text-text hover:bg-slate-100 dark:hover:bg-appbg transition-colors border-t border-slate-200 dark:border-bordercol"
              >
                Багц сунгах
              </button>
              <button
                onClick={() => { setPlanMenuOpen(false); navigate(`/${hoaId}/about-program`); }}
                className="w-full text-left px-3.5 py-2.5 text-[12.5px] text-slate-700 dark:text-text hover:bg-slate-100 dark:hover:bg-appbg transition-colors border-t border-slate-200 dark:border-bordercol"
              >
                Программын тухай
              </button>
            </div>
          </>
        )}
      </div>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}
