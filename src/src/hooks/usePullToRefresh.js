import { useEffect, useRef, useState } from 'react';

// Аль ч хуудасны content-body-г (App.jsx-ийн Layout доtorh scroll хийдэг
// <div>) дээрээс доош чирэхэд refresh хийдэг ГЛОБАЛ дvрэм — 2026-08-19
// хэрэглэгчийн заасны дагуу (гар утас/таблет, зөвхөн touch — desktop
// хулганад vйлчлэхгvй, учир нь mouse дээр pull-to-refresh хvлээгдэхгvй).
// Зөвхөн content-body scrollTop=0 vед (аль хэдийн дээд ирмэгтээ байхад)
// эхэлдэг тул ердийн доош scroll хийхтэй холилдохгvй.
const THRESHOLD = 80;

export function usePullToRefresh(scrollRef) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function handleTouchStart(e) {
      if (el.scrollTop <= 0) startY.current = e.touches[0].clientY;
      else startY.current = null;
    }

    function handleTouchMove(e) {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) setPullDistance(Math.min(dy, THRESHOLD * 1.5));
    }

    function handleTouchEnd() {
      if (startY.current === null) return;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        window.location.reload();
      } else {
        setPullDistance(0);
      }
      startY.current = null;
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRef, pullDistance]);

  return { pullDistance, refreshing, threshold: THRESHOLD };
}
