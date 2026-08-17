import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import PropertyToolbar from '../components/PropertyToolbar';
import UnitGridCard from '../components/UnitGridCard';
import SpotTable from '../components/SpotTable';
import OwnerInfoModal from '../components/OwnerInfoModal';
import EditOwnerModal from '../components/EditOwnerModal';
import ClientInfoModal from '../components/ClientInfoModal';
import EditClientModal from '../components/EditClientModal';

// "Тоот, Зогсоол, Агуулах" (/property) хуудас — Тоот таб: менежерийн
// зорилготой визуал grid (төлбөрийн үлдэгдэлтэй эсэхээр өнгө хувирна,
// өмчлөгчгүй нүүд саарал өнгөтэй). 2026-08-17 (2-р засвар): Тоот таб
// өмнө БУРУУ зөвхөн `owners`-оос л уншиж байсныг олж, `unit_layouts`
// (AddressConfig.jsx-д зохион байгуулсан) ЭХ СУРВАЛЖ болгож зассан.
// Зогсоол/Агуулах таб: Owners.jsx-ийн .ds-table загварыг дахин ашигласан
// хүснэгэл — Owners БОЛОН Clientele (ААН) хоёулангийн зогсоол/агуулахыг
// НИЙЛГЭЖ харуулна.
const TABS = [
  { key: 'household', label: 'Тоот' },
  { key: 'parking', label: 'Зогсоол' },
  { key: 'storage', label: 'Агуулах' },
];

function formatCode(buildingNo, spacer, floor, doorNo) {
  const f = String(floor ?? 0).padStart(2, '0');
  const d = String(doorNo ?? 0).padStart(2, '0');
  return `${buildingNo}${spacer || ''}${f}${d}`;
}

export default function Property() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('household');
  const [search, setSearch] = useState('');
  const [owners, setOwners] = useState([]);
  const [clientele, setClientele] = useState([]);
  const [unitLayouts, setUnitLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [editingOwner, setEditingOwner] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  async function loadAll() {
    setLoading(true);
    const [ownersRes, clienteleRes, layoutsRes] = await Promise.all([
      supabase.from('owners').select('*').eq('tenant_id', hoaId),
      supabase.from('clientele').select('*').eq('tenant_id', hoaId),
      supabase.from('unit_layouts').select('*').eq('tenant_id', hoaId).eq('hidden', false),
    ]);
    setOwners(ownersRes.data ?? []);
    setClientele(clienteleRes.data ?? []);
    setUnitLayouts(layoutsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [hoaId]);

  async function handleSaveOwner(form) {
    if (!editingOwner) return;
    const payload = {
      building_no: form.buildingNo || null,
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
    await loadAll();
  }

  async function handleSaveClient(form) {
    if (!editingClient) return;
    const payload = {
      legal_entity_name: form.legalEntityName || null,
      reg_no: form.regNo || null,
      sqm: form.sqm !== '' ? Number(form.sqm) : null,
      property_no: form.propertyNo || null,
      ceo_first_name_last_name: form.ceoName || null,
      mobile: form.mobile || null,
      phone: form.phone || null,
      email: form.email || null,
      contract_no: form.contractNo || null,
      contract_start: form.contractStart || null,
      contract_end: form.contractEnd || null,
      has_parking: form.hasParking,
      parkings: form.parkings,
      has_storage: form.hasStorage,
      storages: form.storages,
      has_vehicle: form.hasVehicle,
      vehicles: form.vehicles,
      note: form.note || null,
    };
    const { error } = await supabase.from('clientele').update(payload).eq('id', editingClient.id);
    if (error) { window.alert(error.message); return; }
    setEditingClient(null);
    setSelectedClient(null);
    await loadAll();
  }

  const q = search.trim().toLowerCase();

  // Тоот таб — AddressConfig.jsx-д зохион байгуулсан `unit_layouts`-ыг
  // ЭХ СУРВАЛЖ болгоно (өмнө буруу зөвхөн `owners`-оос уншиж байсан
  // алдааг олж зассан). Тоот бүрд тохирох өмчлөгчийг байр/давхар/тоотоор
  // хайж олно — байвал OwnerInfoModal, үгүй бол "бүртгэлгүй" мэдэгдэнэ.
  const householdCells = unitLayouts.map((row, idx) => {
    const owner = owners.find(
      (o) => o.building_no === row.building_no && o.floor === row.floor && o.door_no === row.door_no
    );
    return {
      id: row.id,
      buildingNo: row.building_no,
      floor: row.floor,
      code: formatCode(row.building_no, row.spacer, row.floor, row.door_no),
      area: row.sqm,
      exampleIdx: idx,
      vacant: !owner,
      onClick: () => {
        if (owner) setSelectedOwner(owner);
        else window.alert('Энэ тоотод өмчлөгч бүртгэгдээгүй байна.');
      },
    };
  }).filter((c) => !q || c.code.toLowerCase().includes(q));

  // Зогсоол/Агуулах — Owners БОЛОН Clientele (ААН) хоёулангийн
  // parkings/storages jsonb-ээс НИЙЛГЭЖ мөр үүсгэнэ.
  function spotRows(field) {
    const rows = [];
    owners.forEach((o) => {
      (o[field] || []).forEach((sp, i) => {
        const ownerName = `${o.firstname || ''} ${o.lastname || ''}`.trim();
        const location = `${sp.floor}-${sp.no}`;
        if (q && !location.toLowerCase().includes(q) && !ownerName.toLowerCase().includes(q)) return;
        rows.push({
          id: `o-${o.id}-${field}-${i}`,
          buildingNo: o.building_no,
          location,
          ownerName,
          phone: o.phones?.[0] || '',
          onClick: () => setSelectedOwner(o),
        });
      });
    });
    clientele.forEach((c) => {
      (c[field] || []).forEach((sp, i) => {
        const ownerName = c.legal_entity_name || '';
        const location = `${sp.floor}-${sp.no}`;
        if (q && !location.toLowerCase().includes(q) && !ownerName.toLowerCase().includes(q)) return;
        rows.push({
          id: `c-${c.id}-${field}-${i}`,
          buildingNo: null,
          location,
          ownerName,
          phone: c.mobile || c.phone || '',
          onClick: () => setSelectedClient(c),
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
        hoaId={hoaId}
      />

      <ClientInfoModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onEdit={(client) => { setEditingClient(client); setSelectedClient(null); }}
      />
      <EditClientModal
        key={editingClient?.id}
        open={!!editingClient}
        onClose={() => setEditingClient(null)}
        client={editingClient}
        onSave={handleSaveClient}
      />
    </>
  );
}
