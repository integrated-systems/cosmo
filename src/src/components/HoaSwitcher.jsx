// SUPERSYSADMIN-ийн "СөХ context switch" — impersonation биш (2026-08-13
// хэрэглэгчтэй хийсэн ярианаас: SuperSysAdmin өөрийн session-оороо л
// өөр СөХ-ийн өгөгдлийг харна, тухайн СөХ-ийн admin-ийн session-ыг
// авдаггүй). Бодит impersonation (admin-ийн session шууд авах) хэрэгтэй
// болбол ЭНЭ dropdown-оос тусад нь, илүү хатуу баталгаажуулалттай
// (шалтгаан бичих г.м) тусгай үйлдэл болгоно.
//
// TODO: backend холбогдоход энэ жагсаалтыг SUPERSYSADMIN-ийн эрхтэй
// хэрэглэгчид л ирэх бодит СөХ-үүдийн listing API-аар сольно.
export const EXAMPLE_HOAS = Array.from({ length: 10 }, (_, i) => ({ id: `hoa${i + 1}`, label: `HOA${i + 1}` }));

// Controlled component — сонгосон СөХ-ийн state Sidebar-т байрлана, учир нь
// сонголтоос хамааран SUPERSYSADMIN-ийн SaaS удирдлагын дэд цэс (Billing
// г.м) харагдах эсэхийг Sidebar тодорхойлно.
export default function HoaSwitcher({ isSuperSysAdmin, value, onChange }) {
  if (!isSuperSysAdmin) return null;

  return (
    <div className="px-3 pt-2 pb-1">
      <label className="block text-[9px] font-semibold text-mutedtext mb-1 uppercase tracking-[.06em]">
        СөХ сонгох
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-[#0b132b] border border-slate-200 dark:border-bordercol
          text-slate-900 dark:text-white text-xs rounded px-2.5 py-1.5 outline-none focus:border-blue-500"
      >
        {EXAMPLE_HOAS.map((h) => (
          <option key={h.id} value={h.id}>{h.label}</option>
        ))}
      </select>
    </div>
  );
}
