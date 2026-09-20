import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-09-13: Сууц өмчлөгч (Owners.jsx), Талбай өмчлөгч (Clientele.jsx),
// Тоот, Зогсоол, Агуулах (Property.jsx)-ийн "Тоот" таб — 3 хуудас
// ХОЁРДОГЧ (Rule of two) энэ НЭГ hook-ыг ашиглаж, invoices хүснэгэлээс
// бодит төлбөрийн түүхийг уншина. PaymentBadges.jsx/UnitGridCard.jsx
// eeрсдee backend/schema-г мэдэхгүй, зөвхөн эндээс тооцоолсон энгийн
// утгыг л хүлээж авна.
//
// 2026-09-20 БОДИТ АЛДАА ЗАСАВ — хэрэглэгчийн олсон цоорхой: "Санхүү
// тохиргоо > НББ > Төлбөрийн хоцрогдол"-д тохируулдаг overdue_days/
// at_risk_days (анхдагч 30/180 хоног) НЭГ Ч файлд уншигддаггүй байсан
// тул, индикаторууд зөвхөн 2 төлөвтэй (paid/overdue) байж, ХУГАЦААНЫ
// НАСЖИЛТ огт тооцоологддоггүй байв (1 хоног хоцорсон ч, 300 хоног
// хоцорсон ч ЯГ ИЖИЛ). Одоо fin_settings-ийг УНШИЖ, invoices.sent_at-
// аас хойш хэдэн хоног eнгөрснийг тооцоолж, 4 төлөвт (paid/pending/
// overdue/at_risk) болгов. eнгийг ч мөн fin_settings-ээс уншина.
export function useInvoicePayments(hoaId, targetType) {
  const [invoices, setInvoices] = useState([]);
  const [finSettings, setFinSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchAllRows(() => supabase.from('invoices').select('target_id, period_year, period_month, status, sent_at, created_at').eq('tenant_id', hoaId).eq('target_type', targetType)),
      supabase.from('fin_settings').select('overdue_days, at_risk_days, overdue_color, at_risk_color').eq('tenant_id', hoaId).maybeSingle(),
    ]).then(([{ data: invRows }, { data: settingsRow }]) => {
      if (cancelled) return;
      setInvoices(invRows || []);
      setFinSettings(settingsRow || null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hoaId, targetType]);

  const overdueDays = finSettings?.overdue_days ?? 30;
  const atRiskDays = finSettings?.at_risk_days ?? 180;
  const overdueColor = finSettings?.overdue_color || 'customYellow';
  const atRiskColor = finSettings?.at_risk_color || 'customRed';

  // 2026-09-13: Он шүүх dropdown-д зориулав — тухайн tenant-ийн энэ
  // targetType-ийн хамгийн эртний нэхэмжлэхийн он. Invoice огт байхгүй
  // бол одоогийн оноос эхэлнэ гэж үзнэ (хатуу кодолсон 2022-2027 гэсэн
  // dataтай холбоогүй хүрээг арилгав).
  const now = new Date();
  const earliestYear = invoices.length > 0 ? Math.min(...invoices.map((i) => i.period_year)) : now.getFullYear();

  // Тухайн НЭГ invoices мөрийн төлөв (paid/pending/overdue/at_risk)-ийг
  // sent_at (эсвэл created_at)-аас хойш eнгөрсөн хоногоор тооцоолно.
  function computeInvoiceStatus(inv) {
    if (inv.status === 'paid') return 'paid';
    const sentDate = inv.sent_at ? new Date(inv.sent_at) : (inv.created_at ? new Date(inv.created_at) : null);
    if (!sentDate) return 'overdue';
    const daysSince = Math.floor((Date.now() - sentDate.getTime()) / 86400000);
    if (daysSince > atRiskDays) return 'at_risk';
    if (daysSince > overdueDays) return 'overdue';
    return 'pending';
  }

  // PaymentBadges.jsx-д зориулав — сонгосон YEAR-ийн хүрээнд тухайн
  // target (owner/client)-ийн 12 сарын тус бүрийн төлөв (monthStatuses).
  function getYearSummary(targetId, year) {
    const rows = invoices.filter((i) => i.target_id === targetId);
    const monthStatuses = Array.from({ length: 12 }, () => 'none');
    if (rows.length === 0) return { monthStatuses };
    const firstPeriodKey = Math.min(...rows.map((r) => r.period_year * 12 + r.period_month));
    for (let m = 1; m <= 12; m++) {
      if (year * 12 + m < firstPeriodKey) continue;
      const inv = rows.find((r) => r.period_year === year && r.period_month === m);
      monthStatuses[m - 1] = inv ? computeInvoiceStatus(inv) : 'overdue';
    }
    return { monthStatuses };
  }

  // UnitGridCard.jsx (Тоот таб)-д зориулав — тодорхой нэг (year, month)
  // үеийн ганц төлөв: 'paid' | 'pending' | 'overdue' | 'at_risk' | 'none'
  // (эхний нэхэмжлэхээс eмнe буюу нэхэмжлэгдэж үзээгүй).
  function getMonthStatus(targetId, year, month) {
    const rows = invoices.filter((i) => i.target_id === targetId);
    if (rows.length === 0) return 'none';
    const firstPeriodKey = Math.min(...rows.map((r) => r.period_year * 12 + r.period_month));
    if (year * 12 + month < firstPeriodKey) return 'none';
    const inv = rows.find((r) => r.period_year === year && r.period_month === month);
    if (!inv) return 'overdue';
    return computeInvoiceStatus(inv);
  }

  return { loading, earliestYear, getYearSummary, getMonthStatus, overdueColor, atRiskColor };
}
