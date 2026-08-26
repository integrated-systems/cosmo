import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { DEFAULT_TENANT_ID } from '../config/tenant';

// 2026-08-19: Layout.jsx (admin) БОЛОН UserApp.jsx (резидент) хоёулаа
// хуваалцдаг tenant-ийн ерөнхий шалгалт — "Хүлээн зөвшөөрсвн"
// (approval_status) болон хэрэглэгчийн "Идэвхгүй" (tenant_users.status)
// эсэхийг шалгана. Ирээдүйд UserApp.jsx-ийг бүрэн тусдаа project
// болгож "гарган авах" үед энэ hook-ыг ч хамт амархан зввж авч болно.
export function useTenantGate() {
  const { isSuperSysAdmin, user } = useAuth();
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [isDeactivated, setIsDeactivated] = useState(false);

  useEffect(() => {
    if (isSuperSysAdmin || !hoaId) { setApprovalStatus('ok'); return; }
    let cancelled = false;
    supabase.from('tenants').select('approval_status').eq('id', hoaId).single().then(({ data }) => {
      if (!cancelled) setApprovalStatus(data?.approval_status || 'ok');
    });
    return () => { cancelled = true; };
  }, [hoaId, isSuperSysAdmin]);

  useEffect(() => {
    if (isSuperSysAdmin || !hoaId || !user) { setIsDeactivated(false); return; }
    let cancelled = false;
    supabase.from('tenant_users').select('status').eq('user_id', user.id).eq('tenant_id', hoaId).then(({ data }) => {
      if (cancelled) return;
      const rows = data ?? [];
      setIsDeactivated(rows.length > 0 && rows.every((r) => r.status === 'inactive'));
    });
    return () => { cancelled = true; };
  }, [hoaId, isSuperSysAdmin, user]);

  return {
    approvalStatus,
    isPending: approvalStatus === 'pending',
    isRejected: approvalStatus === 'rejected',
    isDeactivated,
  };
}
