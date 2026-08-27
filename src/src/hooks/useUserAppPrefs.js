import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// 2026-08-27: Хуучин "suh" (userapp-react) төслийн Профайл хуудасны
// Тохиргоо (Интерфейс) хэсгийг Cosmo стандартад (tenant_id, RLS) нийцүүлж
// шилжүүлэв — device-local localStorage биш, СЕРВЕР талд хадгалж,
// төхөөрөмж хооронд синк хийгддэг.
const DEFAULTS = {
  theme: 'dark',
  bg_image_path: null,
  bg_color: null,
  bg_blur: 8,
  bg_tint: 0,
  card_tint: 0,
  card_transparency: 0,
  card_border_gray: null,
};

export function useUserAppPrefs(userId, tenantId) {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [bgImageUrl, setBgImageUrl] = useState(null); // blob URL, зөвхөн энэ session-д хүчинтэй
  const [loading, setLoading] = useState(true);

  const loadBgImage = useCallback(async (path) => {
    if (!path) { setBgImageUrl((old) => { if (old) URL.revokeObjectURL(old); return null; }); return; }
    const { data, error } = await supabase.storage.from('userapp-backgrounds').download(path);
    if (error || !data) return;
    setBgImageUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(data); });
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('userapp_prefs').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const merged = data ? { ...DEFAULTS, ...data } : DEFAULTS;
      setPrefs(merged);
      if (merged.bg_image_path) loadBgImage(merged.bg_image_path);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, loadBgImage]);

  const savePrefs = useCallback(async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (patch.bg_image_path !== undefined) loadBgImage(patch.bg_image_path);
    const { error } = await supabase.from('userapp_prefs').upsert({
      user_id: userId,
      tenant_id: tenantId,
      theme: next.theme,
      bg_image_path: next.bg_image_path,
      bg_color: next.bg_color,
      bg_blur: next.bg_blur,
      bg_tint: next.bg_tint,
      card_tint: next.card_tint,
      card_transparency: next.card_transparency,
      card_border_gray: next.card_border_gray,
      updated_at: new Date().toISOString(),
    });
    return { error };
  }, [prefs, userId, tenantId, loadBgImage]);

  async function uploadBgImage(file) {
    const path = `${userId}/background.jpg`;
    const { error } = await supabase.storage.from('userapp-backgrounds').upload(path, file, { upsert: true, contentType: file.type });
    if (error) return { error };
    return savePrefs({ bg_image_path: path, bg_color: null });
  }

  return { prefs, bgImageUrl, loading, savePrefs, uploadBgImage };
}
