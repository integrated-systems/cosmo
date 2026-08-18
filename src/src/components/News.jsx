import { useEffect, useRef, useState } from 'react';
import { formatNewsDateTime, formatViewCount } from '../lib/newsFormat';

// "news" нэртэй дахин ашиглагдах мэдээний карт component — 2026-08-19
// хэрэглэгчийн screenshot-оор vзvvлсэн хэмжээс/элементvvдийг нарийн
// дvvриалгасан: 10px padding (бvх талдаа), карт radius 8px (.ds-card),
// доторхи жижиг элементvvд (badge/зураг) radius 4px (rounded).
//
// Props:
// - badges: ['онцлох' | 'шуурхай', ...] — динамик мврний ДЭЭД талд
// - datetime: ISO string/Date, category: string, viewCount: number
// - title: string, bodyText: string (сонголттой)
// - media: { type:'youtube', videoId } | { type:'album', images:[url,...], extraCount } | null

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

function NewsMedia({ media }) {
  if (!media) return null;

  if (media.type === 'youtube') {
    return (
      <div className="aspect-[4/3] rounded overflow-hidden bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${media.videoId}`}
          title="YouTube video"
          allowFullScreen
        />
      </div>
    );
  }

  if (media.type === 'album') {
    const images = media.images.slice(0, 2);
    if (images.length === 1) {
      return (
        <div className="aspect-[4/3] rounded overflow-hidden">
          <img src={images[0]} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-2">
        {images.map((src, i) => {
          const isLast = i === images.length - 1;
          return (
            <div key={src} className="relative aspect-[4/3] rounded overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-cover" />
              {isLast && media.extraCount > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-bold">
                  +{media.extraCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

export default function News({ badges, datetime, category, viewCount, title, bodyText, media }) {
  const [expanded, setExpanded] = useState(false);
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

  return (
    <div className="ds-card p-2.5 flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <NewsBadges badges={badges} />
        <div className="text-[11px] text-mutedtext">
          {formatNewsDateTime(datetime)} | {category} | vзсэн: {formatViewCount(viewCount)}
        </div>
      </div>

      <div className="font-semibold text-sm text-slate-900 dark:text-white">{title}</div>

      {bodyText && (
        <div>
          <p
            ref={textRef}
            className={`text-xs text-mutedtext whitespace-pre-line ${expanded ? '' : 'line-clamp-4'}`}
          >
            {bodyText}
          </p>
          {isTruncated && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-customBlue hover:underline mt-1"
            >
              {expanded ? 'Хураах' : 'Дэлгэрэнгvй харах'}
            </button>
          )}
        </div>
      )}

      <NewsMedia media={media} />
    </div>
  );
}
