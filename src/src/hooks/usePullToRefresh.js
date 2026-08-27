import { useEffect, useRef } from 'react';

// Аль ч хуудасны content-body-г (App.jsx-ийн Layout доторх scroll хийдэг
// <div>) дээрээс доош чирэхэд refresh хийдэг ГЛОБАЛ дүрэм — 2026-08-19
// хэрэглэгчийн заасны дагуу (гар утас/таблет, зөвхөн touch — desktop
// хулганад үйлчлэхгүй). Зөвхөн content-body scrollTop=0 үед (аль хэдийн
// дээд ирмэгтээ байхад) эхэлдэг тул ердийн доош scroll хийхтэй холилдохгүй.
//
// 2026-08-19 (2-р засвар): ямар ч визуал индикатор (сум/текст) ХАРУУЛАХГҮЙ
// — өмнөх хувилбарт индикаторын үүсгэсэн нэмэлт div-ийн вндвр Topbar-ыг
// шахаж (flex-shrink) байрлалаас нь хвдвлгвдвг байсныг олж, индикаторыг
// бүрмвсүн арилгав. Одоо энэ hook зүвхүн ЗАН ТвЛвВ (side effect) — DOM-д
// ямар ч элемент нэмдэггүй тул navbar/layout огт хвдлвхгүй.
const THRESHOLD = 80;

export function usePullToRefresh(scrollRef) {
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
      if (pullDistance.current >= THRESHOLD) window.location.reload();
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
  }, [scrollRef]);
}
