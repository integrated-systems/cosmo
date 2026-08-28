import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// 2026-08-27: Хуучин "suh" (userapp-react) төслийн Профайл хуудасны
// Тохиргоо (Интерфейс) хэсгийг Cosmo стандартад (tenant_id, RLS) нийцүүлж
// шилжүүлэв — device-local localStorage биш, СЕРВЕР талд хадгалж,
// төхөөрөмж хооронд синк хийгддэг.
//
// 2026-08-28: Хэрэглэгчийн хүсэлтээр дэвсгэр зургийг ГАДНААС IMPORT
// хийх боломжийг (upload/storage download) БүРМВСВН хаав — зөвхөн
// программд БАГТААСАН 6 бэлэн зургаас (bg_preset, src/config/
// presetBackgrounds.js) сонгодог боллоо. ҮҮнээс болж storage
// download()/blob URL-ийн логик хэрэггүй болсон (энгийн, хүнгэн static
// URL шууд ашиглана).
//
// ЭЦСИЙН БАТАЛГААЖСАН "5 ЛЕИР, 6 СЛАЙДЕР" СИСТЕМ (доод → дээш):
//   Леир 1 (хамгийн доод) — дэлгэцийг 100% бүүрхэх, хамгийн арын фон
//                            (bg_color ЭСВЭЛ bg_preset)
//   Леир 2 — дэлгэцийг 100% бүүрхэх ХАР давхарга, 100%→0% тунгалаг
//            — Слайдер 1 (хамгийн дээд): bg_tint
//   Леир 3 — дэлгэцийг 100% бүүрхэх ӨНГӨГүүй blur давхарга,
//            100%→0% blur — Слайдер 2: bg_blur
//   Леир 4 — тайл/картны background өнгө, custom өнгөнөөс сонгоно,
//            100%→0% тунгалаг — Слайдер 3: card_color + card_fill_opacity
//   Леир 5 (хамгийн дээд) — ЗӨВХӨН тайл/картуудыг бүүрхсэн ХАР
//            давхарга, 100%→0% тунгалаг — Слайдер 4: card_wash_opacity
//   Слайдер 5 — тайл/картны хүүрээний өнгө хар(0)→цагаан(255)
//            (card_border_gray)
//   Слайдер 6 — тайл/карт/Hero-ийн border-radius 4-30px (card_radius)
const DEFAULTS = {
  theme: 'dark',
  bg_preset: null,
  bg_color: null,
  bg_tint: 0,
  bg_blur: 0,
  card_color: null,
  card_fill_opacity: 100,
  card_wash_opacity: 0,
  card_border_gray: null,
  card_radius: 20,
};

export function useUserAppPrefs(userId, tenantId) {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from('userapp_prefs').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const merged = data ? { ...DEFAULTS, ...data } : DEFAULTS;
      setPrefs(merged);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const savePrefs = useCallback(async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error } = await supabase.from('userapp_prefs').upsert({
      user_id: userId,
      tenant_id: tenantId,
      theme: next.theme,
      bg_preset: next.bg_preset,
      bg_color: next.bg_color,
      bg_tint: next.bg_tint,
      bg_blur: next.bg_blur,
      card_color: next.card_color,
      card_fill_opacity: next.card_fill_opacity,
      card_wash_opacity: next.card_wash_opacity,
      card_border_gray: next.card_border_gray,
      card_radius: next.card_radius,
      updated_at: new Date().toISOString(),
    });
    return { error };
  }, [prefs, userId, tenantId]);

  return { prefs, loading, savePrefs };
}
