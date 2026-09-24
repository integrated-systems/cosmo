import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { buildPayerNameMap } from '../lib/stableTargetId';

// 2026-09-23 (81): "Хянах самбар" (Dashboard.jsx)-ын 6 санхүүгийн
// картыг (Энэ сарын орлого, Нийт өр авлага, Сарын орлого/зарлага,
// Төлбөрийн явц, Сүүлийн гүйлгээ, Төлбөрийн өртэй) НББ бүрэн
// ажиллагаатай болсонтой холбож, БҮГДИЙГ ЭНЭ НЭГ hook-оор тооцоолно.
// Дундын dataг (invoices, owners, clientele, unit_layouts, journal)
// НЭГ л удаа татаж, 6 гаралт руу задална — Rule of two/three, олон
// давхар давхардсан query-гээс зайлсхийв.

// useInvoicePayments.js-тэй ЯГ ИЖИЛ статус тооцооллын логик (Rule of
// two) — sent_at-аас хойш өнгөрсөн хоногоор paid/pending/overdue/
// at_risk гэж ангилна.
function computeInvoiceStatus(inv, overdueDays, atRiskDays) {
  if (inv.status === 'paid') return 'paid';
  const sentDate = inv.sent_at ? new Date(inv.sent_at) : (inv.created_at ? new Date(inv.created_at) : null);
  if (!sentDate) return 'overdue';
  const daysSince = Math.floor((Date.now() - sentDate.getTime()) / 86400000);
  if (daysSince > atRiskDays) return 'at_risk';
  if (daysSince > overdueDays) return 'overdue';
  return 'pending';
}

export function useDashboardFinance(hoaId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [
        { data: invoices },
        { data: owners },
        { data: clientele },
        { data: unitLayouts },
        { data: finSettings },
        { data: accounts },
        { data: lines },
      ] = await Promise.all([
        fetchAllRows(() => supabase.from('invoices').select('id, target_type, target_id, period_year, period_month, total_amount, status, sent_at, created_at').eq('tenant_id', hoaId)),
        fetchAllRows(() => supabase.from('owners').select('id, firstname, lastname, building_no, floor, door_no, has_grid_parking, grid_parkings, has_grid_storage, grid_storages').eq('tenant_id', hoaId)),
        fetchAllRows(() => supabase.from('clientele').select('id, legal_entity_name, has_grid_land, grid_land_plots, has_grid_parking, grid_parkings, has_grid_storage, grid_storages').eq('tenant_id', hoaId)),
        fetchAllRows(() => supabase.from('unit_layouts').select('id, building_no, floor, door_no').eq('tenant_id', hoaId)),
        supabase.from('fin_settings').select('overdue_days, at_risk_days').eq('tenant_id', hoaId).maybeSingle(),
        fetchAllRows(() => supabase.from('chart_of_accounts').select('code, category').eq('tenant_id', hoaId)),
        fetchAllRows(() => supabase.from('journal_entry_lines').select('*, journal_entries!inner(tenant_id, entry_date, source_type, source_ref, description)').eq('journal_entries.tenant_id', hoaId)),
      ]);
      if (cancelled) return;

      const overdueDays = finSettings?.overdue_days ?? 30;
      const atRiskDays = finSettings?.at_risk_days ?? 180;
      const payerNames = buildPayerNameMap(owners, clientele, unitLayouts);
      const unitIds = new Set((unitLayouts || []).map((u) => u.id));
      const invoiceById = new Map((invoices || []).map((i) => [i.id, i]));

      function bucketOf(inv) {
        if (inv.target_type === 'client') return 'client';
        return unitIds.has(inv.target_id) ? 'unit' : 'spot';
      }

      // ---- 1. Энэ сарын орлого: энэ сард илгээгдсэн invoice-уудаас
      // ямар хувь нь ямар дүнгээр аль хэдийн төлөгдсөнийг харуулна.
      const thisMonthInvoices = (invoices || []).filter((i) => i.period_year === year && i.period_month === month);
      const incomeByBucket = { unit: { paid: 0, count: 0, paidCount: 0 }, spot: { paid: 0, count: 0, paidCount: 0 }, client: { paid: 0, count: 0, paidCount: 0 } };
      thisMonthInvoices.forEach((inv) => {
        const b = bucketOf(inv);
        incomeByBucket[b].count += 1;
        if (inv.status === 'paid') {
          incomeByBucket[b].paidCount += 1;
          incomeByBucket[b].paid += Number(inv.total_amount || 0);
        }
      });
      const currentMonthIncome = {
        total: incomeByBucket.unit.paid + incomeByBucket.spot.paid + incomeByBucket.client.paid,
        unit: incomeByBucket.unit, spot: incomeByBucket.spot, client: incomeByBucket.client,
      };

      // ---- 2. Нийт өр авлага: бүх цагийн, төлөгдөөгүй invoice бүгд.
      const debtByBucket = { unit: { amount: 0, count: 0, total: 0 }, spot: { amount: 0, count: 0, total: 0 }, client: { amount: 0, count: 0, total: 0 } };
      (invoices || []).forEach((inv) => {
        const b = bucketOf(inv);
        debtByBucket[b].total += 1;
        if (inv.status !== 'paid') {
          debtByBucket[b].count += 1;
          debtByBucket[b].amount += Number(inv.total_amount || 0);
        }
      });
      const totalDebt = {
        total: debtByBucket.unit.amount + debtByBucket.spot.amount + debtByBucket.client.amount,
        unit: debtByBucket.unit, spot: debtByBucket.spot, client: debtByBucket.client,
      };

      // ---- 3. Орлого, зарлага (сараар): CASH-BASIS — өөрөөр хэлбэл
      // мөнгө БОДИТООР орж ирсэн/гарсан үеэр тооцоолно (2026-09-24
      // хэрэглэгчийн зөв ажигласнаар: category='income' шүүлт нь
      // ЗӨВХӨН нэхэмжлэх үүсгэх үеийн (accrual) хүлээн зөвшөөрөлтийг
      // барьдаг байсан — бодит мөнгө орж ирэхэд контра нь Авлага
      // байдаг тул ОГТ баригддаггүй байв). Одоо computeOfficialCashFlow
      // (Accounting.jsx)-тай ЯГ ИЖИЛ "шууд арга" (per-entry contra
      // attribution)-аар: тухайн бичилтийн Мөнгө мврийн цэвэр
      // eөрчлөлтийг эсрэг дансны ангиллаар (Авлага/Орлого →
      // "Орлого", Eглөг/Зардал → "Зарлага") жинлэж хуваарилна.
      // үндсэн хөрэнгө/Эздийн эрх (капитал/санхүүжилт) орохгүй.
      const accountByCode = {};
      (accounts || []).forEach((a) => { accountByCode[a.code] = a; });
      const monthlyIncome = Array(12).fill(0);
      const monthlyExpense = Array(12).fill(0);
      const linesByEntry = {};
      (lines || []).forEach((l) => {
        if (!l.entry_id) return;
        if (!linesByEntry[l.entry_id]) linesByEntry[l.entry_id] = [];
        linesByEntry[l.entry_id].push(l);
      });
      Object.values(linesByEntry).forEach((entryLines) => {
        const entryDate = entryLines[0]?.journal_entries?.entry_date;
        if (!entryDate) return;
        const d = new Date(entryDate);
        if (d.getFullYear() !== year) return;
        const mIdx = d.getMonth();

        const cashLines = entryLines.filter((l) => accountByCode[l.account_code]?.category === 'cash');
        const nonCashLines = entryLines.filter((l) => accountByCode[l.account_code]?.category !== 'cash');
        if (cashLines.length === 0) return;
        const cashNet = cashLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
        const contraTotal = nonCashLines.reduce((s, l) => s + Number(l.debit) + Number(l.credit), 0);
        if (contraTotal === 0) return;

        nonCashLines.forEach((l) => {
          const cat = accountByCode[l.account_code]?.category;
          if (cat !== 'receivable' && cat !== 'income' && cat !== 'payable' && cat !== 'expense') return;
          const weight = (Number(l.debit) + Number(l.credit)) / contraTotal;
          const share = cashNet * weight;
          if (cat === 'receivable' || cat === 'income') monthlyIncome[mIdx] += share;
          else monthlyExpense[mIdx] += -share;
        });
      });

      // ---- 4. Төлбөрийн явц: энэ сарын paid/pending/overdue/at_risk.
      let paidCount = 0, pendingCount = 0, overdueCount = 0, atRiskCount = 0;
      thisMonthInvoices.forEach((inv) => {
        const st = computeInvoiceStatus(inv, overdueDays, atRiskDays);
        if (st === 'paid') paidCount++;
        else if (st === 'pending') pendingCount++;
        else if (st === 'overdue') overdueCount++;
        else if (st === 'at_risk') atRiskCount++;
      });
      const totalPayers = thisMonthInvoices.length;
      const thisMonthTotalAmount = thisMonthInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
      const thisMonthPaidAmount = thisMonthInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0);
      const paymentProgress = {
        totalPayers, paidCount, pendingCount, overdueCount, atRiskCount,
        progressPct: totalPayers > 0 ? Math.round((paidCount / totalPayers) * 100) : 0,
        debtRatioPct: thisMonthTotalAmount > 0 ? Math.round(((thisMonthTotalAmount - thisMonthPaidAmount) / thisMonthTotalAmount) * 100) : 0,
      };

      // ---- 5. Сүүлийн гүйлгээ: сүүлийн 8 төлбөр хүлээн авалт
      // (source_ref-ээр invoice, түүгээр өмчлөгчийн нэр рүү буцаана).
      const paymentLines = (lines || []).filter((l) => l.journal_entries?.source_type === 'invoice_payment' && accountByCode[l.account_code]?.category === 'cash' && Number(l.debit) > 0);
      const recentTransactions = paymentLines
        .sort((a, b) => new Date(b.journal_entries.entry_date) - new Date(a.journal_entries.entry_date))
        .slice(0, 8)
        .map((l) => {
          const entry = l.journal_entries;
          const firstInvoiceId = entry.source_ref ? entry.source_ref.split(',')[0] : null;
          const inv = firstInvoiceId ? invoiceById.get(firstInvoiceId) : null;
          const payer = inv ? payerNames.get(inv.target_id) : null;
          return {
            id: l.id,
            amount: Number(l.debit),
            date: entry.entry_date,
            name: payer?.name || entry.description,
            sub: payer?.sub || '',
          };
        });

      // ---- 6. Төлбөрийн өртэй: төлөгдөөгүй invoice-үүдийг өмчлөгчийн
      // нэртэй болгоно. Эрэмблэлт (дүнгээр/сараар)-ийг Dashboard.jsx
      // дээр dropdown-оор сонгодог тул энд БҮХ жагсаалтыг (хайчлахгүй)
      // буцаана.
      const topDebtors = (invoices || [])
        .filter((inv) => inv.status !== 'paid')
        .map((inv) => {
          const payer = payerNames.get(inv.target_id) || { name: 'Тодорхойгүй', sub: '' };
          const status = computeInvoiceStatus(inv, overdueDays, atRiskDays);
          const sentDate = inv.sent_at ? new Date(inv.sent_at) : (inv.created_at ? new Date(inv.created_at) : null);
          const monthsOverdue = sentDate ? Math.max(1, Math.round((Date.now() - sentDate.getTime()) / (30 * 86400000))) : 1;
          return { ...payer, amount: Number(inv.total_amount || 0), status, monthsOverdue };
        });

      setData({ currentMonthIncome, totalDebt, monthlyIncome, monthlyExpense, paymentProgress, recentTransactions, topDebtors });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hoaId]);

  return { data, loading };
}
