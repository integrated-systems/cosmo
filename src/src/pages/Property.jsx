import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import PropertyToolbar from '../components/PropertyToolbar';
import UnitGridCard from '../components/UnitGridCard';
import OwnerInfoModal from '../components/OwnerInfoModal';

// "Үл хөдлөх бүртгэл" (/property) хуудас — 2026-08-17 хэрэглэгчийн
// заасны дагуу: Түүлбэр+4 таб (Тоот/Талбай/Зогсоол/Агуулах)+
// байр→давхар→тоот grid карт. Тоот дээр дарахад "Сууц өмчлөгч бүртгэл"-
// ийн ЯГ ТЭР Инфо модалийг (OwnerInfoModal) дахин ашиглаж нээнэ.
//
// TODO: "Талбай" таб — Clientele хүснэгэлд байр/давхрын мэдээлэл (тухайн
// хуудсыг холбогдох боломж) нэмэгдэх хүртэл хойшлогдов (хэрэглэгчтэй
// тохиролцох шаардлагатай).
// TODO: одоохондоо зөвхөн БОДИТ бүртгэлтэй (өмчлөгчтэй) нүүдтэй л
// харуулна — бүтэн байрны зохион байгуулалт "Хаягжилт тохиргоо"
// (ирээдүйд бүтээгдэх СИСАДМИН хуудас)-аас хамаарна.
const TABS = [
  { key: 'household', label: 'Тоот' },
  { key: 'commercial', label: 'Талбай' },
  { key: 'parking', label: 'Зогсоол' },
  { key: 'storage', label: 'Агуулах' },
];

function formatCode(buildingNo, floor, doorNo) {
  const f = String(floor ?? 0).padStart(2, '0');
  const d = String(doorNo ?? 0).padStart(2, '0');
  return `${buildingNo}${f}${d}`;
}

export default function Property() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('household');
  const [search, setSearch] = useState('');
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('owners')
      .select('*')
      .eq('tenant_id', hoaId)
      .then(({ data }) => {
        setOwners(data ?? []);
        setLoading(false);
      });
  }, [hoaId]);

  const q = search.trim().toLowerCase();

  const householdCells = owners
    .filter((o) => o.building_no && o.floor != null && o.door_no != null)
    .map((o) => ({
      id: o.id,
      buildingNo: o.building_no,
      floor: o.floor,
      code: formatCode(o.building_no, o.floor, o.door_no),
      sublabel: `${o.firstname || ''} ${o.lastname || ''}`.trim(),
      onClick: () => setSelectedOwner(o),
    }))
    .filter((c) => !q || c.code.toLowerCase().includes(q) || c.sublabel.toLowerCase().includes(q));

  function spotCells(field) {
    const cells = [];
    owners.forEach((o) => {
      (o[field] || []).forEach((sp, i) => {
        const sublabel = `${o.firstname || ''} ${o.lastname || ''}`.trim();
        const code = `${sp.floor}-${sp.no}`;
        if (q && !code.toLowerCase().includes(q) && !sublabel.toLowerCase().includes(q)) return;
        cells.push({
          id: `${o.id}-${field}-${i}`,
          buildingNo: o.building_no || 0,
          floor: sp.floor || '—',
          code,
          sublabel,
          onClick: () => setSelectedOwner(o),
        });
      });
    });
    return cells;
  }

  return (
    <>
      <PropertyToolbar search={search} onSearchChange={setSearch} />

      <div className="flex gap-1 mb-3 border-b border-bordercol">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-slate-900 dark:text-white'
                : 'border-transparent text-mutedtext hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ds-card p-8 text-center text-darktext text-sm">Ачаалж байна...</div>
      ) : (
        <>
          {tab === 'household' && (
            <UnitGridCard cells={householdCells} hint="Байр сонгоод тоот дээр дарж дэлгэрэнгүй харах" />
          )}
          {tab === 'commercial' && (
            <div className="ds-card p-6 text-center text-slate-500 dark:text-mutedtext text-sm">
              "Талбай" таб тохируулагдаагүй байна — Аж ахуйн нэгжийн бүртгэлд байр/давхрын мэдээлэл нэмэгдсэний дараа идэвхжинэ.
            </div>
          )}
          {tab === 'parking' && (
            <UnitGridCard cells={spotCells('parkings')} hint="Байр сонгоод зогсоолын байршлыг харах" />
          )}
          {tab === 'storage' && (
            <UnitGridCard cells={spotCells('storages')} hint="Байр сонгоод агуулахын байршлыг харах" />
          )}
        </>
      )}

      <OwnerInfoModal
        owner={selectedOwner}
        onClose={() => setSelectedOwner(null)}
        onEdit={() => {}}
      />
    </>
  );
}
