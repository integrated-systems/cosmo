import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatDate } from '../lib/format';
import { renderMarkdown } from '../lib/renderMarkdown';
import { useAuth } from '../lib/AuthContext';
import { useConfirm } from '../hooks/useConfirm';
import TabButton from './TabButton';
import Modal from './Modal';
import { EditIcon, DeleteIcon } from './icons/Icons';

// "Программын тухай" (Топбар -> Тохиргоо -> Программын тухай) —
// 2026-09-08: Ашиглах заавар + Хөгжүүлсэн лог гэсэн 2 таб, ГЛОБАЛ
// (tenant_id үгүй, Ангилал/Терел-тэй ижил зарчим — fixed_asset_categories
// харна уу) SUPERSYSADMIN-ийн бичдэг, бүх tenant үздэг үндсэн лавлах.
// Markdown агуулгыг renderMarkdown()-ээр (marked+dompurify) аюулгүй
// HTML болгож харуулна.
// 2026-09-08 (2): "Зохиогчийн эрх" таб нэмэв (Хөгжүүлсэн логийн
// баруун тал) — ганц карттай, Устгах/Нуух үгүй, зeвхeн Засах.
// Картнуудын хэсгийг max-w-[960px] mx-auto болгож том дэлгэцэнд ч
// хэт eргeн болохгүйгээр хязгаарлав (жижиг дэлгэцэд бүрэн респонсив).
const TABS = [
  { key: 'guide', label: 'Ашиглах заавар' },
  { key: 'changelog', label: 'Хөгжүүлсэн лог' },
  { key: 'copyright', label: 'Зохиогчийн эрх' },
];

export default function AboutProgram() {
  const { isSuperSysAdmin } = useAuth();
  const [tab, setTab] = useState('guide');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const isCopyright = tab === 'copyright';

  async function load() {
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('program_docs').select('*').order('sort_order').order('created_at', { ascending: false })
    );
    setDocs(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const list = docs
    .filter((d) => d.doc_type === tab)
    .sort((a, b) => tab === 'changelog'
      ? new Date(b.created_at) - new Date(a.created_at)
      : (a.sort_order - b.sort_order));

  async function handleDelete(doc) {
    if (!(await confirm(`"${doc.title}" картыг бүрмeсeн устгах уу?`))) return;
    const { error } = await supabase.from('program_docs').delete().eq('id', doc.id);
    if (error) { window.alert(error.message); return; }
    load();
  }

  async function handleTogglePublish(doc) {
    const { error } = await supabase.from('program_docs').update({ is_published: !doc.is_published }).eq('id', doc.id);
    if (error) { window.alert(error.message); return; }
    load();
  }

  return (
    <>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      <div className="max-w-[960px] w-full mx-auto flex flex-col gap-3">
        {isSuperSysAdmin && !isCopyright && (
          <div className="ds-toolbar justify-end">
            <button className="ds-btn-primary" onClick={() => setAdding(true)}>
              + Шинэ {tab === 'guide' ? 'заавар' : 'лог'} нэмэх
            </button>
          </div>
        )}

        {loading && <div className="ds-card p-6 text-center text-[12px] text-mutedtext">Ачаалж байна...</div>}
        {!loading && list.length === 0 && (
          <div className="ds-card p-6 text-center text-[12px] text-mutedtext">
            {tab === 'guide' && 'Заавар хараахан нэмэгдээгүй байна.'}
            {tab === 'changelog' && 'Хөгжүүлсэн лог хараахан нэмэгдээгүй байна.'}
            {tab === 'copyright' && 'Зохиогчийн эрхийн мэдээлэл хараахан нэмэгдээгүй байна.'}
          </div>
        )}

        {list.map((doc) => (
          <div key={doc.id} className={`ds-card p-4 ${doc.is_published === false ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-[14px] font-semibold text-slate-900 dark:text-white">
                  {doc.version_label && <span className="text-customBlue mr-2">{doc.version_label}</span>}
                  {doc.title}
                </div>
                <div className="text-[11px] text-mutedtext mt-0.5">
                  {formatDate(doc.updated_at)}
                  {doc.is_published === false && <span className="ml-2 text-customOrange">(Ноорог — тенант харахгүй)</span>}
                </div>
              </div>
              {isSuperSysAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  {!isCopyright && (
                    <button className="ds-btn-secondary" onClick={() => handleTogglePublish(doc)}>
                      {doc.is_published === false ? 'Нийтлэх' : 'Нуух'}
                    </button>
                  )}
                  <button className="ds-icon-btn" title="Засах" onClick={() => setEditing(doc)}><EditIcon /></button>
                  {!isCopyright && (
                    <button className="ds-icon-btn danger" title="Устгах" onClick={() => handleDelete(doc)}><DeleteIcon /></button>
                  )}
                </div>
              )}
            </div>
            <div
              className="text-[13px] leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-[13.5px] [&_h3]:font-semibold [&_h3]:mt-2.5 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_code]:bg-slate-100 dark:[&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_a]:text-customBlue [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-bordercol [&_blockquote]:pl-3 [&_blockquote]:text-mutedtext"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
            />
          </div>
        ))}
      </div>

      <ProgramDocModal
        key={editing?.id}
        open={!!editing || adding}
        onClose={() => { setEditing(null); setAdding(false); }}
        doc={editing}
        docType={tab}
        onSaved={load}
      />
      <ConfirmDialog />
    </>
  );
}

function ProgramDocModal({ open, onClose, doc, docType, onSaved }) {
  const [title, setTitle] = useState(doc?.title || '');
  const [versionLabel, setVersionLabel] = useState(doc?.version_label || '');
  const [content, setContent] = useState(doc?.content || '');
  const [isPublished, setIsPublished] = useState(doc?.is_published ?? false);

  async function save() {
    if (!title.trim()) { window.alert('Гарчгийг бeглeнe vv.'); return; }
    const payload = {
      doc_type: docType,
      title: title.trim(),
      version_label: docType === 'changelog' ? (versionLabel || null) : null,
      content,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    };
    const { error } = doc
      ? await supabase.from('program_docs').update(payload).eq('id', doc.id)
      : await supabase.from('program_docs').insert(payload);
    if (error) { window.alert(error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={doc ? 'Карт засах' : 'Шинэ карт нэмэх'} size="lg" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="ds-btn-primary" onClick={save}>Хадгалах</button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Гарчиг</label>
            <input className="ds-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {docType === 'changelog' && (
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Хувилбарын дугаар (жиш v3.260814)</label>
              <input className="ds-input w-full" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} />
            </div>
          )}
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Агуулга (Markdown дэмждэг: # Гарчиг, **тод**, - жагсаалт)</label>
          <textarea className="ds-input w-full font-mono text-[12px]" rows={14} value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          <span className="text-[12px] font-medium">Нийтлэх (тенантад харагдана)</span>
        </label>
      </div>
    </Modal>
  );
}
