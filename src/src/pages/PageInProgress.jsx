import { useLocation } from 'react-router-dom';
import { MENU_SECTIONS, SUPERSYSADMIN, SUPERSYSADMIN_TENANT_ITEMS } from '../config/menu';

const ALL_ITEMS = [...MENU_SECTIONS.flatMap((s) => s.items), SUPERSYSADMIN, ...SUPERSYSADMIN_TENANT_ITEMS];

// projectcosmo.html-ийн fallback (мөр ~802-806) — цэсэнд байгаа ч
// хараахан хуудас нь бүтээгдээгүй бүх линкэнд ижил анхдагч дэлгэц.
//
// 2026-08-13 хэрэглэгчийн заавар: "Хянах самбар"-аас бусад бүх хуудсанд
// "Сууц өмчлөгч бүртгэл" хуудасных шиг toolbar card байрлуулна (Дашборд
// онцгой зохион байгуулалттай тул хамаарахгүй). Одоогоор ерөнхий/жишээ
// элементүүд, хожим хуудас бүрийн онцлогт тааруулж тохируулна (Rule of
// two-ийн дагуу Owners.jsx-ийн toolbar-ийг лавлагаа болгов).
export default function PageInProgress() {
  const location = useLocation();
  const pathAfterHoa = location.pathname.replace(/^\/[^/]+/, '');
  const current = ALL_ITEMS.find((i) => i.path === pathAfterHoa);
  const title = current?.label || 'Энэ хуудас';

  return (
    <>
      <div className="ds-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <select className="ds-select">
            <option>Бүх төрөл</option>
          </select>
          <select className="ds-select">
            <option>Бүх төлөв</option>
          </select>
          <div className="relative min-w-[200px]">
            <input type="text" placeholder="Хайх..." className="ds-input w-full pl-8" />
            <svg className="w-4 h-4 text-slate-400 dark:text-mutedtext absolute left-2.5 top-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="ds-btn-secondary">Хэвлэх</button>
          <button className="ds-btn-secondary">Экспортлох</button>
          <button className="ds-btn-primary">+ Нэмэх</button>
        </div>
      </div>

      <div className="bg-white dark:bg-sidebg border border-slate-200 dark:border-bordercol rounded-lg p-6 text-center text-slate-500 dark:text-mutedtext">
        "{title}" хуудасны мэдээлэл бэлтгэгдэж байна.
      </div>
    </>
  );
}
