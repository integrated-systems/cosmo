import { useAuth } from '../lib/AuthContext';

// 2026-08-15: Supabase auth холбогдсоны дараа AuthContext-ээс бодит
// role-г уншдаг боллоо (өмнө hardcode 'supersysadmin' байсан).
export function useRole() {
  const { roles, isSuperSysAdmin } = useAuth();
  return { role: isSuperSysAdmin ? 'supersysadmin' : roles[0], roles };
}
