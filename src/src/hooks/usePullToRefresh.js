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
// бүрмөсөн арилгав. Одоо энэ hook зөвхөн ЗАН ТөЛөВ (side effect) — DOM-д
// ямар ч элемент нэмдэггүй тул navbar/layout огт хөдлөхгүй.
//
// 2026-08-31 (3-р засвар) ОЛСОН БОДИТ АЛДАА — "window.location.reload()"
// бүтэн хуудсыг дахин ачаалж, хар хөх "ачаалж байна" нүүр агшин зуур
// харагддаг, мөн (OwnerApp дээр) навигацийн slider Home руу буцдаг
// байв. Одоо ЗААВАЛ биш "onRefresh" callback авдаг болгож, дуудагдвал
// зүгээр түүнийг дуудна.
//
// 2026-09-08 (14) 4-р засвар — iPad дээр Үндсэн (admin) программыг
// ашиглаж байхад ХОЁР бодит алдаа олдов:
//   (а) Триггэрийн нөхцөл зөвхөн ГАДНА scrollRef-ийн scrollTop-ыг
//       шалгадаг байсан тул хүснэгэл/грид зэрэг ДОТООД (nested)
//       overflow-auto контейнер дунд/доод хэсэгт скролл хийсэн үед ч
//       гадна scrollTop=0 хэвээр үзэгдэж, дунд/доод хэсэгт байхад ч
//       триггэрлэдэг байв. Одоо touch эхэлсэн цэгээс scrollRef хүртэлх
//       БүХ scroll хийдэг ancestor-уудын scrollTop-ыг шалгаж, аль
//       нэг нь 0-ээс их бол огт эхлүүлэхгүй.
//   (б) "data-no-pull-refresh" attribute-тай элемент (эсвэл түүний
//       дотор) дээр эхэлсэн touch-ыг бүрэн орхигдуулна — зураг зурах,
//       газрын зураг чирэх зэрэг scroll БИШ гар хөдөлгөөнтэй хэсгүүдэд
//       (жиш GridConstructorReact.jsx) ашиглана.
const THRESHOLD = 80;

function hasScrolledAncestor(target, boundary) {
  let node = target;
  while (node && node !== boundary?.parentElement) {
    if (node.dataset && node.dataset.noPullRefresh !== undefined) return true;
    const style = window.getComputedStyle(node);
    const canScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
    if (canScrollY && node.scrollTop > 0) return true;
    if (node === boundary) break;
    node = node.parentElement;
  }
  return false;
}

export function usePullToRefresh(scrollRef, onRefresh) {
  const startY = useRef(null);
  const pullDistance = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function handleTouchStart(e) {
      if (el.scrollTop <= 0 && !hasScrolledAncestor(e.target, el)) {
        startY.current = e.touches[0].clientY;
      } else {
        startY.current = null;
      }
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
