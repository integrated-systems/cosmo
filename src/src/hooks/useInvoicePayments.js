import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-09-13: Сууц өмчлөгч (Owners.jsx), Талбай өмчлөгч (Clientele.jsx),
// Тоот, Зогсоол, Агуулах (Property.jsx)-ийн "Тоот" таб — 3 хуудас
// ХОЁРДОГЧ (Rule of two) энэ НЭГ hook-ыг ашиглаж, invoices хүснэгэлээс
// бодит төлбөрийн түүхийг уншина. PaymentBadges.jsx/UnitGridCard.jsx
// өөрсдөө backend/schema-г мэдэхгүй, зөвхөн эндээс тооцоолсон энгийн
// утгыг (firstInvoiceMonth/paidThroughMonth эсвэл нэг төлөв) хүлээж авна.
export function useInvoicePayments(hoaId, targetType) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchAllRows(() => supabase.from('invoices').select('target_id, period_year, period_month, status').eq('tenant_id', hoaId).eq('target_type', targetType)).then(({ data }) => {
      if (cancelled) return;
      setInvoices(data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hoaId, targetType]);

  // 2026-09-13: Он шүүх dropdown-д зориулав — тухайн tenant-ийн энэ
  // targetType-ийн хамгийн эртний нэхэмжлэхийн он. Invoice огт байхгүй
  // бол одоогийн оноос эхэлнэ гэж үзнэ (хатуу кодолсон 2022-2027 гэсэн
  // dataтай холбоогүй хүрээг арилгав).
  const now = new Date();
  const earliestYear = invoices.length > 0 ? Math.min(...invoices.map((i) => i.period_year)) : now.getFullYear();

  // PaymentBadges.jsx-д зориулав — сонгосон YEAR-ийн хүрээнд тухайн
  // target (owner/client)-ийн {firstInvoiceMonth, paidThroughMonth}.
  // Хэрэв эхний нэхэмжлэх өмнөх жилүүдээс эхэлсэн бол тухайн жилийн
  // 1-р сараас эхлэн хянагдана гэж үзнэ.
  function getYearSummary(targetId, year) {
    const rows = invoices.filter((i) => i.target_id === targetId);
    if (rows.length === 0) return { firstInvoiceMonth: null, paidThroughMonth: 0 };
    const firstPeriodKey = Math.min(...rows.map((r) => r.period_year * 12 + r.period_month));
    const yearEndKey = year * 12 + 12;
    if (firstPeriodKey > yearEndKey) return { firstInvoiceMonth: null, paidThroughMonth: 0 };
    const firstYear = Math.floor((firstPeriodKey - 1) / 12);
    const firstMonthOfThatYear = firstPeriodKey - firstYear * 12;
    const firstInvoiceMonth = firstYear >= year ? firstMonthOfThatYear : 1;
    // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — цикл үргэлж 1-р сараас эхэлдэг
    // байсан тул, эхний нэхэмжлэх (жиш) 3-р сараас эхэлсэн бол, 1-2
    // сард invoice үгүй тул шууд m=1 дээр "break" хийж paidThroughMonth
    // үргэлж 0 гарч байсныг олов. Циклийг firstInvoiceMonth-оос эхлүүлж
    // засав.
    let paidThroughMonth = 0;
    for (let m = firstInvoiceMonth; m <= 12; m++) {
      const inv = rows.find((r) => r.period_year === year && r.period_month === m);
      if (inv && inv.status === 'paid') paidThroughMonth = m;
      else break;
    }
    return { firstInvoiceMonth, paidThroughMonth };
  }

  // UnitGridCard.jsx (Тоот таб)-д зориулав — тодорхой нэг (year, month)
  // үеийн ганц төлөв: 'paid' | 'overdue' | 'none' (эхний нэхэмжлэхээс
  // eмнe буюу нэхэмжлэгдэж үзээгүй).
  function getMonthStatus(targetId, year, month) {
    const rows = invoices.filter((i) => i.target_id === targetId);
    if (rows.length === 0) return 'none';
    const firstPeriodKey = Math.min(...rows.map((r) => r.period_year * 12 + r.period_month));
    if (year * 12 + month < firstPeriodKey) return 'none';
    const inv = rows.find((r) => r.period_year === year && r.period_month === month);
    if (!inv) return 'overdue';
    return inv.status === 'paid' ? 'paid' : 'overdue';
  }

  return { loading, earliestYear, getYearSummary, getMonthStatus };
}
