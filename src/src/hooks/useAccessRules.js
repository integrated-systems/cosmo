import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

// "Хандах эрхийн тохиргоо" (/rolesrules) хуудасны матрицыг (access_rules)
// бодитоор хэрэгжүүлдэг (enforcement) hook — 2026-08-19 хэрэглэгч
// тодорхой заасны дагуу.
// 2026-08-19 (2-р засвар): "owner" (Сууц өмчлөгч, резидент апп) ролийг
// нэмэв — гэхдээ staff роль (board/supervisory_board/executive_director/
// accountant/manager)-аас үл ялгаатай, ЭСРЭГ анхдагчтай: staff роль
// тохиргоогүй үед бүгд НЭЭЛТТЭЙ (Устгахаас бусад), owner тохиргоогүй үед
// бүгд ХААЛТТАЙ (SISADMIN тодорхой Харах=Тийм гэж зөвшөөрснийн л дараа
// нэвтэрнэ) — резидент апп-ийн үзүүлэх мэдээллийн эрсдэл үүнээс
// үлэмж вндвр тул зөвшөөргвлт үнэн хэрэгтээ opt-in байх ёстой.
//
// 2026-08-28: ГүЙЦЭТГЭЛИЙН ЗАСВАР — үмнв нь ХОС дараалсан (waterfall)
// Supabase дуудлага (эхлээд user_roles, ДАРАА нь access_rules) хийдэг
// байсан тул OwnerApp удаан ачаалагдах шалтгааны нэг байв. Одоо
// get_my_matrix_access() ЦОРЫН ГАНЦ RPC дуудлагаар хоёуланг нь
// НЭГ round-trip-д багтаана.
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

    supabase.rpc('get_my_matrix_access', { p_tenant_id: hoaId }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) { setLoading(false); return; }
      setBypass(!!data.bypass);
      setMyRole(data.my_role || null);
      setRules(data.rules || {});
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [hoaId, user, isSuperSysAdmin]);

  // Хүснэгэлт бичлэг байхгүй үед AccessRules.jsx-тэй ЯГ ИЖИЛ анхдагч
  // ашиглана — staff роль: Устгах=үгүй, бусад бүгд=тийм (ажлын урсгал
  // тасрахгүй байлгах зорилгоор). "owner" роль: БүГД=үгүй (тодорхой
  // зөвшөөрсэн үед л).
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
