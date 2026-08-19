import { useEffect, useRef, useState } from 'react';
import { formatNewsDateTime, formatViewCount } from '../lib/newsFormat';
import Lightbox from './Lightbox';

// "news" нэртэй дахин ашиглагдах мэдээний карт component — 2026-08-19
// хэрэглэгчийн screenshot-оор vзvvлсэн хэмжээс/элементvvдийг нарийн
// дvvриалгасан: 10px padding (бvх талдаа), карт radius 8px (.ds-card),
// доторхи жижиг элементvvд (badge/зураг) radius 4px (rounded).
//
// Props:
// - badges: ['онцлох' | 'шуурхай', ...] — динамик мврний ДЭЭД талд
// - datetime: ISO string/Date, category: string, viewCount: number
// - title: string, bodyText: string (сонголттой)
// - videoId: string | null — YouTube (сонголттой)
// - images: string[] — зургийн URL-vvдийн БҮРЭН жагсаалт (сонголттой)
//
// 2026-08-19 (2-р засвар): videoId болон images ХАМТ ирж болно (нэг
// мэдээнд видео+зураг зэрэг байж болохоор) — хуучин "media: {type}"
// нэг төрлийн бvтцийг задалж, 2 бие даасан prop болгов. Зураг дээр
// дарахад Lightbox-оор томруулж vзvvлнэ (зvvн/баруун сум, swipe, Х/
// backdrop дарж хаах).
const BADGE_STYLE = {
  онцлох: 'bg-customBlue text-white',
  шуурхай: 'bg-customRed text-white',
};

function NewsBadges({ badges }) {
  if (!badges?.length) return null;
  return (
    <div className="flex items-center gap-1">
      {badges.map((b) => (
        <span
          key={b}
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BADGE_STYLE[b] || 'bg-slate-500 text-white'}`}
        >
          {b}
        </span>
      ))}
    </div>
  );
}

function NewsVideo({ videoId }) {
  if (!videoId) return null;
  return (
    <div className="aspect-[4/3] rounded overflow-hidden bg-black">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allowFullScreen
      />
    </div>
  );
}

function NewsImages({ images, onOpen }) {
  if (!images?.length) return null;
  const preview = images.slice(0, 2);
  const extraCount = Math.max(0, images.length - preview.length);

  if (preview.length === 1) {
    return (
      <button className="block w-full aspect-[4/3] rounded overflow-hidden" onClick={() => onOpen(0)}>
        <img src={preview[0]} alt="" className="w-full h-full object-cover" />
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {preview.map((src, i) => {
        const isLast = i === preview.length - 1;
        return (
          <button key={src} className="relative aspect-[4/3] rounded overflow-hidden" onClick={() => onOpen(i)}>
            <img src={src} alt="" className="w-full h-full object-cover" />
            {isLast && extraCount > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-bold">
                +{extraCount}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Параграфын эхэнд санамсаргvй орсон space/NBSP/zero-width зэрэг
// vзэгдэхгvй тэмдэгтvvдийг арилгана — 2026-08-19 хэрэглэгч screenshot-оор
// зааж, параграф бvр урдаа 1 space зайтай харагдаж байгааг мэдэгдсэн.
function stripInvisible(s) {
  return s.replace(/^[\s\u00A0\u200B\uFEFF]+|[\s\u00A0\u200B\uFEFF]+$/g, '');
}

export default function News({ id, badges, datetime, category, viewCount, title, bodyText, videoId, images, onView }) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  // Дэлгэцэн дээр бодитоор 4 мврвес хэтэрсэн эсэхийг хэмждэг (тэмдэгтийн
  // тоогоор тааварлахгvй) — screen/container өргөнөөс хамааран мврийн
  // тоо өөрчлөгддөг тул scrollHeight vs clientHeight-ийг харьцуулна.
  // Зvвхvн collapsed (line-clamp-4) vед хэмжинэ, expanded vед clientHeight
  // өөрөө өсдөг тул хуучин vр дvнгээ хадгална.
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (expanded) return;
    const el = textRef.current;
    if (!el) return;
    function measure() {
      setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [bodyText, expanded]);

  // Карт анх дэлгэцэнд гарахад (mount) нэг удаа "Vзсэн" тоолуурыг
  // нэмэгдvvлнэ — 2026-08-19 хэрэглэгч заасны дагуу; давхар тоологдохоос
  // сэргийлэх (session доторх ID бvрийг зөвхөн 1 удаа) логик эцэг
  // компонент (pages/News.jsx)-д байрлана.
  useEffect(() => {
    onView?.(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ds-card p-2.5 flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <NewsBadges badges={badges} />
        <div className="text-[11px] text-mutedtext">
          {formatNewsDateTime(datetime)} | {category} | Үзсэн: {formatViewCount(viewCount)}
        </div>
      </div>

      <div className="font-semibold text-sm text-slate-900 dark:text-white uppercase">{title}</div>

      {bodyText && (
        <div>
          {/* Collapsed vед бvх параграфыг НЭГ урсгал текст болгож нийлvvлж
              line-clamp-4-ээр таслана (line-clamp олон <p> хvvхэд элемент
              дээр зввгvй ажилладаг тул). Expanded vед '\n\n'-ээр тусдаа
              параграф болгож задалж, тус бvрийг justify (хоёр талдаа
              тэгширсэн), шинэ мврний ЭХЭНД зай/догол авахгvй байдлаар
              харуулна (догол мвр биш, ердийн параграф хоорондын зайгаар
              ялгана). */}
          {expanded ? (
            <div ref={textRef}>
              {bodyText.split(/\n\n+/).map((para, i) => (
                <p key={i} className="text-xs text-mutedtext text-justify indent-0 [text-justify:inter-word] mb-2 last:mb-0">
                  {stripInvisible(para)}
                </p>
              ))}
            </div>
          ) : (
            <p ref={textRef} className="text-xs text-mutedtext text-justify indent-0 [text-justify:inter-word] line-clamp-4">
              {stripInvisible(bodyText.replace(/\n+/g, ' '))}
            </p>
          )}
          {isTruncated && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-customBlue hover:underline mt-1"
            >
              {expanded ? 'Хураах' : 'Дэлгэрэнгүй'}
            </button>
          )}
        </div>
      )}

      <NewsVideo videoId={videoId} />
      <NewsImages images={images} onOpen={setLightboxIndex} />

      {lightboxIndex !== null && (
        <Lightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
