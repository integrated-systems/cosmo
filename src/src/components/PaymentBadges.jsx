// Сар бүрийн төлбөрийн дугаартай badge мөр (12 сар) — дугуй цэг БИШ, тоо
// бүхий дөрвөлжин (rounded — 4px), төлсөн сарууд customBlue, төлөгдөөгүй
// улаан (customRed) өнгөтэй. 2026-08-15 хэрэглэгчийн заасны дагуу тусдаа
// компонент болгов — Owners.jsx хүснэгэлд мөр бүрд (хэдэн зуун удаа)
// ашиглагддаг тул НЭГ газар засварлавал хаа сайгүй нэгэн зэрэг шинэчлэгдэнэ.
//
// TODO: бодит payments хүснэгэлээс тухайн өмчлөгчийн "хэдэн сар хүртэл
// төлбөрөө барагдуулсан"-ыг унших ёстой. Одоохондоо backend байхгүй тул
// screenshot-той тохирсон ЖИШЭЭ утгуудаар (цэвэр гараар бичсэн,
// algorithmic биш) дуудагч тал (Owners.jsx) мөр бүрт эргэлдүүлж ашиглана.
const MONTHS_SHORT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const EXAMPLE_PAID_THROUGH = [8, 6, 7, 3];

export default function PaymentBadges({ paidThroughMonth }) {
  return (
    <div className="flex gap-[2px]">
      {MONTHS_SHORT.map((m) => {
        const paid = m <= paidThroughMonth;
        return (
          <span
            key={m}
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-semibold border ${
              paid
                ? 'bg-blue-500/[0.18] text-customBlue border-blue-500/30'
                : 'bg-red-500/[0.18] text-customRed border-red-500/30'
            }`}
          >
            {m}
          </span>
        );
      })}
    </div>
  );
}
