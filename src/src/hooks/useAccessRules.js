import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

// "Хандах эрхийн тохиргоо" (/rolesrules) хуудасны матрицыг (access_rules)
// бодитоор hэрэгжүүлдэг (enforcement) hook — 2026-08-19 хэрэглэгч
// тодорхой заасны дагуу.
// 2026-08-19 (2-р засвар): "owner" (Сууц вмчлвгч, резидент апп) ролийг
// нэмэв — гэхдээ staff роль (board/supervisory_board/executive_director/
// accountant/manager)-аас үл ялгаатай, ЭСРЭГ анхдагчтай: staff роль
// тохиргоогүй үед бүгд НЭЭЛТТЭЙ (Устгахаас бусад), owner тохиргоогүй үед
// бүгд ХААЛТТАЙ (SISADMIN тодорхой Харах=Тийм гэж зөвшөөрсний л дараа
// нэвтэрнэ) — резидент апп-ийн үзүүлэх мэдээллийн эрсдэл үүнээс
// үлэмж үндүр тул зөвшөөргөлт үнэн хэрэгтээ opt-in байх ёстой.
const MATRIX_ROLES = ['board', 'supervisory_board', 'executive_director', 'accountant', 'manager', 'owner'];

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

      const matrixRole = myRoles.find((r) => MATRIX_ROLES.includes(r));
      setMyRole(matrixRole || null);
      if (!matrixRole) { setLoading(false); return; }

      supabase.from('access_rules').select('page_key,action,allowed').eq('tenant_id', hoaId).eq('role', matrixRole).then(({ data: ruleRows }) => {
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
  // ашиглана — staff роль: Устгах=үгүй, бусад бүгд=тийм (ажлын урсгал
  // тасрахгүй байлгах зорилгоор). "owner" роль: БүГД=үгүй (тодорхой
  // зөвшөөрсөн үед л).
  function can(pageKey, action) {
    if (bypass) return true;
    if (!myRole) return true;
    if (!rules) return true;
    const pageRules = rules[pageKey];
    if (!pageRules || !(action in pageRules)) return myRole === 'owner' ? false : action !== 'delete';
    return pageRules[action];
  }

  return { can, loading, bypass, myRole };
}
