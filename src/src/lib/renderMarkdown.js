import { marked } from 'marked';
import DOMPurify from 'dompurify';

// "Программын тухай" хуудасны Заавар/Лог картуудын markdown агуулгыг
// аюулгүй HTML болгож render хийнэ — News.jsx-ийн sanitize загварыг
// дахин ашигласан (Rule of two), гэхдээ гарчиг/жагсаалт/код зэргийг
// нэмэлтээр зeвшeeрнe (заавар/лог агуулга бүтэцтэй байх шаардлагатай).
const SANITIZE_OPTS = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:https?:)/i,
};

export function renderMarkdown(text) {
  const html = marked.parse(text || '', { breaks: true });
  return DOMPurify.sanitize(html, SANITIZE_OPTS);
}
