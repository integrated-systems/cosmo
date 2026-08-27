import { useEffect, useRef, useState } from 'react';

// Дахин ашиглагдах fullscreen Lightbox — зураг дээр дарахад томруулж
// харуулна, зүүн/баруун сумаар (keyboard) эсвэл хуруугаар (touch swipe)
// гүйлгэнэ, доороос дээш чирэхэд (mobile "pull-to-dismiss") хаагдана,
// X товч эсвэл зурагны гадна талбар дээр дарахад хаагдана — 2026-08-19
// хэрэглэгчийн заасан нийтлэг UI/UX дүрмүүд (News.jsx-ийн зургийн preview
// дээр дарахад нээгдэнэ, гэхдээ энэ component нь News-ээс тусгаарлагдмал,
// ирээдүйд өөр газар зурагны gallery хэрэгтэй бол дахин ашиглаж болно).
const SWIPE_THRESHOLD = 50;

export default function Lightbox({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const touchStart = useRef(null);

  const goPrev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setIndex((i) => (i + 1) % images.length);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  function handleTouchStart(e) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dy) > Math.abs(dx) && dy < -SWIPE_THRESHOLD) {
      // Доороос ДЭЭШ чирэхэд (dy сөрөг = хуруу дээш хөдөлсөн) хаагдана —
      // хэрэглэгчийн анхны спецификацид заасан чиглэл ("доороос дээш
      // чирж... горимоос гардаг"), Instagram-ийн "pull down to dismiss"
      // ЭСРЭГ чиглэл гэдгийг анхаар — 2026-08-19 хэрэглэгч засуулсан.
      onClose();
      return;
    }
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) goPrev();
      else goNext();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="absolute top-4 right-4 text-white text-3xl leading-none w-10 h-10 flex items-center justify-center rounded hover:bg-white/10"
        onClick={onClose}
        aria-label="Хаах"
      >
        ×
      </button>

      {images.length > 1 && (
        <button
          className="absolute left-2 md:left-4 text-white text-4xl w-12 h-12 flex items-center justify-center rounded hover:bg-white/10"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Өмнөх"
        >
          ‹
        </button>
      )}

      <img
        src={images[index]}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <button
          className="absolute right-2 md:right-4 text-white text-4xl w-12 h-12 flex items-center justify-center rounded hover:bg-white/10"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Дараах"
        >
          ›
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
