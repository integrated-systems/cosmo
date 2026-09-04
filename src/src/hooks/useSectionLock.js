import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

// 2026-09-04 (12): ЕрӨӨнхий, дахин ашиглагдах "section lock" hook.
// Ямар ч тохиргооны хуудасны таб дээр ашиглахад:
//   const { state, canEdit, setLockState } = useSectionLock(hoaId, 'addressing_grid');
// Бодит хамгаалалт RLS (can_edit_section() SQL функц) дээр байгаа тул,
// энэ hook зөвхөн UX-ийн хурд/тод байдлыг л хангана (товч disabled/
// hidden болгох) - RLS-ийг орлохгүй.
export function useSectionLock(tenantId, sectionKey) {
  const { isSuperSysAdmin, user } = useAuth();
  const [lock, setLock] = useState(null); // { state, delegated_to, locked_by, locked_at } | null (лоцгүй = нээлттэй)
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!tenantId || !sectionKey) return;
    setLoading(true);
    const { data } = await supabase
      .from('tenant_locked_sections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('section_key', sectionKey)
      .maybeSingle();
    setLock(data || null);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tenantId, sectionKey]);

  const state = lock?.state || 'open';
  const canEdit = isSuperSysAdmin
    || state === 'open'
    || (state === 'delegated' && lock?.delegated_to === user?.id);

  async function setLockState(newState, delegatedTo = null) {
    if (!isSuperSysAdmin) return; // RLS ч гэсэн хориглоно, гэхдээ UX-д эрт зогсооно
    const payload = {
      tenant_id: tenantId,
      section_key: sectionKey,
      state: newState,
      delegated_to: newState === 'delegated' ? delegatedTo : null,
      locked_by: newState === 'locked' ? user?.id : null,
      locked_at: newState === 'locked' ? new Date().toISOString() : null,
    };
    await supabase.from('tenant_locked_sections').upsert(payload, { onConflict: 'tenant_id,section_key' });
    await load();
  }

  return { lock, state, canEdit, loading, isSuperSysAdmin, setLockState, reload: load };
}
