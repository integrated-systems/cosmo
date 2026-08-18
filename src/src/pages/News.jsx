import { useState } from 'react';
import NewsToolbar from '../components/NewsToolbar';
import TabButton from '../components/TabButton';
import News from '../components/News';

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
];

export default function NewsPage() {
  const [tab, setTab] = useState('published');
  const [category, setCategory] = useState('');

  const items = EXAMPLE_DATA.filter((n) => !category || n.category === category);

  return (
    <>
      <NewsToolbar category={category} onCategoryChange={setCategory} />

      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'published' && (
        <div className="flex flex-col gap-2.5 w-full max-w-[720px]">
          {items.map((n) => (
            <News key={n.id} {...n} />
          ))}
        </div>
      )}

      {tab === 'aggregate' && (
        <div className="ds-card p-8 text-center text-mutedtext text-sm">Тун удахгvй...</div>
      )}
    </>
  );
}
