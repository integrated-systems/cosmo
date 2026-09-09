import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Багц сонголтын 5 газар (Бүртгэл үүсгэх, Tenant Status, Топбарын
// "Багц ахиулах", EditTenantModal, Billing) — бүгд ЭНЭ hook-оор
// дамжуулан package_prices-аас (ЦОРЫН ГАНЦ эх сурвалж) уншина.
// "Trial" бол бодит үнэтэй багц БИШ (package_prices-д огт байхгүй)
// тул кодон дээр тусад нь нэмнэ. PLAN_ORDER — trial үүрд эхэнд,
// үлдсэнийг үнийн дарааллаар (basic < standard < premium < plus).
const PLAN_ORDER = ['basic', 'standard', 'premium', 'premium_plus'];

export function usePlans() {
  const [plans, setPlans] = useState([{ key: 'trial', label: 'Trial', price_per_unit: 0 }]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from('package_prices').select('*').then(({ data }) => {
      if (!mounted) return;
      const paidPlans = (data || [])
        .slice()
        .sort((a, b) => PLAN_ORDER.indexOf(a.plan_key) - PLAN_ORDER.indexOf(b.plan_key))
        .map((p) => ({ key: p.plan_key, label: p.label, price_per_unit: Number(p.price_per_unit) || 0 }));
      setPlans([{ key: 'trial', label: 'Trial', price_per_unit: 0 }, ...paidPlans]);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return { plans, loading };
}
