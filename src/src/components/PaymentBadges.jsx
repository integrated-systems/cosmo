// Сар бүрийн төлбөрийн дугаартай badge мөр (12 сар) — дугуй цэг БИШ, тоо
// бүхий дөрвөлжин (rounded — 4px). 2026-09-13 хэрэглэгчийн заасны дагуу
// 3 төлөвт болгов: ТӨЛСӨН (цэнхэр), ТӨЛӨӨГҮЙ/хугацаа хэтэрсэн (улаан),
// АНХДАГЧ (ирээдүйн сар БОЛОН эхний нэхэмжлэх илгээгдэхээс өмнөх сар —
// хүснэгэлийн баганын текстийн өнгөтэй ижил, тодруулгагүй). Owners.jsx/
// ClienteleTable.jsx хүснэгэлд мөр бүрд (хэдэн зуун удаа) ашиглагддаг
// тул НЭГ газар засварлавал хаа сайгүй нэгэн зэрэг шинэчлэгдэнэ.
//
// 2026-09-13 (2-р шинэчлэл): өнгөний динамик өөрчлөлтийн ЭХЛЭЛ ЦЭГ нь
// "эхний төлбөр төлсөн" биш, харин "эхний НЭХЭМЖЛЭХ илгээгдсэн" мөч
// байх ёстой гэдгийг тодорхойлов — учир нь СӨХ үйлчилгээ үзүүлж эхэлсэн
// (нэхэмжлэгдсэн) мөчөөс нь үүрэг үүсдэг, төлбөр бол зөвхөн үүнд хариу
// үйлдэл. Хэрэв "эхний төлбөрөөр" эхэлбэл, ер нь нэг ч удаа төлөөгүй
// (хамгийн муу тохиолдол) өмчлөгчид "эхний төлбөр" гэж үзэх огноо огт
// үүсэхгүй тул тэдний бүх сар үүрд буруу "анхдагч" харагдах алдаа
// гарна — яг улаан өнгө хамгийн их хэрэгтэй тохиолдол дээр л систем
// харалтгүй болно.
//
// TODO: бодит invoices/payments хүснэгэлээс тухайн өмчлөгчийн "хэдэн
// сар хүртэл төлбөрөө барагдуулсан" (paidThroughMonth) БОЛОН "эхний
// нэхэмжлэх хэзээ илгээгдсэн" (firstInvoiceMonth) хоёрыг унших ёстой.
// Одоохондоо backend байхгүй тул хоосон (firstInvoiceMonth: null)
// жишээ утгаар дуудагч тал (Owners.jsx, ClienteleTable.jsx) мөр бүрт
// ашиглана.
const MONTHS_SHORT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// {firstInvoiceMonth, paidThroughMonth} — firstInvoiceMonth=null үед
// тухайн өмчлөгчид хараахан НЭХЭМЖЛЭХ илгээгдээгүй тул БҮХ сар анхдагч
// өнгөтэй.
export const EXAMPLE_PAYMENT_ROWS = [
  { firstInvoiceMonth: null, paidThroughMonth: 0 },
];

export default function PaymentBadges({ firstInvoiceMonth, paidThroughMonth, currentMonth }) {
  const cm = currentMonth ?? (new Date().getMonth() + 1);
  return (
    <div className="flex gap-[2px]">
      {MONTHS_SHORT.map((m) => {
        // Эхний нэхэмжлэх илгээгдээгүй, эсвэл тухайн сар эхний
        // нэхэмжлэхээс өмнө, эсвэл тухайн сар хараахан төлөх хугацаа
        // болоогүй (ирээдүй) бол АНХДАГЧ өнгө.
        const isTrackable = firstInvoiceMonth != null && m >= firstInvoiceMonth && m <= cm;
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
