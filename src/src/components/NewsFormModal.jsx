import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { NEWS_CATEGORIES } from '../data/newsCategories';
import { supabase } from '../lib/supabaseClient';

// "Мэдээ, мэдээлэл" — Мэдээний агрегат таблицын мвр дээр дарахад,
// "Засах" товч дарахад, "+ Шинэ мэдээ үүсгэх" товч дарахад бүгд ЯГ ЭНЭ
// НЭГ модалиар нээгдэнэ (2026-08-19 хэрэглэгчийн тодорхой заасан
// архитектур — 3 түүврийн зорилго ялгаатай ч дизайн/бүтэц ижил).
//
// 2026-08-19 (3-р засвар): Агуулгын засварлагчийг markdown-твстэй raw
// тэмдэглэгээ (**bold**, {{color:x}}...{{/color}}) systemees ҮНДСЭЭР
// нь ЖИНХЭНЭ WYSIWYG (contentEditable) руу шилжүүлэв. Хэрэглэгчийн
// тодорхой заасан дүрэм: "зүгээр юу харагдана түүнийг нийтэлнэ" —
// markdown raw тэмдэглэгээ бүтэн харагдах, Tab автоматаар алдагдах
// зэрэг олон будлиан үүсгэж байсныг үндсээр нь үвчилсэн (contentEditable
// үед хэрэглэгч ЯГ ТЭР ЧИГЭЭРЭЭ л харна, тусдаа тэмдэглэгээний давхарга
// үгүй). B/I товч+вnгв товч бүгд document.execCommand ашиглана — жижиг
// хэмжээний, найдвартай, гуравдагч сангүй шийдэл.
const COLORS = [
  { key: 'default', hex: null, className: 'bg-white border border-slate-300' },
  { key: 'blue', hex: '#3b82f6', className: 'bg-customBlue' },
  { key: 'green', hex: '#10b981', className: 'bg-customGreen' },
  { key: 'orange', hex: '#f59e0b', className: 'bg-customOrange' },
  { key: 'red', hex: '#ef5555', className: 'bg-customRed' },
  { key: 'purple', hex: '#8b5cf6', className: 'bg-customPurple' },
  { key: 'pink', hex: '#ec4899', className: 'bg-customPink' },
];

function EditorToolbar({ editorRef, onChange }) {
  // Товч дарахад contentEditable-ийн focus/сонголт алдагдахаас
  // сэргийлж, onMouseDown дээр preventDefault хийнэ (стандарт арга).
  function preventBlur(e) {
    e.preventDefault();
  }
  function exec(cmd, value = null) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    onChange(editorRef.current?.innerHTML || '');
  }
  function handleLink() {
    const url = window.prompt('Холбоосын хаяг (URL):');
    if (!url) return;
    exec('createLink', url);
  }
  return (
    <div className="flex items-center gap-1 mb-2 flex-wrap">
      <button type="button" onMouseDown={preventBlur} className="ds-btn-secondary font-bold w-7 h-7 p-0 flex items-center justify-center" onClick={() => exec('bold')}>B</button>
      <button type="button" onMouseDown={preventBlur} className="ds-btn-secondary italic w-7 h-7 p-0 flex items-center justify-center" onClick={() => exec('italic')}>I</button>
      {COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          title={c.key}
          onMouseDown={preventBlur}
          className={`w-6 h-6 rounded-full ${c.className}`}
          onClick={() => exec('foreColor', c.hex || '#0f172a')}
        />
      ))}
      <button type="button" onMouseDown={preventBlur} className="ds-btn-secondary flex items-center gap-1" onClick={handleLink}>
        <span>∞</span> Линк
      </button>
    </div>
  );
}

const EMPTY_FORM = {
  title: '',
  category: NEWS_CATEGORIES[0],
  bodyHtml: '',
  videoUrl: '',
  images: [], // [{ name, url }]
  pdfName: '',
  featured: false,
  urgent: false,
  warning: false,
  critical: false,
};

// Хуучин (markdown raw тэмдэглэгээтэй) мэдээг засварлахад editor-т
// ЦЭВЭР анхны текст (тэмдэглэгээгүй) орж ирээд, менежер шинээр
// WYSIWYG форматлаж болохоор — escape хийгээд мврүүдийг <p> болгоно.
function plainTextToHtml(text) {
  const esc = document.createElement('div');
  esc.textContent = text;
  const escaped = esc.innerHTML;
  return escaped
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/^[\s\t]+/, '').replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export default function NewsFormModal({ open, onClose, news, hoaId, onSaveDraft, onPublish }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const initial = news
      ? {
          title: news.title || '',
          category: news.category || NEWS_CATEGORIES[0],
          bodyHtml: news.bodyHtml || (news.bodyText ? plainTextToHtml(news.bodyText) : ''),
          videoUrl: news.videoUrl || '',
          images: (news.images || []).map((url) => ({ name: url.split('/').pop(), url })),
          pdfName: news.pdfName || '',
          featured: news.featured || false,
          urgent: news.urgent || false,
          warning: news.warning || false,
          critical: news.critical || false,
        }
      : EMPTY_FORM;
    setForm(initial);
    // contentEditable бол React-ийн "controlled" биш тул innerHTML-ийг
    // ЗүүХVN нэг удаа (модаль нээгдэхэд) imperativ байдлаар тохируулна —
    // үүнийг render дээр дахин бичихгүй (курсорын байрлал алдагдахгүй).
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = initial.bodyHtml || '';
    });
  }, [open, news]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleEditorInput() {
    set('bodyHtml', editorRef.current?.innerHTML || '');
  }

  function handleEditorFocus() {
    // Enter товч дарахад цэвэрхэн <p> блок үүсгэдэг болгоно (анхдагч
    // browser зан твлвв үе үе <div> эсвэл зүгээр <br> ашигладаг тул).
    document.execCommand('defaultParagraphSeparator', false, 'p');
  }

  // Сонгосон зурагнуудыг "news-images" bucket-д {tenant_id}/{зам} доор
  // upload хийж, олон нийтэд нээлттэй URL-ыг form.images-д нэмнэ
  // (migration 0015-ийн RLS policy зөвхөн тухайн tenant-ийн гишүүнд
  // upload зөвшөөрдөг).
  async function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const path = `${hoaId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('news-images').upload(path, file);
      if (error) {
        window.alert(`"${file.name}" файл upload хийхэд алдаа гарлаа: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from('news-images').getPublicUrl(path);
      uploaded.push({ name: file.name, url: data.publicUrl });
    }
    setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
    setUploading(false);
  }

  function removeImage(url) {
    setForm((f) => ({ ...f, images: f.images.filter((img) => img.url !== url) }));
  }

  return (
    <Modal open={open} onClose={onClose} title={news ? 'Мэдээ засах' : 'Шинэ мэдээ үүсгэх'} size="lg" footer={
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
          <EditorToolbar editorRef={editorRef} onChange={(html) => set('bodyHtml', html)} />
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onFocus={handleEditorFocus}
            data-placeholder="Мэдээний агуулгаа энд бичнэ үү..."
            className="news-editor ds-input w-full min-h-[160px] resize-y overflow-y-auto text-left"
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
            disabled={uploading}
            className="ds-input w-full"
            onChange={handleImageSelect}
          />
          <div className="text-[11px] text-mutedtext mt-1">
            {uploading && 'Зураг upload хийж байна...'}
            {!uploading && !form.images.length && 'Зураг алга'}
            {!uploading && form.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {form.images.map((img) => (
                  <span key={img.url} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-appbg rounded px-2 py-0.5">
                    {img.name}
                    <button type="button" className="text-customRed" onClick={() => removeImage(img.url)}>×</button>
                  </span>
                ))}
              </div>
            )}
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
            <input type="checkbox" className="accent-customBlue" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
            Онцлох мэдээ болгох
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="accent-customBlue" checked={form.urgent} onChange={(e) => set('urgent', e.target.checked)} />
            Шуурхай мэдээ болгох
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="accent-customOrange" checked={form.warning} onChange={(e) => set('warning', e.target.checked)} />
            Сэрэмжлүүлэг мэдээ болгох
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="accent-customRed" checked={form.critical} onChange={(e) => set('critical', e.target.checked)} />
            Ноцтой мэдээ болгох
          </label>
        </div>
      </div>
    </Modal>
  );
}
