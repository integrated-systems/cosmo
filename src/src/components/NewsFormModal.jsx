import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { NEWS_CATEGORIES } from '../data/newsCategories';

// "Мэдээ, мэдээлэл" — Мэдээний агрегат таблицын мвр дээр дарахад,
// "Засах" товч дарахад, "+ Шинэ мэдээ vvсгэх" товч дарахад бvгд ЯГ ЭНЭ
// НЭГ модалиар нээгдэнэ (2026-08-19 хэрэглэгчийн тодорхой заасан
// архитектур — 3 тvvврийн зорилго ялгаатай ч дизайн/бvтэц ижил).
//
// Агуулгын toolbar-ийн 7 дугуй (B/I-ийн ард): default(цэвэрлэх)+6 tailwind
// custom өнгв(customBlue/Green/Orange/Red/Purple/Pink) — screenshot-оор
// заасан "tailwind.config-ийн custom өнгвнvvдийг ашигла" гэсэн шаардлага.
const COLOR_SWATCHES = [
  { key: 'default', className: 'bg-white border border-slate-300' },
  { key: 'blue', className: 'bg-customBlue' },
  { key: 'green', className: 'bg-customGreen' },
  { key: 'orange', className: 'bg-customOrange' },
  { key: 'red', className: 'bg-customRed' },
  { key: 'purple', className: 'bg-customPurple' },
  { key: 'pink', className: 'bg-customPink' },
];

// Markdown-төстэй хвнгвн тэмдэглэгээ ашиглана (**bold**, _italic_,
// {{color:x}}...{{/color}}, [текст](холбоос)) — жинхэнэ WYSIWYG contentEditable
// биш, учир нь одоогоор харуулах тал (News.jsx) ийм тэмдэглэгээг
// уншиж форматлах логикгvй (backend/`news` хvснэгэл хараахан vvсээгvй,
// TODO). Энгийн `<textarea>` дээр vндэслэсэн тул Enter-ийн үед параграф
// бvрийг автоматаар 1 space-ээр эхлvvлэх зан төлөвийг найдвартай
// хэрэгжvvлж болно.
function wrapSelection(textareaRef, before, after = before) {
  const el = textareaRef.current;
  if (!el) return;
  const { selectionStart, selectionEnd, value } = el;
  const selected = value.slice(selectionStart, selectionEnd);
  const newValue = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  el.value = newValue;
  el.focus();
  el.setSelectionRange(selectionStart + before.length, selectionStart + before.length + selected.length);
  return newValue;
}

function EditorToolbar({ textareaRef, onChange }) {
  function applyWrap(before, after) {
    const newValue = wrapSelection(textareaRef, before, after);
    if (newValue !== undefined) onChange(newValue);
  }
  function handleLink() {
    const url = window.prompt('Холбоосын хаяг (URL):');
    if (!url) return;
    const el = textareaRef.current;
    const hasSelection = el.selectionStart !== el.selectionEnd;
    if (hasSelection) {
      applyWrap('[', `](${url})`);
    } else {
      const { selectionStart, value } = el;
      const insertion = `[холбоос](${url})`;
      const newValue = value.slice(0, selectionStart) + insertion + value.slice(selectionStart);
      el.value = newValue;
      const cursor = selectionStart + insertion.length;
      el.focus();
      el.setSelectionRange(cursor, cursor);
      onChange(newValue);
    }
  }
  return (
    <div className="flex items-center gap-1 mb-2">
      <button type="button" className="ds-btn-secondary font-bold w-7 h-7 p-0 flex items-center justify-center" onClick={() => applyWrap('**')}>B</button>
      <button type="button" className="ds-btn-secondary italic w-7 h-7 p-0 flex items-center justify-center" onClick={() => applyWrap('_')}>I</button>
      {COLOR_SWATCHES.map((c) => (
        <button
          key={c.key}
          type="button"
          title={c.key}
          className={`w-6 h-6 rounded-full ${c.className}`}
          onClick={() => (c.key === 'default' ? null : applyWrap(`{{color:${c.key}}}`, '{{/color}}'))}
        />
      ))}
      <button type="button" className="ds-btn-secondary flex items-center gap-1" onClick={handleLink}>
        <span>∞</span> Линк
      </button>
    </div>
  );
}

const EMPTY_FORM = {
  title: '',
  category: NEWS_CATEGORIES[0],
  bodyText: '',
  videoUrl: '',
  imageNames: [],
  pdfName: '',
  isPublic: false,
  featured: false,
  urgent: false,
};

export default function NewsFormModal({ open, onClose, news, onSaveDraft, onPublish }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      news
        ? {
            title: news.title || '',
            category: news.category || NEWS_CATEGORIES[0],
            bodyText: news.bodyText || '',
            videoUrl: news.videoUrl || '',
            imageNames: news.imageNames || [],
            pdfName: news.pdfName || '',
            isPublic: news.isPublic || false,
            featured: news.featured || false,
            urgent: news.urgent || false,
          }
        : EMPTY_FORM
    );
  }, [open, news]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Enter дарахад шинэ параграф(\n\n)+урд нь 1 space автоматаар vvсгэнэ
  // (2026-08-19 хэрэглэгчийн тодорхой заасан "агуулга бичих талбарын"
  // тохиргоо). Shift+Enter бол ердийн зөөлөн мвр шилжилт (нэг параграф
  // дотор), автомат space vгvй.
  function handleContentKeyDown(e) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    const el = textareaRef.current;
    const { selectionStart, selectionEnd, value } = el;
    const insertion = '\n\n ';
    const newValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
    el.value = newValue;
    const cursor = selectionStart + insertion.length;
    el.setSelectionRange(cursor, cursor);
    set('bodyText', newValue);
  }

  return (
    <Modal open={open} onClose={onClose} title={news ? 'Мэдээ засах' : 'Шинэ мэдээ vvсгэх'} size="lg" footer={
      <>
        <button className="ds-btn-secondary" onClick={() => onSaveDraft?.(form)}>Ноорог хадгалах</button>
        <button className="ds-btn-primary" onClick={() => onPublish?.(form)}>Нийтлэх</button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гарчиг</label>
          <input className="ds-input w-full" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Ангилал (Topic)</label>
          <select className="ds-select w-full" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {NEWS_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Агуулга</label>
          <EditorToolbar textareaRef={textareaRef} onChange={(v) => set('bodyText', v)} />
          <textarea
            ref={textareaRef}
            className="ds-input w-full min-h-[160px] resize-y"
            value={form.bodyText}
            onChange={(e) => set('bodyText', e.target.value)}
            onKeyDown={handleContentKeyDown}
          />
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Видео (YouTube embed холбоос)</label>
          <input
            className="ds-input w-full"
            placeholder="https://www.youtube.com/embed/..."
            value={form.videoUrl}
            onChange={(e) => set('videoUrl', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Зураг (камераар авах эсвэл сангаас сонгох)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="ds-input w-full"
            onChange={(e) => set('imageNames', Array.from(e.target.files || []).map((f) => f.name))}
          />
          <div className="text-[11px] text-mutedtext mt-1">
            {form.imageNames.length ? form.imageNames.join(', ') : 'Зураг алга'}
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">PDF файл</label>
          <input
            type="file"
            accept="application/pdf"
            className="ds-input w-full"
            onChange={(e) => set('pdfName', e.target.files?.[0]?.name || '')}
          />
          <div className="text-[11px] text-mutedtext mt-1">{form.pdfName || 'PDF алга'}</div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="accent-customBlue" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} />
            Паблик мэдээ (нэвтрэлтгvй гадны хэрэглэгчид ч харагдана)
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="accent-customBlue" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
            Онцлох мэдээ болгох
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="accent-customBlue" checked={form.urgent} onChange={(e) => set('urgent', e.target.checked)} />
            Шуурхай мэдээ болгох
          </label>
        </div>
      </div>
    </Modal>
  );
}
