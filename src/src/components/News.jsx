import { useEffect, useRef, useState } from 'react';
import { formatNewsDateTime, formatViewCount } from '../lib/newsFormat';
import Lightbox from './Lightbox';

// "news" нэртэй дахин ашиглагдах мэдээний карт component — 2026-08-19
// хэрэглэгчийн screenshot-оор үзүүлсэн хэмжээс/элементүүдийг нарийн
// дүүриалгасан: 10px padding (бүх талдаа), карт radius 8px (.ds-card),
// доторхи жижиг элементүүд (badge/зураг) radius 4px (rounded).
//
// Props:
// - badges: ['онцлох' | 'шуурхай', ...] — динамик мврний ДЭЭД талд
// - datetime: ISO string/Date, category: string, viewCount: number
// - title: string, bodyText: string (сонголттой)
// - videoId: string | null — YouTube (сонголттой)
// - images: string[] — зургийн URL-үүдийн БҮРЭН жагсаалт (сонголттой)
//
// 2026-08-19 (2-р засвар): videoId болон images ХАМТ ирж болно (нэг
// мэдээнд видео+зураг зэрэг байж болохоор) — хуучин "media: {type}"
// нэг төрлийн бүтцийг задалж, 2 бие даасан prop болгов. Зураг дээр
// дарахад Lightbox-оор томруулж үзүүлнэ (зүүн/баруун сум, swipe, Х/
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

// Параграфын эхэнд санамсаргүй орсон space/NBSP/zero-width зэрэг
// үзэгдэхгүй тэмдэгтүүдийг арилгана — 2026-08-19 хэрэглэгч screenshot-оор
// зааж, параграф бүр урдаа 1 space зайтай харагдаж байгааг мэдэгдсэн.
function stripInvisible(s) {
  return s.replace(/^[\s\u00A0\u200B\uFEFF]+|[\s\u00A0\u200B\uFEFF]+$/g, '');
}

// NewsFormModal.jsx-ийн EditorToolbar-аас бичигдсэн markdown-төстэй
// тэмдэглэгээг (**bold**, _italic_, {{color:x}}...{{/color}}, [текст]
// (холбоос)) бодит React элемент болгож задална — 2026-08-19 хэрэглэгч
// олсон алдаа: энэ уншиж-форматлах логик ОГТ байгаагүй тул мэдээ
// нийтлэгдсэний дараа бичих үеийн формат бүрмвсвн алдагдаж, зүгээр
// л raw тэмдэглэгээ агуулсан гүйцэлдсэн текст харагддаг байсан.
const NEWS_COLOR_HEX = {
  blue: '#3b82f6', green: '#10b981', orange: '#f59e0b',
  red: '#ef5555', purple: '#8b5cf6', pink: '#ec4899',
};
function parseNewsBody(text) {
  const pattern = /\*\*(.+?)\*\*|_(.+?)_|\{\{color:(\w+)\}\}([\s\S]+?)\{\{\/color\}\}|\[(.+?)\]\((.+?)\)/g;
  const nodes = [];
  let lastIndex = 0;
  let m;
  let key = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={key++}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      nodes.push(<em key={key++}>{m[2]}</em>);
    } else if (m[3] !== undefined) {
      nodes.push(<span key={key++} style={{ color: NEWS_COLOR_HEX[m[3]] }}>{m[4]}</span>);
    } else if (m[5] !== undefined) {
      nodes.push(<a key={key++} href={m[6]} target="_blank" rel="noreferrer" className="text-customBlue underline">{m[5]}</a>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export default function News({ id, badges, datetime, category, viewCount, title, bodyText, videoId, images, onView }) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  // Дэлгэцэн дээр бодитоор 4 мврвес хэтэрсэн эсэхийг хэмждэг (тэмдэгтийн
  // тоогоор тааварлахгүй) — screen/container өргөнөөс хамааран мврийн
  // тоо өөрчлөгддөг тул scrollHeight vs clientHeight-ийг харьцуулна.
  // Зүвхүн collapsed (line-clamp-4) үед хэмжинэ, expanded үед clientHeight
  // өөрөө өсдөг тул хуучин үр дүнгээ хадгална.
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

  // Карт анх дэлгэцэнд гарахад (mount) нэг удаа "Үзсэн" тоолуурыг
  // нэмэгдүүлнэ — 2026-08-19 хэрэглэгч заасны дагуу; давхар тоологдохоос
  // сэргийлэх (session доторх ID бүрийг зөвхөн 1 удаа) логик эцэг
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
          {/* Collapsed үед бүх параграфыг НЭГ урсгал текст болгож нийлүүлж
              line-clamp-4-ээр таслана (line-clamp олон <p> хүүхэд элемент
              дээр зввгүй ажилладаг тул). Expanded үед '\n\n'-ээр тусдаа
              параграф болгож задалж, тус бүрийг justify (хоёр талдаа
              тэгширсэн), шинэ мврний ЭХЭНД зай/догол авахгүй байдлаар
              харуулна (догол мвр биш, ердийн параграф хоорондын зайгаар
              ялгана). */}
          {expanded ? (
            <div ref={textRef}>
              {bodyText.split(/\n\n+/).map((para, i) => (
                <p key={i} className="text-xs text-mutedtext text-justify indent-0 [text-justify:inter-word] mb-2 last:mb-0">
                  {parseNewsBody(stripInvisible(para))}
                </p>
              ))}
            </div>
          ) : (
            <p ref={textRef} className="text-xs text-mutedtext text-justify indent-0 [text-justify:inter-word] line-clamp-4">
              {parseNewsBody(stripInvisible(bodyText.replace(/\n+/g, ' ')))}
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
