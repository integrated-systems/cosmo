import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// 2026-08-27: Хуучин "suh" (userapp-react) төслийн Профайл хуудасны
// Тохиргоо (Интерфейс) хэсгийг Cosmo стандартад (tenant_id, RLS) нийцүүлж
// шилжүүлэв — device-local localStorage биш, СЕРВЕР талд хадгалж,
// төхөөрөмж хооронд синк хийгддэг.
//
// ЭЦСИЙН БАТАЛГААЖСАН "5 ЛЕИР, 5 СЛАЙДЕР" СИСТЕМ (доод → дээш):
//   Леир 1 (хамгийн доод) — дэлгэцийг 100% бүүрхэх, хамгийн арын фон
//                            (bg_color ЭСВЭЛ bg_image_path)
//   Леир 2 — дэлгэцийг 100% бүүрхэх ХАР давхарга, 100%→0% тунгалаг
//            — Слайдер 1 (хамгийн дээд): bg_tint
//   Леир 3 — дэлгэцийг 100% бүүрхэх ӨНГӨГүүй blur давхарга,
//            100%→0% blur — Слайдер 2: bg_blur
//   Леир 4 — тайл/картны background өнгө, custom өнгөнөөс сонгоно,
//            100%→0% тунгалаг — Слайдер 3: card_color + card_fill_opacity
//   Леир 5 (хамгийн дээд) — ЗӨВХӨН тайл/картуудыг бүүрхсэн ХАР
//            давхарга, 100%→0% тунгалаг — Слайдер 4: card_wash_opacity
//   (нэмэлт) — тайл/картны хүүрээний өнгө 100%(хар)→100%(цагаан)
//            — Слайдер 5 (хамгийн доод): card_border_gray (0-255)
const DEFAULTS = {
  theme: 'dark',
  bg_image_path: null,
  bg_color: null,
  bg_tint: 0,
  bg_blur: 0,
  card_color: null,
  card_fill_opacity: 100,
  card_wash_opacity: 0,
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
      bg_tint: next.bg_tint,
      bg_blur: next.bg_blur,
      card_color: next.card_color,
      card_fill_opacity: next.card_fill_opacity,
      card_wash_opacity: next.card_wash_opacity,
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
