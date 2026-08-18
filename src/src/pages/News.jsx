import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { extractYoutubeId } from '../lib/newsFormat';
import NewsToolbar from '../components/NewsToolbar';
import TabButton from '../components/TabButton';
import News from '../components/News';
import NewsAggregateTable from '../components/NewsAggregateTable';
import NewsFormModal from '../components/NewsFormModal';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';

// "Мэдээ, мэдээлэл" (/news) — 2 таб: Нийтлэгдсэн мэдээ / Мэдээний
// агрегат. Сууц вмчлвгч гар утасны аппаараа vзэх тул responsive
// (нэг багана, mobile/desktop ижил). Мэдээний жагсаалт mobile vед бvтэн
// өргөн, desktop vед макс 720px (2026-08-19).
//
// 2026-08-19: Supabase `news` хvснэгэлтэй холбогдов (migration 0014).
// ⚠️ Зураг/PDF хараахан Supabase Storage-д бодитоор upload хийхгvй
// (NewsFormModal-ийн file input-ууд одоогоор зvвхvн файлын нэрийг л
// орон нутгийн state-д хадгална, DB-рvv бичихгvй) — энэ хэсэг TODO.
const TABS = [
  { key: 'published', label: 'Нийтлэгдсэн мэдээ' },
  { key: 'aggregate', label: 'Мэдээний агрегат' },
];

function toCardProps(row) {
  const badges = [];
  if (row.featured) badges.push('онцлох');
  if (row.urgent) badges.push('шуурхай');
  const videoId = extractYoutubeId(row.video_url);
  let media = null;
  if (videoId) {
    media = { type: 'youtube', videoId };
  } else if (row.images?.length) {
    media = { type: 'album', images: row.images.slice(0, 2), extraCount: Math.max(0, row.images.length - 2) };
  }
  return {
    id: row.id,
    badges,
    datetime: row.created_at,
    category: row.category,
    viewCount: row.view_count,
    title: row.title,
    bodyText: row.body_text,
    media,
  };
}

function toTableRow(row) {
  return {
    id: row.id,
    datetime: row.created_at,
    category: row.category,
    title: row.title,
    status: row.status,
    featured: row.featured,
    urgent: row.urgent,
    isPublic: row.is_public,
  };
}

export default function NewsPage() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('published');
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNews, setEditingNews] = useState(null);
  const [creating, setCreating] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const { alert, AlertDialog } = useAlert();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllRows(() => supabase.from('news').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false })).then(
      ({ data, error }) => {
        if (cancelled) return;
        if (error) { alert(error.message); setLoading(false); return; }
        setRows(data ?? []);
        setLoading(false);
      }
    );
    return () => { cancelled = true; };
  }, [hoaId]);

  const publishedRows = rows.filter((r) => r.status === 'published');
  const items = publishedRows.filter((r) => !category || r.category === category).map(toCardProps);
  const aggregateRows = rows.filter((r) => !category || r.category === category).map(toTableRow);

  async function handleToggleStatus(tableRow) {
    const newStatus = tableRow.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('news').update({ status: newStatus }).eq('id', tableRow.id);
    if (error) { alert(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === tableRow.id ? { ...r, status: newStatus } : r)));
  }

  async function handleDelete(tableRow) {
    if (!(await confirm(`"${tableRow.title}" мэдээг устгах уу?`))) return;
    const { error } = await supabase.from('news').delete().eq('id', tableRow.id);
    if (error) { alert(error.message); return; }
    setRows((rs) => rs.filter((r) => r.id !== tableRow.id));
  }

  function openEdit(tableRow) {
    const fullRow = rows.find((r) => r.id === tableRow.id);
    setEditingNews(fullRow || null);
  }

  async function upsertRow(form, status) {
    const payload = {
      tenant_id: hoaId,
      title: form.title,
      category: form.category,
      body_text: form.bodyText,
      video_url: form.videoUrl || null,
      is_public: form.isPublic,
      featured: form.featured,
      urgent: form.urgent,
      status,
      updated_at: new Date().toISOString(),
    };
    if (editingNews) {
      const { data, error } = await supabase.from('news').update(payload).eq('id', editingNews.id).select().single();
      if (error) { alert(error.message); return; }
      setRows((rs) => rs.map((r) => (r.id === editingNews.id ? data : r)));
    } else {
      const { data, error } = await supabase.from('news').insert(payload).select().single();
      if (error) { alert(error.message); return; }
      setRows((rs) => [data, ...rs]);
    }
    setEditingNews(null);
    setCreating(false);
  }

  const modalNewsProp = useMemo(() => (
    editingNews
      ? {
          title: editingNews.title,
          category: editingNews.category,
          bodyText: editingNews.body_text,
          videoUrl: editingNews.video_url,
          isPublic: editingNews.is_public,
          featured: editingNews.featured,
          urgent: editingNews.urgent,
        }
      : null
  ), [editingNews]);

  return (
    <>
      <NewsToolbar
        category={category}
        onCategoryChange={setCategory}
        onCreateClick={tab === 'aggregate' ? () => setCreating(true) : undefined}
      />

      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'published' && (
        <div className="flex flex-col gap-2.5 w-full max-w-[720px] mx-auto">
          {loading && <div className="ds-card p-8 text-center text-darktext text-sm">Ачаалж байна...</div>}
          {!loading && items.length === 0 && (
            <div className="ds-card p-8 text-center text-darktext text-sm">Нийтлэгдсэн мэдээ алга</div>
          )}
          {items.map((n) => (
            <News key={n.id} {...n} />
          ))}
        </div>
      )}

      {tab === 'aggregate' && (
        <NewsAggregateTable
          rows={aggregateRows}
          loading={loading}
          onRowClick={openEdit}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      )}

      <NewsFormModal
        open={creating || !!editingNews}
        onClose={() => { setCreating(false); setEditingNews(null); }}
        news={modalNewsProp}
        onSaveDraft={(form) => upsertRow(form, 'draft')}
        onPublish={(form) => upsertRow(form, 'published')}
      />

      <ConfirmDialog />
      <AlertDialog />
    </>
  );
}
