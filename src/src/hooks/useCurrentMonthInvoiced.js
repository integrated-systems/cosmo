import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-09-13: "Хянах самбар"-ын "Энэ сард нэхэмжилсэн" картны placeholder
// (14,385,000₮ гэсэн статик тоо) -ыг бодит invoices хүснэгэлээс уншиж
// динамик болгов. Тухайн сард (одоогийн он/сар) илгээгдсэн (status
// үл харгалзан, зөвхөн сар/жилээр шүүнэ) бүх invoices-ийн нийлбэрийг
// 3 бүлэгт (Сууц өмчлөгч / Зогсоол-агуулах дангаар өмчлөгч / Талбай
// өмчлөгч) задалж үзүүлнэ.
//
// Бүлэглэлт: target_type='owner' үед target_id нь unit_layouts.id
// (тогтвортой нэгж)-тэй тохирвол "Сууц өмчлөгч", үгүй бол (грид
// зогсоол/агуулахын UUID эсвэл owner.id fallback) "Зогсоол, агуулах
// дангаар өмчлөгч". target_type='client' үед "Талбай өмчлөгч".
export function useCurrentMonthInvoiced(hoaId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [{ data: invoices }, { data: unitLayouts }] = await Promise.all([
        fetchAllRows(() => supabase.from('invoices').select('target_type, target_id, total_amount').eq('tenant_id', hoaId).eq('period_year', year).eq('period_month', month)),
        fetchAllRows(() => supabase.from('unit_layouts').select('id').eq('tenant_id', hoaId)),
      ]);
      if (cancelled) return;

      const unitIds = new Set((unitLayouts || []).map((u) => u.id));
      let unitTotal = 0, spotOnlyTotal = 0, clientTotal = 0;
      (invoices || []).forEach((inv) => {
        const amount = Number(inv.total_amount || 0);
        if (inv.target_type === 'client') clientTotal += amount;
        else if (unitIds.has(inv.target_id)) unitTotal += amount;
        else spotOnlyTotal += amount;
      });

      setStats({ total: unitTotal + spotOnlyTotal + clientTotal, unitTotal, spotOnlyTotal, clientTotal });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hoaId]);

  return { stats, loading };
}
