import { useParams } from 'react-router-dom';
import { usePlanFeatures } from '../hooks/usePlanFeatures';
import { useAuth } from '../lib/AuthContext';

// RequireRole.jsx-тэй ИЖИЛ "Rule of two" зарчмаар — 2026-09-09,
// Багц (Basic/Standard/Premium/Premium+)-ийн модулийн зөвшөөрлийг
// route түвшинд хамгаална (SUPERSYSADMIN үргэлж бүрэн хандах эрхтэй,
// бусад Sidebar-аас нуугдсан модулийг URL-аар шууд орж чадахгүй).
export default function RequireFeature({ featureKey, children }) {
  const { hoaId } = useParams();
  const { isSuperSysAdmin } = useAuth();
  const { hasFeature, loading } = usePlanFeatures(hoaId);

  if (isSuperSysAdmin || loading) return children;

  if (!hasFeature(featureKey)) {
    return (
      <div className="ds-card p-8 flex flex-col items-center justify-center text-center gap-3" style={{ minHeight: '50vh' }}>
        <div className="text-4xl">🔒</div>
        <div className="text-lg font-semibold text-slate-900 dark:text-white">Энэ модуль таны одоогийн багцад багтаагүй байна</div>
        <div className="text-sm text-slate-500 dark:text-mutedtext max-w-md">
          үүнийг ашиглахын тулд илүү өндр багц руу шилжүүлэхийг хүсвэл СӨХ үйлчилгээ үзүүлэгчтэй холбогдоно уу.
        </div>
      </div>
    );
  }

  return children;
}
