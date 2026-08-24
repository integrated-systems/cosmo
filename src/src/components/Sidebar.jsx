import { NavLink, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MENU_SECTIONS, SUPERSYSADMIN, SUPERSYSADMIN_TENANT_ITEMS } from '../config/menu';
import HoaSwitcher from './HoaSwitcher';
import { useAuth } from '../lib/AuthContext';
import { useTenants } from '../hooks/useTenants';
import { useTenantStats, formatOwnedRatio } from '../hooks/useTenantStats';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

const navItemBase = 'px-4 py-1.5 text-[13px] leading-[1.2] cursor-pointer flex items-center justify-between no-underline transition-colors';
const navItemInactive = 'text-slate-600 dark:text-mutedtext hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-menuhover';
const navItemActive = 'text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-menuactive border-r-[3px] border-blue-600 dark:border-blue-500';

// 2026-08-16 хэрэглэгчийн тодорхой заасны дагуу дахин өөрчилсөн: HoaSwitcher
// dropdown АНХ (session бүрт) "СӨХ сонгох" placeholder-ыг харуулна, сонгосны
// дараа л бодит нэрийг харуулдаг болно. sessionStorage ашигласан нь
// window.location.reload() хийсний ДАРАА ч (component бүрэн дахин mount
// хийгддэг) энэ сонголт "санагдсан" хэвээр үлдэхийн тулд (tab доторх л,
// browser хаагдвал арилна).
const HOA_PICKED_KEY = 'cosmo-hoa-picked';

export default function Sidebar({ isOpen, isMobile, onToggle, isSuperSysAdmin }) {
  const { signOut, user, roles } = useAuth();
  const { tenants } = useTenants();
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { stats } = useTenantStats(hoaId);
  const [msgrUnread, setMsgrUnread] = useState(0);
  const [pendingTenantCount, setPendingTenantCount] = useState(0);

  // SUPERSYSADMIN-ийн "Tenant Status" цэсний хажууд "Хүлээгдэж байна"
  // твлввтэй (pending_approval) шинэ tenant хүсэлтийн тоог badge
  // маягаар харуулна — 2026-08-19 хэрэглэгч тодорхой заасан "SUPERSYSADMIN-д
  // мэдэгдэнэ" гэсэн шаардлагыг үүгээр (in-app badge) хэрэгжүүлэв.
  useEffect(() => {
    if (!isSuperSysAdmin) return;
    let cancelled = false;
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval').then(({ count }) => {
      if (!cancelled) setPendingTenantCount(count || 0);
    });
    return () => { cancelled = true; };
  }, [isSuperSysAdmin]);

  // Sidebar цэсний "Мессенжер"-ийн хажууд уншаагүй мессежийн НИЙТ тоог
  // badge маягаар харуулах — 2026-08-19 хэрэглэгч тодорхой заасан.
  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    fetchAllRows(() => supabase.from('msgr_list').select('unread_count').eq('tenant_id', hoaId)).then(({ data }) => {
      if (cancelled) return;
      const total = (data ?? []).reduce((s, r) => s + (r.unread_count || 0), 0);
      setMsgrUnread(total);
    });
    return () => { cancelled = true; };
  }, [hoaId]);
  const hasPicked = sessionStorage.getItem(HOA_PICKED_KEY) === 'true';
  const currentTenantName = tenants.find((t) => t.id === hoaId)?.name;

  // HoaSwitcher-ээс шинэ СӨХ сонгоход SPA soft-navigate (react-router) БИШ,
  // **бүтэн хуудсыг рефреш** (window.location.reload()) хийж тэр даруй
  // шинэ СӨХ-ийн хуудсыг цэвэрхэн ачаална — component state/дата хоорондоо
  // холилдохоос бүрэн сэргийлнэ.
  function handleHoaChange(newHoaId) {
    sessionStorage.setItem(HOA_PICKED_KEY, 'true');
    const currentPath = window.location.hash.replace(/^#/, '') || '/dashboard';
    const rest = currentPath.replace(/^\/[^/]+/, '') || '/dashboard';
    window.location.hash = `/${newHoaId}${rest}`;
    window.location.reload();
  }

  return (
    <aside
      className={`w-[208px] h-screen bg-slate-50 dark:bg-sidebg border-r border-slate-200 dark:border-bordercol
        flex flex-col fixed top-0 left-0 transition-transform duration-300 ease-in-out z-[1000]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Хураах товч */}
      <button
        onClick={onToggle}
        title="Сайдбар хураах/нээх"
        className="absolute -right-[13px] top-1/2 -translate-y-1/2 w-[26px] h-[26px] bg-white dark:bg-sidebg
          border border-slate-200 dark:border-bordercol rounded-full text-mutedtext flex items-center justify-center
          cursor-pointer z-[1001] transition-colors hover:bg-slate-100 dark:hover:bg-bordercol
          hover:text-slate-900 dark:hover:text-white shadow-md"
      >
        <svg
          className={`w-[14px] h-[14px] transition-transform duration-300 ease-in-out ${!isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Толгой хэсэг — олон СӨХ (multi-tenant) архитектур: дээд мөр
          Integrated Systems брэнд (тогтмол), доод мөр тухайн СӨХ-ны нэр
          (backend-ээс dynamic ирнэ, одоогоор жишээ утга). */}
      <div className="h-[50px] px-3 flex items-center gap-2 border-b border-slate-200 dark:border-bordercol">
        <img src={`${import.meta.env.BASE_URL}logicon.png`} alt="" className="w-7 h-7 shrink-0 rounded-md" />
        <div className="min-w-0 leading-[1.2]">
          <div className="font-semibold text-slate-900 dark:text-white text-[13px] truncate">COSMO</div>
          <div className="text-slate-500 dark:text-mutedtext text-[11px] truncate">Integrated Systems</div>
        </div>
      </div>

      {/* SUPERSYSADMIN-д зөвхөн харагдах СӨХ context switcher — "ҮНДСЭН"
          бүлгийн эхэнд, менюгээс тусад нь. Сонголт URL-ийн :hoaId-г шууд
          өөрчилдөг тул refresh/share-д тэсвэртэй. */}
      <HoaSwitcher isSuperSysAdmin={isSuperSysAdmin} value={hasPicked ? hoaId : ''} onChange={handleHoaChange} tenants={tenants} />

      {/* Ердийн (supersysadmin биш) tenant хэрэглэгчид зориулсан — сонголт
          биш, зөвхөн нэвтэрсэн өөрийн СӨХ-ийн нэрийг харуулах статик мөр. */}
      {!isSuperSysAdmin && (
        <div className="px-3 pt-[23px] pb-1">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate px-1">
            {currentTenantName || '—'}
          </div>
        </div>
      )}

      {/* Меню хэсэг — бүх линк одоогийн :hoaId-г тээж явна */}
      <nav className="flex-1 overflow-y-auto py-2">
        {MENU_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] text-slate-600 dark:text-text px-4 py-1.5 tracking-[0.5px] font-semibold uppercase leading-[1.2]">
              {section.title}
            </div>
            {section.items.filter((item) => item.key !== 'emails').map((item) => {
              const badge = item.key === 'msgr' ? (msgrUnread > 0 ? msgrUnread : null) : item.badge;
              return (
              <NavLink
                key={item.key}
                to={`/${hoaId}${item.path}`}
                className={({ isActive }) => `${navItemBase} ${isActive ? navItemActive : navItemInactive}`}
              >
                <span>{item.label}</span>
                {badge != null && (
                  <span className="bg-customRed text-white text-[10px] px-1.5 py-0.5 rounded-[10px] font-semibold leading-none">
                    {badge}
                  </span>
                )}
              </NavLink>
              );
            })}
          </div>
        ))}
        {/* SUPERSYSADMIN — платформын дээд түвшний админ, 7 бүлгээс тусад нь.
            2026-08-16 хэрэглэгчийн олсон алдааг зассан: өмнө зөвхөн дэд
            SaaS цэс (Billing г.м)-ийг isSuperSysAdmin-аар хамгаалж,
            ТОЛГОЙ линк өөрийг нь хамгаалаагүй байсан тул ердийн tenant
            хэрэглэгч ч "SUPERSYSADMIN" линкийг ХАРДАГ байсан. Одоо БГХЭЛ
            блокийг (толгой линк+дэд цэс хамт) хамгаална. */}
        {isSuperSysAdmin && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-bordercol">
          <NavLink
            to={`/${hoaId}${SUPERSYSADMIN.path}`}
            className={({ isActive }) => `${navItemBase} font-bold ${isActive ? navItemActive : navItemInactive}`}
          >
            <span>{SUPERSYSADMIN.label}</span>
          </NavLink>
          {SUPERSYSADMIN_TENANT_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={`/${hoaId}${item.path}`}
              className={({ isActive }) => `${navItemBase} pl-7 ${isActive ? navItemActive : navItemInactive}`}
            >
              <span>{item.label}</span>
              {item.key === 'tenantstatus' && pendingTenantCount > 0 && (
                <span className="bg-customOrange text-white text-[10px] px-1.5 py-0.5 rounded-[10px] font-semibold leading-none">
                  {pendingTenantCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
        )}
      </nav>

      {/* Доод карт хэсэг — 2026-08-16 хэрэглэгчийн заасны дагуу нэр/role
          хэсгийг hardcode "SUPERSYSADMIN"/"Админ" placeholder-ээс бодит
          нэвтэрсэн хэрэглэгчийн (email+role) динамик утга болгов.
          2026-08-19: доорхи тоо баримт (16 байр·18 орц гэх мэт) ХЭВЭЭР
          жишээ дата байсныг useTenantStats hook-оор бодит Supabase
          (owners/clientele/unit_layouts) дата руу шилжүүлэв. */}
      <div className="p-2 border-t border-slate-200 dark:border-bordercol bg-slate-50 dark:bg-sidebg">
        <div className="bg-white dark:bg-appbg border border-slate-200 dark:border-bordercol rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[12px] font-semibold leading-[1.2] text-slate-900 dark:text-white truncate max-w-[140px]">{user?.email || 'Хэрэглэгч'}</div>
              <div className="text-[10px] text-slate-500 dark:text-mutedtext mt-[1px] leading-[1.2]">
                {isSuperSysAdmin ? 'SUPERSYSADMIN' : roles.includes('tenant_admin') ? 'СӨХ-ны админ' : 'Гишүүн'}
              </div>
            </div>
            <button
              title="Гарах"
              onClick={signOut}
              className="bg-transparent border-none cursor-pointer text-slate-500 dark:text-mutedtext flex items-center
                justify-center p-0.5 transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 16l4-4m0 0-4-4m4 4H8m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-mutedtext leading-[1.2] space-y-[3px]">
            <div className="flex justify-between py-[1px]">
              <span>{stats ? `${stats.buildingCount} байр · ${stats.entranceCount} орц` : 'Ачаалж байна...'}</span>
            </div>
            {stats && (
              <>
                <div className="flex justify-between py-[1px]"><span>Оршин суугч</span><span>{stats.residentCount}</span></div>
                <div className="flex justify-between py-[1px]"><span>Хүүхэд 0-5 нас</span><span>{stats.child05}</span></div>
                <div className="flex justify-between py-[1px]"><span>Хүүхэд 6-18 нас</span><span>{stats.child618}</span></div>
                <div className="flex justify-between py-[1px]"><span>Тоот</span><span>{formatOwnedRatio(stats.toot.owned, stats.toot.total)}</span></div>
                <div className="flex justify-between py-[1px]"><span>Зогсоол</span><span>{formatOwnedRatio(stats.parking.owned, stats.parking.total)}</span></div>
                <div className="flex justify-between py-[1px]"><span>Агуулах</span><span>{formatOwnedRatio(stats.storage.owned, stats.storage.total)}</span></div>
                <div className="flex justify-between py-[1px]"><span>Бүртгэлтэй машин</span><span>{stats.vehicleCount}</span></div>
                <div className="flex justify-between py-[1px]"><span>Талбай өмчлөгч</span><span>{stats.talbaiOwnerCount}</span></div>
                <div className="flex justify-between py-[1px]"><span>Харилцагч байгууллага</span><span>{stats.harilzagchCount}</span></div>
              </>
            )}
          </div>
          <div className="mt-2 text-[9px] text-darktext">Version 3.11.260814</div>
        </div>
      </div>
    </aside>
  );
}
