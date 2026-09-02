import { useEffect, useRef } from 'react';

// Аль ч хуудасны content-body-г (App.jsx-ийн Layout доторх scroll хийдэг
// <div>) дээрээс доош чирэхэд рефреш хийдэг ГЛОБАЛ дүрэм — 2026-08-19
// хэрэглэгчийн заасны дагуу (гар утас/таблет, зөвхөн touch — desktop
// хулганад үйлчлэхгүй). Зөвхөн content-body scrollTop=0 үед (аль хэдийн
// дээд ирмэгтээ байхад) эхэлдэг тул ердийн доош scroll хийхтэй холилдохгүй.
//
// 2026-08-19 (2-р засвар): ямар ч визуал индикатор (сум/текст) ХАРУУЛАХГүй
// — өмнөх хувилбарт индикаторын үүсгэсэн нэмэлт div-ийн өндөр Topbar-ыг
// шахаж (flex-shrink) байрлалаас нь хөдөлгөдөг байсныг олж, индикаторыг
// бүрмөсөн арилгав. Одоо энэ hook зөвхөн ЗАН ТӨЛӨВ (side effect) — DOM-д
// ямар ч элемент нэмдэггүй тул navbar/layout огт хөдлөхгүй.
//
// 2026-08-31 (3-р засвар) ОЛСОН БОДИТ АЛДАА — "window.location.reload()"
// бүтэн хуудсыг дахин ачаалж, хар хвх "ачаалж байна" нүүр агшин зуур
// харагддаг, мвн (OwnerApp дээр) навигацийн slider Home руу буцдаг
// байв (URL-ийн дэд зам зввв хадгалагдсан ч, апп-ийн эхлэлийн redirect
// логик үүнийг үл хайхардаг). Одоо ЗААВАЛ биш "onRefresh" callback
// авдаг болгож, дуудагдвал зүгээр түүнийг дуудна — бүтэн reload биш,
// зүгээр тухайн дэд компонентыг дахин ачаалуулна (key-based remount).
// onRefresh байхгүй бол (админ Layout шиг) хуучин "location.reload()"
// зан үйлээ хэвээр үлдээнэ.
const THRESHOLD = 80;

export function usePullToRefresh(scrollRef, onRefresh) {
  const startY = useRef(null);
  const pullDistance = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function handleTouchStart(e) {
      if (el.scrollTop <= 0) startY.current = e.touches[0].clientY;
      else startY.current = null;
      pullDistance.current = 0;
    }

    function handleTouchMove(e) {
      if (startY.current === null) return;
      pullDistance.current = e.touches[0].clientY - startY.current;
    }

    function handleTouchEnd() {
      if (startY.current === null) return;
      if (pullDistance.current >= THRESHOLD) {
        if (onRefresh) onRefresh();
        else window.location.reload();
      }
      startY.current = null;
      pullDistance.current = 0;
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollRef, onRefresh]);
}
