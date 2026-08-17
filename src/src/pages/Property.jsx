import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import PropertyToolbar from '../components/PropertyToolbar';
import UnitGridCard from '../components/UnitGridCard';
import SpotTable from '../components/SpotTable';
import OwnerInfoModal from '../components/OwnerInfoModal';
import EditOwnerModal from '../components/EditOwnerModal';

// "Үл хөдлөх бүртгэл" (/property) хуудас — Тоот таб: менежерийн зорилготой
// визуал grid (төлбөрийн үлдэгдэлтэй эсэхээр өнгө хувирна). Зогсоол/
// Агуулах таб: Owners.jsx-ийн .ds-table загварыг дахин ашигласан
// хүснэгэл (grid БИШ). "Талбай" таб 2026-08-17 хэрэглэгчийн заасны дагуу
// арилгасан — "Талбай өмчлөгч бүртгэл" (/clientele) хуудас хүрэлцээтэй.
//
// TODO: одоохондоо зөвхөн БОДИТ бүртгэлтэй (өмчлөгчтэй) нүүдтэй л
// харуулна — бүтэн байрны зохион байгуулалт "Хаягжилт тохиргоо"
// (ирээдүйд бүтээгдэх СИСАДМИН хуудас)-аас хамаарна.
const TABS = [
  { key: 'household', label: 'Тоот' },
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
  const [editingOwner, setEditingOwner] = useState(null);

  async function loadOwners() {
    setLoading(true);
    const { data } = await supabase.from('owners').select('*').eq('tenant_id', hoaId);
    setOwners(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOwners();
  }, [hoaId]);

  async function handleSaveOwner(form) {
    if (!editingOwner) return;
    const payload = {
      building_no: form.buildingNo ? Number(form.buildingNo) : null,
      floor: form.floor !== '' ? Number(form.floor) : null,
      door_no: form.doorNo !== '' ? Number(form.doorNo) : null,
      sqm: form.sqm !== '' ? Number(form.sqm) : null,
      firstname: form.firstname || null,
      lastname: form.lastname || null,
      regno: form.regno || null,
      own_date: form.ownDate || null,
      property_no: form.propertyNo || null,
      phones: form.phones.filter(Boolean),
      emails: form.emails.filter(Boolean),
      people_count: form.people !== '' ? Number(form.people) : null,
      child_0_5: form.child1 !== '' ? Number(form.child1) : 0,
      child_6_18: form.child2 !== '' ? Number(form.child2) : 0,
      has_storage: form.hasStorage,
      storages: form.storages,
      has_parking: form.hasParking,
      parkings: form.parkings,
      has_vehicle: form.hasVehicle,
      vehicles: form.vehicles,
      note: form.note || null,
    };
    const { error } = await supabase.from('owners').update(payload).eq('id', editingOwner.id);
    if (error) { window.alert(error.message); return; }
    setEditingOwner(null);
    setSelectedOwner(null);
    await loadOwners();
  }

  const q = search.trim().toLowerCase();

  const householdCells = owners
    .filter((o) => o.building_no && o.floor != null && o.door_no != null)
    .map((o, idx) => ({
      id: o.id,
      buildingNo: o.building_no,
      floor: o.floor,
      code: formatCode(o.building_no, o.floor, o.door_no),
      area: o.sqm,
      exampleIdx: idx,
      onClick: () => setSelectedOwner(o),
    }))
    .filter((c) => !q || c.code.toLowerCase().includes(q));

  function spotRows(field, locationPrefix) {
    const rows = [];
    owners.forEach((o) => {
      (o[field] || []).forEach((sp, i) => {
        const ownerName = `${o.firstname || ''} ${o.lastname || ''}`.trim();
        const location = `${sp.floor}-${sp.no}`;
        if (q && !location.toLowerCase().includes(q) && !ownerName.toLowerCase().includes(q)) return;
        rows.push({
          id: `${o.id}-${field}-${i}`,
          buildingNo: o.building_no,
          location,
          ownerName,
          phone: o.phones?.[0] || '',
          onClick: () => setSelectedOwner(o),
        });
      });
    });
    return rows;
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
          {tab === 'parking' && <SpotTable rows={spotRows('parkings')} />}
          {tab === 'storage' && <SpotTable rows={spotRows('storages')} />}
        </>
      )}

      <OwnerInfoModal
        owner={selectedOwner}
        onClose={() => setSelectedOwner(null)}
        onEdit={(owner) => { setEditingOwner(owner); setSelectedOwner(null); }}
      />

      <EditOwnerModal
        key={editingOwner?.id}
        open={!!editingOwner}
        onClose={() => setEditingOwner(null)}
        owner={editingOwner}
        onSave={handleSaveOwner}
      />
    </>
  );
}
