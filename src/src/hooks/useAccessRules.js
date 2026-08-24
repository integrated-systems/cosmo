import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

// "Хандах эрхийн тохиргоо" (/rolesrules) хуудасны матрицыг (access_rules)
// бодитоор хэрэгжүүлдэг (enforcement) hook — 2026-08-19 хэрэглэгч
// тодорхой заасны дагуу. tenant_admin/supersysadmin ("God") үүнийг
// бүрэн тойрч үргэлж үнэн (true) буцаана. 5 үндсэн ролийн (board/
// supervisory_board/executive_director/accountant/manager) хүнд л
// матриц хэрэгждэг — owner г.м бусад роль хараахан энэ систем рүү
// орохгүй тул хязгаарлагдахгүй.
const STAFF_ROLES = ['board', 'supervisory_board', 'executive_director', 'accountant', 'manager'];

export function useAccessRules(hoaId) {
  const { user, isSuperSysAdmin } = useAuth();
  const [rules, setRules] = useState(null); // { pageKey: { action: allowed } }
  const [myRole, setMyRole] = useState(null);
  const [bypass, setBypass] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId || !user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('tenant_id', hoaId).then(({ data }) => {
      if (cancelled) return;
      const myRoles = (data ?? []).map((r) => r.role);

      if (isSuperSysAdmin || myRoles.includes('tenant_admin')) {
        setBypass(true);
        setLoading(false);
        return;
      }

      const staffRole = myRoles.find((r) => STAFF_ROLES.includes(r));
      setMyRole(staffRole || null);
      if (!staffRole) { setLoading(false); return; }

      supabase.from('access_rules').select('page_key,action,allowed').eq('tenant_id', hoaId).eq('role', staffRole).then(({ data: ruleRows }) => {
        if (cancelled) return;
        const map = {};
        (ruleRows ?? []).forEach((r) => {
          map[r.page_key] = map[r.page_key] || {};
          map[r.page_key][r.action] = r.allowed;
        });
        setRules(map);
        setLoading(false);
      });
    });

    return () => { cancelled = true; };
  }, [hoaId, user, isSuperSysAdmin]);

  // Хүснэгэлт бичлэг байхгүй үед AccessRules.jsx-тэй ЯГ ИЖИЛ анхдагч
  // (Устгах=үгүй, бусад бүгд=тийм) ашиглана — тохиргоо хараахан хийгдээгүй
  // үед ажлын урсгал тасрахгүй байлгах зорилгоор.
  function can(pageKey, action) {
    if (bypass) return true;
    if (!myRole) return true;
    if (!rules) return true;
    const pageRules = rules[pageKey];
    if (!pageRules || !(action in pageRules)) return action !== 'delete';
    return pageRules[action];
  }

  return { can, loading, bypass, myRole };
}
