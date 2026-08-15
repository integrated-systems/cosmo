import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// App-ийн бүх хэсэгт auth session+role мэдээллийг дамжуулах Context.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined=ачаалж байна, null=нэвтрээгүй
  const [roles, setRoles] = useState([]);
  const [tenantIds, setTenantIds] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // 2026-08-15: onboarding (шинэ tenant үүсгэсний дараа) session солигдохгүй
  // ч role-ыг шинэчлэх шаардлагатай тул fetch-ийг тусад нь функц болгож,
  // `refreshRoles()`-оор гадна дуудагддаг болгов.
  const fetchRoles = useCallback((userId) => {
    if (!userId) {
      setRoles([]);
      setTenantIds([]);
      return;
    }
    setRolesLoading(true);
    return supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          console.error('user_roles татахад алдаа гарлаа:', error.message);
          setRoles([]);
          setTenantIds([]);
        } else {
          setRoles((data ?? []).map((r) => r.role));
          setTenantIds((data ?? []).map((r) => r.tenant_id).filter(Boolean));
        }
        setRolesLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRoles(session?.user?.id);
  }, [session?.user?.id, fetchRoles]);

  const value = {
    session,
    user: session?.user ?? null,
    loading: session === undefined || rolesLoading,
    roles,
    tenantIds,
    isSuperSysAdmin: roles.includes('supersysadmin'),
    signOut: () => supabase.auth.signOut(),
    refreshRoles: () => fetchRoles(session?.user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() нь <AuthProvider> дотор л дуудагдана');
  return ctx;
}
