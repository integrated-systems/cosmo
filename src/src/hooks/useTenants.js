import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// 2026-08-15: HoaSwitcher-ийн EXAMPLE_HOAS (hoa1-hoa10 хуурамч жагсаалт)-ыг
// бодит "tenants" хүснэгдээс уншсан жагсаалтаар сольсон. RLS-ийн ачаар
// supersysadmin бүх tenant-ыг, ердийн хэрэглэгч зөвхөн өөрийн харьяалагддаг
// tenant(с)-аа л харна — тусад нь role шалгах шаардлагагүй.
export function useTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('tenants')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) console.error('tenants татахад алдаа гарлаа:', error.message);
        setTenants(data ?? []);
        setLoading(false);
      });
  }, []);

  return { tenants, loading };
}
