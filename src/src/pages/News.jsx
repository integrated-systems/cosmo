import { useState } from 'react';
import NewsToolbar from '../components/NewsToolbar';
import TabButton from '../components/TabButton';
import News from '../components/News';
import NewsAggregateTable from '../components/NewsAggregateTable';
import NewsFormModal from '../components/NewsFormModal';
import { useConfirm } from '../hooks/useConfirm';

// "Мэдээ, мэдээлэл" (/news) — 2 таб: Нийтлэгдсэн мэдээ / Мэдээний
// агрегат. Сууц вмчлвгч гар утасны аппаараа vзэх тул responsive
// (нэг багана, mobile/desktop ижил — 2 баганатай масон grid БИШ, зурган
// жишээн дэх хажуу зэрэгцvvлэлт нь зvвхvн 2 тvvврийг зэрэг харуулах
// зорилготой байсан гэдгийг 2026-08-19 хэрэглэгч тодруулсан). Мэдээний
// жагсаалт mobile vед бvтэн өргөн, desktop vед макс 720px (2026-08-19).
//
// TODO: backend (Supabase `news` хvснэгэл) хараахан vvсээгvй тул
// доорхи EXAMPLE_DATA нь зvвхvн дизайны жишээ — бодит tenant-д
// автоматаар ашиглагдахгvй (техникийн баримт бичгийн дvрэм 6).
const TABS = [
  { key: 'published', label: 'Нийтлэгдсэн мэдээ' },
  { key: 'aggregate', label: 'Мэдээний агрегат' },
];

const EXAMPLE_DATA = [
  {
    id: 1,
    badges: [],
    datetime: '2026-08-10T20:38:39',
    category: 'Мэдээ',
    viewCount: 3,
    title: 'Гал тогооны тоног твхввргvvмж шинэчлэгдлээ',
    bodyText: 'Нийтийн талбайн гал тогооны тоног твхввргvvмжийг шинэчлэн тавьлаа.',
    media: { type: 'album', images: ['https://picsum.photos/seed/cosmo-news-1/800/600'], extraCount: 0 },
  },
  {
    id: 2,
    badges: ['шуурхай', 'онцлох'],
    datetime: '2026-07-26T12:11:08',
    category: 'Мэдээ',
    viewCount: 15,
    title: 'Гэрээт байгууллагуудын vйлчилгээний хугацаа сунгагдлаа',
    bodyText:
      'Тус СvХ-ны дотоод vйл ажиллагаагаа гишvvддээ нээлттэй, ил тод, шилэн болгох, сууц вмчлвгч болон харилцагч аж ахуйн нэгжvvдийн бvртгэлийг сайжруулах, vндсэн хврвнгийн бvртгэлийг хийх, Бvх гишvvдийн хурлын тайлан хэлэлцvvлэг, сонгуулийг цахимаар ил тод хийх, санал асуулга внгvvлэх, санхvv болон удирдлагын дотоод тайланг гаргах, нягтлан бодох бvртгэлийг ОУ-ын стандартад нийцvvлэх зорилготой.',
    media: {
      type: 'album',
      images: ['https://picsum.photos/seed/cosmo-news-2a/800/600', 'https://picsum.photos/seed/cosmo-news-2b/800/600'],
      extraCount: 4,
    },
  },
  {
    id: 3,
    badges: [],
    datetime: '2026-07-29T03:34:09',
    category: 'Мэдээ',
    viewCount: 11,
    title: 'Тайлбар бичлэг',
    bodyText: '',
    media: { type: 'youtube', videoId: 'aqz-KE-bpKQ' },
  },
  {
    id: 4,
    badges: ['онцлох'],
    datetime: '2026-07-01T12:01:11',
    category: 'Явцын тайлан',
    viewCount: 15,
    title: 'СвХ-ны 6-р сарын мвнгвн хврвнгийн гvйцэтгэлийн тайлан',
    bodyText:
      'Вдгвв vед дэлхийн бvхий л улс орнуудад маш олон санхvvгийн онлайн, офлайн горимд ажилладаг программууд байдаг ч Microsoft Excel дээр бvртгэлээ хвтэлдэг нягтлангууд олон байдаг. Учир нь 1-2 нягтлантай зарим жижиг байгууллагуудад Excel дээр бvртгэлээ хвтэлсэн нь олон давуу талтай байдаг.',
    media: null,
  },
  {
    id: 5,
    badges: [],
    datetime: '2026-06-15T09:12:00',
    category: 'Мэдээ',
    viewCount: 27,
    title: 'Дулааны улирлын шилжилтийн ажлын тайлан',
    // Олон параграфтай жишээ (expanded vед '\n\n'-ээр тусдаа параграф
    // болж, justify-ээр харагдана — 2026-08-19 хэрэглэгчийн хvсэлт).
    bodyText:
      'Хотхоны дулааны улирлын шилжилтийн ажил төлөвлөгөөний дагуу амжилттай дуусгагдлаа. Инженерийн байгууллагатай хамтран бvх байрны дулаан дамжуулах хоолойн даралт шалгалтыг явуулж, зарим байранд илэрсэн жижиг цоорхойг засварласан болно.\n\n' +
      'Мвн энэ хугацаанд лифтний жилийн vзлэгийг мэргэжлийн байгууллагаар хийлгэж, аюулгvй ажиллагааны гэрчилгээг шинэчлэв. Гишvvдээс ирvvлсэн санал хvсэлтийн дагуу нийтийн эзэмшлийн зарим хэсгийн гэрэлтvvлгийг мвн сэлбэлээ.\n\n' +
      'Цаашид vргэлжлvvлэн явагдах ажлуудын талаар дараагийн Удирдах зввлвлийн хурлаар дэлгэрэнгvй мэдээлэл вгvvлэх болно. Гишvvд асуулт, санал хvсэлтээ CC center-т vvсгvvлж болно.',
    media: null,
  },
];

// "Мэдээний агрегат" (2-р таб) таблицын жишээ мвр — TODO: backend
// (Supabase `news` хvснэгэл) хараахан vvсээгvй тул зvвхvн дизайны жишээ.
const EXAMPLE_AGGREGATE_ROWS = [
  { id: 1, datetime: '2026-08-10T20:38:39', category: 'Мэдээ', title: 'Гал тогооны тоног твхввргvvмж шинэчлэгдлээ', status: 'published', featured: false, urgent: false, isPublic: false },
  { id: 2, datetime: '2026-07-26T12:11:08', category: 'Мэдээ', title: 'Гэрээт байгууллагуудын vйлчилгээний хугацаа сунгагдлаа', status: 'published', featured: true, urgent: true, isPublic: false },
  { id: 3, datetime: '2026-07-29T03:34:09', category: 'Мэдээ', title: 'Тайлбар бичлэг', status: 'published', featured: false, urgent: false, isPublic: false },
  { id: 4, datetime: '2026-07-01T12:01:11', category: 'Явцын тайлан', title: 'СвХ-ны 6-р сарын мвнгвн хврвнгийн гvйцэтгэлийн тайлан', status: 'published', featured: true, urgent: false, isPublic: true },
  { id: 5, datetime: '2026-06-15T09:12:00', category: 'Мэдээ', title: 'Дулааны улирлын шилжилтийн ажлын тайлан', status: 'published', featured: false, urgent: false, isPublic: false },
  { id: 6, datetime: '2026-06-29T03:35:32', category: 'Ажлын зар', title: 'Сонгон шалгаруулалтад урьж байна', status: 'draft', featured: false, urgent: true, isPublic: false },
];

export default function NewsPage() {
  const [tab, setTab] = useState('published');
  const [category, setCategory] = useState('');
  const [aggregateRows, setAggregateRows] = useState(EXAMPLE_AGGREGATE_ROWS);
  const [editingNews, setEditingNews] = useState(null);
  const [creating, setCreating] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const items = EXAMPLE_DATA.filter((n) => !category || n.category === category);
  const filteredAggregateRows = aggregateRows.filter((r) => !category || r.category === category);

  function handleToggleStatus(row) {
    setAggregateRows((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, status: r.status === 'published' ? 'draft' : 'published' } : r))
    );
  }

  async function handleDelete(row) {
    if (!(await confirm(`"${row.title}" мэдээг устгах уу?`))) return;
    setAggregateRows((rows) => rows.filter((r) => r.id !== row.id));
  }

  // TODO: backend (Supabase `news` хvснэгэл) хараахан vvсээгvй тул
  // Ноорог хадгалах/Нийтлэх зvвхvн ЛОКАЛ state-ийг шинэчилнэ.
  function handleSaveDraft(form) {
    upsertRow(form, 'draft');
    setEditingNews(null);
    setCreating(false);
  }

  function handlePublish(form) {
    upsertRow(form, 'published');
    setEditingNews(null);
    setCreating(false);
  }

  function upsertRow(form, status) {
    if (editingNews) {
      setAggregateRows((rows) =>
        rows.map((r) => (r.id === editingNews.id ? { ...r, ...form, status } : r))
      );
    } else {
      setAggregateRows((rows) => [
        { id: Date.now(), datetime: new Date().toISOString(), ...form, status },
        ...rows,
      ]);
    }
  }

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
          {items.map((n) => (
            <News key={n.id} {...n} />
          ))}
        </div>
      )}

      {tab === 'aggregate' && (
        <NewsAggregateTable
          rows={filteredAggregateRows}
          onRowClick={setEditingNews}
          onEdit={setEditingNews}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      )}

      <NewsFormModal
        open={creating || !!editingNews}
        onClose={() => { setCreating(false); setEditingNews(null); }}
        news={editingNews}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />

      <ConfirmDialog />
    </>
  );
}
