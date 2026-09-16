// Сар бүрийн төлбөрийн дугаартай badge мөр (12 сар) — дугуй цэг БИШ, тоо
// бүхий дөрвөлжин (rounded — 4px). 2026-09-13 хэрэглэгчийн заасны дагуу
// 3 төлөвт болгов: ТӨЛСӨН (цэнхэр), ТӨЛӨӨГҮЙ/хугацаа хэтэрсэн (улаан),
// АНХДАГЧ (ирээдүйн сар БОЛОН анхны төлбөр хийгдээгүй үеийн сар — хүснэгэлийн
// баганын текстийн өнгөтэй ижил, тодруулгагүй). Owners.jsx/ClienteleTable.jsx
// хүснэгэлд мөр бүрд (хэдэн зуун удаа) ашиглагддаг тул НЭГ газар засварлавал
// хаа сайгүй нэгэн зэрэг шинэчлэгдэнэ.
//
// TODO: бодит payments хүснэгэлээс тухайн өмчлөгчийн "хэдэн сар хүртэл
// төлбөрөө барагдуулсан" БОЛОН "анхны төлбөрөө хэзээ хийсэн"-ийг унших
// ёстой. Одоохондоо backend байхгүй тул screenshot-той тохирсон ЖИШЭЭ
// утгуудаар (цэвэр гараар бичсэн, algorithmic биш) дуудагч тал (Owners.jsx,
// ClienteleTable.jsx) мөр бүрт эргэлдүүлж ашиглана.
const MONTHS_SHORT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// {firstPaymentMonth, paidThroughMonth} — firstPaymentMonth=null үед тухайн
// өмчлөгч хараахан анхны төлбөрөө хийгээгүй тул БҮХ сар анхдагч өнгөтэй.
// 2026-09-13: Хэрэглэгчийн шаардсанаар — тухайн tenant СӨХ өмчлөгчдийн
// бүртгэлээ бүрэн оруулж, программ ашиглаж эхлээгүй тул санамсаргүй
// жишээ (төлсөн/төлөөгүй) dataг хоослов. firstPaymentMonth: null үед
// бүх сар "анхдагч" (тодруулгагүй, хүснэгэлийн текстийн өнгөтэй)
// байдлаар харагдана — бодит payments backend холбогдох хүртэл.
export const EXAMPLE_PAYMENT_ROWS = [
  { firstPaymentMonth: null, paidThroughMonth: 0 },
];

export default function PaymentBadges({ firstPaymentMonth, paidThroughMonth, currentMonth }) {
  const cm = currentMonth ?? (new Date().getMonth() + 1);
  return (
    <div className="flex gap-[2px]">
      {MONTHS_SHORT.map((m) => {
        // Анхны төлбөр хийгдээгүй, эсвэл тухайн сар анхны төлбөрөөс өмнө,
        // эсвэл тухайн сар хараахан төлөх хугацаа болоогүй (ирээдүй) бол
        // АНХДАГЧ өнгө.
        const isTrackable = firstPaymentMonth != null && m >= firstPaymentMonth && m <= cm;
        const paid = isTrackable && m <= paidThroughMonth;
        const overdue = isTrackable && !paid;
        return (
          <span
            key={m}
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-semibold border ${
              paid
                ? 'bg-blue-500/[0.18] text-customBlue border-blue-500/30'
                : overdue
                ? 'bg-red-500/[0.18] text-customRed border-red-500/30'
                : 'bg-transparent border-slate-500/20 dark:border-bordercol text-slate-500 dark:text-mutedtext'
            }`}
          >
            {m}
          </span>
        );
      })}
    </div>
  );
}
