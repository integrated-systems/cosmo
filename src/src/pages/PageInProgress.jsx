import { useLocation } from 'react-router-dom';
import { MENU_SECTIONS, SUPERSYSADMIN, SUPERSYSADMIN_TENANT_ITEMS } from '../config/menu';

const ALL_ITEMS = [...MENU_SECTIONS.flatMap((s) => s.items), SUPERSYSADMIN, ...SUPERSYSADMIN_TENANT_ITEMS];

// projectcosmo.html-ийн fallback (мөр ~802-806) — цэсэнд байгаа ч
// хараахан хуудас нь бүтээгдээгүй бүх линкэнд ижил анхдагч дэлгэц.
export default function PageInProgress() {
  const location = useLocation();
  const current = ALL_ITEMS.find((i) => i.path === location.pathname);
  const title = current?.label || 'Энэ хуудас';

  return (
    <div className="bg-white dark:bg-[#070d1d] border border-slate-200 dark:border-[#1a2642] rounded-lg p-6 text-center text-slate-500 dark:text-[#8a99ad]">
      "{title}" хуудасны мэдээлэл бэлтгэгдэж байна.
    </div>
  );
}
