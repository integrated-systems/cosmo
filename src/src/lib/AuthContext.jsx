import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// Аpp-ийн бүх хэсэгт auth session+role мэдээллийг дамжуулах Context.
// TODO: Supabase холбогдоход App.jsx-ийн local isLoggedIn state-ийг эндээс
// ирэх session-ээр сольсон (2026-08-15).
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

  useEffect(() => {
    if (!session?.user) {
      setRoles([]);
      setTenantIds([]);
      return;
    }
    setRolesLoading(true);
    supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', session.user.id)
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
  }, [session?.user?.id]);

  const value = {
    session,
    user: session?.user ?? null,
    loading: session === undefined || rolesLoading,
    roles,
    tenantIds,
    isSuperSysAdmin: roles.includes('supersysadmin'),
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() нь <AuthProvider> дотор л дуудагдана');
  return ctx;
}
