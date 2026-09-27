import { customColorHex } from '../lib/customColors';

// 2026-09-26 (91): "Тоот" БОЛОН "Зогсоол, Агуулах, Талбай" таб хоёулаа
// адил төлбөрийн төлөвийн (paid/pending/overdue/at_risk) өнгөний
// легенд харуулах шаардлагатай болсон тул НЭГ дундын компонент
// болгов (Rule of two/three) — Санхүү тохиргоо > НББ > Төлбөрийн
// хоцрогдол-оос тохируулсан өнгийг динамикаар дуудна.
export default function PaymentStatusLegend({ paidColor, pendingColor, overdueColor, atRiskColor }) {
  const items = [
    { label: 'Хугацаандаа төлөлттэй', color: paidColor },
    { label: 'Төлбөрийн хүлээлттэй', color: pendingColor },
    { label: 'Хугацаа хэтэрсэн', color: overdueColor },
    { label: 'Төлбөрийн эрсдэлтэй', color: atRiskColor },
  ];
  return (
    <>
      {items.map((it, i) => {
        const hex = it.color && it.color !== 'default' ? customColorHex(it.color) : null;
        return (
          <span key={i} className="whitespace-nowrap">
            {i > 0 ? ', ' : ' '}
            <span
              className="inline-block rounded-full mr-1"
              style={{ width: 8, height: 8, background: hex || 'transparent', border: hex ? 'none' : '1px dashed currentColor' }}
            />
            {it.label}
          </span>
        );
      })}
    </>
  );
}
