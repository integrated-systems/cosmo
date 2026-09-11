import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';

// 2026-09-09: Дансны төлөвлөгөө — payroll_tax_settings/
// payroll_addition_settings-ийн "Суурь данс"/"Зарлагын данс"
// dropdown-д, мөн ирээдүйн Нягтлан бодох бүртгэлийн бусад хэсэгт
// (журналын бичилт г.м.) дахин ашиглах зорилготой (Rule of two).
const CATEGORY_LABELS = {
  cash: 'Мөнгөн хөрөнгө',
  short_term_investment: 'Богино хугацаат хөрөнгө оруулалт',
  receivable: 'Авлагын данс',
  inventory: 'Бараа материал',
  prepaid_expense: 'Урьдчилж төлсөн зардал',
  fixed_asset: 'Үндсэн хөрөнгө',
  payable: 'өглөг',
  equity: 'Эздийн эрх',
  income: 'Орлого',
  expense: 'Зардал',
};

export function useChartOfAccounts(hoaId) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    setLoading(true);
    fetchAllRows(() => supabase.from('chart_of_accounts').select('*').eq('tenant_id', hoaId).eq('is_active', true).order('sort_order')).then(({ data }) => {
      if (cancelled) return;
      setAccounts(data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [hoaId]);

  const accountLabel = (code) => {
    const acc = accounts.find((a) => a.code === code);
    return acc ? `${acc.code} — ${acc.name}` : code;
  };

  return { accounts, loading, accountLabel, categoryLabels: CATEGORY_LABELS };
}
