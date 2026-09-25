// Сар бүрийн төлбөрийн дугаартай badge мөр (12 сар) — дугуй цэг БИШ, тоо
// бүхий дөрвөлжин (rounded — 4px). Owners.jsx/ClienteleTable.jsx
// хүснэгэлд мөр бүрд (хэдэн зуун удаа) ашиглагддаг тул НЭГ газар
// засварлавал хаа сайгүй нэгэн зэрэг шинэчлэгдэнэ.
//
// 2026-09-24 (82): "Хугацаандаа" (paid) мөр хэрэглэгчийн шинэ, тодорхой
// хүсэлтээр өөрчлөгддөг (Санхүү тохиргоо > НББ > Төлбөрийн хоцрогдол)
// болов — өмнөх сессид "PAID үргэлж анхдагч өнгө" гэсэн шийдвэрийг
// хэрэглэгч энэ удаад эргүүлэн, 4 төлөв (paid/pending/overdue/
// at_risk) БҮГД тохируулах боломжтой өнгөтэй болов.
const MONTHS_SHORT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 2026-09-20: overdueColor/atRiskColor нь fin_settings-ээс ирэх
// (жиш "customYellow"/"customRed") нэрсийг ЯГ ТЭР TAILWIND класс
// нэртэй холбоно — динамик template literal class нэр үүсгэхгүй
// байхын тулд (Tailwind JIT purge-д алдагдахаас сэргийлнэ).
const COLOR_CLASSES = {
  customYellow: { text: 'text-customYellow', bg: 'bg-[#f8f23d1a]', border: 'border-[#f8f23d4d]' },
  customOrange: { text: 'text-customOrange', bg: 'bg-customOrange/[0.18]', border: 'border-customOrange/30' },
  customRed: { text: 'text-customRed', bg: 'bg-red-500/[0.18]', border: 'border-red-500/30' },
  customPink: { text: 'text-customPink', bg: 'bg-customPink/[0.18]', border: 'border-customPink/30' },
  customPurple: { text: 'text-customPurple', bg: 'bg-customPurple/[0.18]', border: 'border-customPurple/30' },
  customIndigo: { text: 'text-customIndigo', bg: 'bg-customIndigo/[0.18]', border: 'border-customIndigo/30' },
  customBlue: { text: 'text-customBlue', bg: 'bg-blue-500/[0.18]', border: 'border-blue-500/30' },
  customSkyBlue: { text: 'text-customSkyBlue', bg: 'bg-customSkyBlue/[0.18]', border: 'border-customSkyBlue/30' },
  customGreen: { text: 'text-customGreen', bg: 'bg-emerald-500/[0.18]', border: 'border-emerald-500/30' },
  customBlack: { text: 'text-customBlack', bg: 'bg-customBlack/[0.18]', border: 'border-customBlack/30' },
};
const DEFAULT_CLASS = 'bg-transparent border-slate-500/20 dark:border-bordercol text-slate-500 dark:text-mutedtext';

export const EXAMPLE_PAYMENT_ROWS = [
  { monthStatuses: Array.from({ length: 12 }, () => 'none') },
];

export default function PaymentBadges({ monthStatuses, currentMonth, overdueColor = 'customYellow', atRiskColor = 'customRed', pendingColor = 'default', paidColor = 'customGreen' }) {
  const cm = currentMonth ?? (new Date().getMonth() + 1);
  const statuses = monthStatuses || EXAMPLE_PAYMENT_ROWS[0].monthStatuses;
  return (
    <div className="flex gap-[2px]">
      {MONTHS_SHORT.map((m) => {
        const status = m <= cm ? statuses[m - 1] : 'none';
        const colorKey = status === 'overdue' ? overdueColor : status === 'at_risk' ? atRiskColor : status === 'pending' ? pendingColor : status === 'paid' ? paidColor : null;
        const cls = colorKey && colorKey !== 'default' && COLOR_CLASSES[colorKey] ? `${COLOR_CLASSES[colorKey].bg} ${COLOR_CLASSES[colorKey].text} ${COLOR_CLASSES[colorKey].border}` : DEFAULT_CLASS;
        return (
          <span
            key={m}
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-semibold border ${cls}`}
          >
            {m}
          </span>
        );
      })}
    </div>
  );
}
