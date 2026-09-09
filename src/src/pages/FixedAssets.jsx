import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney, formatDate, formatDateTimeMinutes } from '../lib/format';
import { DEPRECIATION_METHODS } from '../lib/fixedAssetsFormat';
import { useAccessRules } from '../hooks/useAccessRules';
import { useConfirm } from '../hooks/useConfirm';
import { useDepreciationPostings } from '../hooks/useDepreciationPostings';
import { useAssetRepairs } from '../hooks/useAssetRepairs';
import { useInventoryCount } from '../hooks/useInventoryCount';
import { buildLabelPngBlob, shareOrDownloadLabel, buildAssetDeepLink } from '../lib/labelPrint';
import TabButton from '../components/TabButton';
import FixedAssetsToolbar from '../components/FixedAssetsToolbar';
import FixedAssetsTable from '../components/FixedAssetsTable';
import EditFixedAssetModal from '../components/EditFixedAssetModal';
import AssetInfoModal from '../components/AssetInfoModal';
import WriteOffAssetModal from '../components/WriteOffAssetModal';
import RepairModal from '../components/RepairModal';

// "Үндсэн хөрөнгө бүртгэл" (/fixedassets) — "Удирдах зөвлөл портал"
// бүлэг. 2026-09-07 хэрэглэгчийн хуучин "suh" прототипийн зурган
// жишээгээр өгсөн бүтэц дээр үндэслэв, гэхдээ Cosmo-ийн бодит дизайн/
// компонент/Supabase backend-тэй (fixed_assets хүснэгэл). Хуучин
// хувилбарт байгаагүй ШИНЭ элемент болох тойм статистик картыг
// Invoice.jsx-ийн grid-cols-4 загвараар зохиов.
// 2026-09-07 (2): хэрэглэгчийн засварласан дараалал — Toolbar → Тойм
// карт → Таб → Хүснэгэл. Хүснэгэл дэх "НИЙТ" мвр болон доод нийлбэр
// footer-ыг тойм картын мэдээлэлтэй давхцаж байсан тул бүрэн устгав
// (FixedAssetsTable.jsx харна уу).
//
// "Элэгдэл" ба "Засвар" таб (хуучин хувилбарт байсан ч энэ даалгаварт
// дэлгэрэнгүй заагаагүй) ParkingPage.jsx-ийн "Түр нэвтэрсэн машин"
// таб шиг placeholder хэлбэрээр орлоо — дараа тусад нь тодорхой
// хэрэгцээгээр бүтээнэ.
//
// 2026-09-07 (3): Модалийг "suh" прототипийн зурган жишээгээр бүрэн
// дахин зохиосны дагуу (EditFixedAssetModal.jsx) — ТӨРӨЛ/БАЙРШИЛ одоо
// FixedAssetConfig.jsx-ийн лавлах хүснэгэлүүд рүү FK-аар холбогдоно
// (category_id/type_id/location_id), тул жагсаалт/шүүлтүүр/хүснэгэл
// эдгээрийг join-оор (category:..., type:..., location:...) татаж
// нэрээр нь харуулна. accumulated_depreciation багана одоогоор 0
// хэвээр үлдэнэ — тогтмол/автомат бичилтийн логикийг хэрэглэгч
// дараагийн промптоор тодорхойлно.
//
// 2026-09-07 (5): Хүснэгэлийн НЭР баганан дээр дарахад AssetInfoModal
// (зөвхөн унших мэдээллийн карт) нээгдэнэ — QR-аар (?asset=barcode)
// орж ирэхэд ч мөн ижил модаль автоматаар нээгдэнэ.
// 2026-09-07 (5): QR код нэмэв (CODE128-ыг ердийн камер уншдаггүй байсан
// тул) — QR нь тухайн хөрөнгийн Инфо мэдээллийн карт (AssetInfoModal)
// руу шууд орох deep-link URL агуулна. Хүснэгэлийн мвр дээр дарахад
// мөн адил Инфо карт нээгдэнэ (Засах модальтай ялгаатай — зөвхөн унших).
// URL-ийн ?asset={barcode} query param-ыг уншиж QR-ээр орж ирсэн үед
// автоматаар нээнэ.
//
// 2026-09-08: Хэрэглэгчийн заасны дагуу таб бүр дараах ДАРААЛЛААР
// (Toolbar → Таб товч → Статистик карт → Хүснэгэл) харагдана — Toolbar
// болон Статистик карт хэсэг таб бүрд ОНЦЛОГ агуулгатай (List/
// Депрециаци/Засвар үйлчилгээ тус бүр өөрийн Toolbar+4 карттай).
// useDepreciationPostings/useAssetRepairs hook-үүдийг ЭНД (тухайн
// таб идэвхтэй эсэхээс үл хамааран) дуудна — React Hooks дүрмийн
// дагуу нөхцөлт биш байх ёстой тул.
const TABS = [
  { key: 'list', label: 'Үндсэн хөрөнгийн жагсаалт' },
  { key: 'depreciation', label: 'Хуримтлагдсан элэгдэл' },
  { key: 'repair', label: 'Засвар, үйлчилгээ' },
  { key: 'inventory', label: 'Тооллого' },
];

export default function FixedAssets() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useAccessRules(hoaId);
  const { confirm, ConfirmDialog } = useConfirm();

  const [tab, setTab] = useState('list');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [writingOff, setWritingOff] = useState(null);
  const [addingRepair, setAddingRepair] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [inventorySubTab, setInventorySubTab] = useState('active');
  const [viewingHistoryCountId, setViewingHistoryCountId] = useState(null);

  const depreciation = useDepreciationPostings(hoaId);
  const repairs = useAssetRepairs(hoaId);
  const inventory = useInventoryCount(hoaId);

  const [responsiblePerson, setResponsiblePerson] = useState('all');
  const [location, setLocation] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!hoaId) return;
    // 2026-09-07 (7): Шошгон дээрх 1-р мвр нь tenants.name биш,
    // "Санхүүгийн тохиргоо → НББ → Тайланд дуудагдах мэдээлэл →
    // Байгууллагын мэдээлэл" картны бүтэн албан нэрийг (org_name)
    // ашиглана — хэрэглэгчийн зурган жишээгээр.
    supabase.from('org_report_info').select('org_name').eq('tenant_id', hoaId).single().then(({ data }) => {
      if (data) setOrgName(data.org_name);
    });
  }, [hoaId]);

  async function loadAssets() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await fetchAllRows(() =>
      supabase.from('fixed_assets')
        .select('*, category:fixed_asset_categories(id, name), type:fixed_asset_types(id, name, is_depreciable), location:fixed_asset_locations(id, name), responsible_position:job_positions(id, name)')
        .eq('tenant_id', hoaId)
        .order('created_at', { ascending: false })
    );
    if (error) {
      setLoadError(error.message);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  // QR-аар (?asset=barcode) орж ирсэн үед тухайн хөрөнгийг тусад нь
  // (жагсаалт дуусаагүй байсан ч) шууд татаж Инфо картыг нээнэ.
  useEffect(() => {
    const barcode = searchParams.get('asset');
    if (!barcode || !hoaId) return;
    supabase.from('fixed_assets')
      .select('*, category:fixed_asset_categories(id, name), type:fixed_asset_types(id, name, is_depreciable), location:fixed_asset_locations(id, name), responsible_position:job_positions(id, name)')
      .eq('tenant_id', hoaId)
      .eq('barcode', barcode)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { window.alert(error.message); return; }
        if (data) setViewing(data);
        else window.alert('Энэ баркодтой хөрөнгө олдсонгүй.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId]);

  const responsibleOptions = useMemo(
    () => {
      const seen = new Map();
      rows.forEach((r) => { if (r.responsible_position) seen.set(r.responsible_position.id, r.responsible_position.name); });
      return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    },
    [rows]
  );
  const locationOptions = useMemo(
    () => {
      const seen = new Map();
      rows.forEach((r) => { if (r.location) seen.set(r.location.id, r.location.name); });
      return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    },
    [rows]
  );

  const q = search.trim().toLowerCase();
  const filteredRows = rows.filter((r) => {
    if (responsiblePerson !== 'all' && r.responsible_position_id !== responsiblePerson) return false;
    if (location !== 'all' && r.location_id !== location) return false;
    if (statusFilter !== 'all') {
      const isUnderRepair = repairs.activeRepairAssetIds.has(r.id) && r.status !== 'written_off';
      if (statusFilter === 'repair' && !isUnderRepair) return false;
      if (statusFilter === 'in_use' && (r.status !== 'in_use' || isUnderRepair)) return false;
      if (statusFilter === 'written_off' && r.status !== 'written_off') return false;
    }
    if (q) {
      const hay = `${r.name} ${r.barcode} ${r.mark_serial || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // "Хуримтлагдсан элэгдэл" таб-ын Хариуцагч/Байршил/Хайх шүүлтүүр —
  // "Үндсэн хөрөнгийн жагсаалт" таб-тай ИЖИЛ state (responsiblePerson/
  // location/search) ашиглана.
  const filteredPostings = depreciation.postings.filter((p) => {
    const asset = p.asset;
    if (responsiblePerson !== 'all' && asset?.responsible_position_id !== responsiblePerson) return false;
    if (location !== 'all' && asset?.location_id !== location) return false;
    if (q) {
      const hay = `${asset?.name || ''} ${asset?.barcode || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // "Тооллого" таб-ын Төлөв/Хариуцагч/Байршил/Хайх шүүлтүүр — Үндсэн
  // хөрөнгийн жагсаалт таб-тай ИЖИЛ state ашиглана.
  const filteredInventoryItems = inventory.items.filter((item) => {
    const asset = item.asset;
    if (responsiblePerson !== 'all' && asset?.responsible_position_id !== responsiblePerson) return false;
    if (location !== 'all' && asset?.location_id !== location) return false;
    if (statusFilter !== 'all') {
      const isUnderRepair = repairs.activeRepairAssetIds.has(asset?.id) && asset?.status !== 'written_off';
      if (statusFilter === 'repair' && !isUnderRepair) return false;
      if (statusFilter === 'in_use' && (asset?.status !== 'in_use' || isUnderRepair)) return false;
      if (statusFilter === 'written_off' && asset?.status !== 'written_off') return false;
    }
    if (q) {
      const hay = `${asset?.name || ''} ${asset?.barcode || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const summary = useMemo(() => {
    const purchaseTotal = rows.reduce((s, r) => s + (Number(r.purchase_price) || 0), 0);
    const bookValueTotal = rows.reduce((s, r) => s + (Number(r.book_value) || 0), 0);
    const inUseCount = rows.filter((r) => r.status === 'in_use').length;
    const writtenOffCount = rows.filter((r) => r.status === 'written_off').length;
    return { count: rows.length, purchaseTotal, bookValueTotal, inUseCount, writtenOffCount };
  }, [rows]);

  async function handleSave(form) {
    const payload = {
      tenant_id: hoaId,
      barcode: form.barcode.trim(),
      name: form.name.trim(),
      mark_serial: form.markSerial || null,
      category_id: form.categoryId || null,
      type_id: form.typeId || null,
      acquired_date: form.acquiredDate || null,
      purchase_price: form.purchasePrice !== '' ? Number(form.purchasePrice) : 0,
      seller_org: form.sellerOrg || null,
      location_id: form.locationId || null,
      responsible_position_id: form.responsiblePositionId || null,
      note: form.note || null,
      useful_life_months: form.isDepreciable && form.usefulLifeMonths !== '' ? Number(form.usefulLifeMonths) : null,
      depreciation_method: form.isDepreciable ? (form.depreciationMethod || null) : null,
      salvage_value: form.isDepreciable && form.salvageValue !== '' ? Number(form.salvageValue) : 0,
      annual_depreciation_rate: form.isDepreciable && form.depreciationMethod === 'accelerated' && form.annualDepreciationRate !== ''
        ? Number(form.annualDepreciationRate) : null,
      status: form.status,
    };

    const selectClause = '*, category:fixed_asset_categories(id, name), type:fixed_asset_types(id, name, is_depreciable), location:fixed_asset_locations(id, name), responsible_position:job_positions(id, name)';
    if (editing) {
      const { data, error } = await supabase.from('fixed_assets').update(payload).eq('id', editing.id).select(selectClause).single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? data : r)));

      // 2026-09-08: Байршил/Хариуцагч үнэхээр солигдсон үед л
      // append-only түүхэнд 1 мвр бичнэ (Rule of two — энэ логик
      // зөвхөн ЭНД, дахин давтахгүй).
      const locationChanged = editing.location_id !== payload.location_id;
      const responsibleChanged = editing.responsible_position_id !== payload.responsible_position_id;
      if (locationChanged || responsibleChanged) {
        await supabase.from('fixed_asset_assignment_history').insert({
          tenant_id: hoaId,
          asset_id: editing.id,
          old_location_id: locationChanged ? editing.location_id : null,
          new_location_id: locationChanged ? payload.location_id : null,
          old_responsible_position_id: responsibleChanged ? editing.responsible_position_id : null,
          new_responsible_position_id: responsibleChanged ? payload.responsible_position_id : null,
        });
      }
    } else {
      const { data, error } = await supabase.from('fixed_assets').insert(payload).select(selectClause).single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => [data, ...prev]);
    }
    setEditing(null);
    setAdding(false);
  }

  async function handleDelete(row) {
    if (!(await confirm(`"${row.name}" хөрөнгийг устгах уу?`))) return;
    const { error } = await supabase.from('fixed_assets').delete().eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  // 2026-09-07 (9): "Хөрөнгө актлах" — status='written_off' болгож,
  // write_off_date/reason/amount-ыг бичнэ.
  async function handleWriteOff({ writeOffDate, writeOffReason, writeOffAmount }) {
    const asset = writingOff;
    if (!asset) return;
    const selectClause = '*, category:fixed_asset_categories(id, name), type:fixed_asset_types(id, name, is_depreciable), location:fixed_asset_locations(id, name), responsible_position:job_positions(id, name)';
    const { data, error } = await supabase.from('fixed_assets')
      .update({ status: 'written_off', write_off_date: writeOffDate, write_off_reason: writeOffReason, write_off_amount: writeOffAmount })
      .eq('id', asset.id)
      .select(selectClause)
      .single();
    if (error) { window.alert(error.message); return; }
    setRows((prev) => prev.map((r) => (r.id === asset.id ? data : r)));
    setWritingOff(null);
    setViewing(data);
  }

  // 2026-09-07: Шошго хэвлэлт — эхний шат зөвхөн iPad/iPhone дээр
  // турших зорилготой (src/lib/labelPrint.js тайлбарыг үзнэ үү).
  // 2026-09-07 (5): QR код (CODE128 биш) — deep-link URL агуулна.
  async function handlePrint(row) {
    let previewUrl = null;
    try {
      const deepLink = buildAssetDeepLink(row.barcode);
      const blob = await buildLabelPngBlob({ orgName, barcode: row.barcode, assetName: row.name, markSerial: row.mark_serial, deepLink });
      previewUrl = URL.createObjectURL(blob);
      const confirmed = await confirm(
        <div className="flex flex-col items-center gap-3">
          <img src={previewUrl} alt="Шошгын урьдчилан харагдац" className="rounded border border-slate-200 dark:border-bordercol max-w-full" />
          <div>{`"${row.name}" хөрөнгийн шошгыг хэвлэх vv?`}</div>
        </div>
      );
      if (!confirmed) return;
      await shareOrDownloadLabel(blob, `${row.barcode}.png`);
    } catch (err) {
      window.alert(`Шошго үүсгэхэд алдаа гарлаа: ${err.message}`);
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  }

  function handleCloseView() {
    setViewing(null);
    if (searchParams.get('asset')) setSearchParams({}, { replace: true });
  }

  async function handlePostDepreciation() {
    const today = new Date();
    const periodLabel = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (!(await confirm(`Энэ сарын (${periodLabel}) элэгдлийг батлах уу? Батлагдсаны дараа буцаах боломжгүй.`))) return;
    try {
      const n = await depreciation.postCurrentMonth();
      window.alert(`${n} хөрөнгийн элэгдэл батлагдлаа.`);
      loadAssets();
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function handleAddRepair(form) {
    try {
      await repairs.addRepair(form);
      setAddingRepair(false);
    } catch (err) {
      window.alert(err.message);
    }
  }

  // 2026-09-08: Тооллого (физик инвентаризаци) — эхлүүлэх/дуусгах үед
  // тодорхой баталгаажуулалт шаардана (дуусгасны дараа буцаах боломжгүй).
  async function handleStartInventory() {
    if (!(await confirm('Актлагдсанаас бусад бүх үндсэн хөрөнгийн тооллогыг эхлүүлэх vv?'))) return;
    try {
      await inventory.startCount();
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function handleCompleteInventory() {
    if (!(await confirm('Тооллогыг дуусгах уу? Хэрэв "Тийм" бол энэ удаагийн тооллого хаагдахыг анхаарна уу.'))) return;
    try {
      await inventory.completeCount();
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function handleMarkFound(asset) {
    try {
      await inventory.markFound(asset.id);
    } catch (err) {
      window.alert(err.message);
    }
  }

  function handleViewHistoryCount(countId) {
    setViewingHistoryCountId(countId);
    inventory.loadCountItems(countId);
  }

  return (
    <>
      {tab === 'list' && (
        <FixedAssetsToolbar
          responsiblePerson={responsiblePerson} onResponsiblePersonChange={setResponsiblePerson} responsibleOptions={responsibleOptions}
          location={location} onLocationChange={setLocation} locationOptions={locationOptions}
          search={search} onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
          onAddClick={() => setAdding(true)} canAdd={can('fixedassets', 'add')}
        />
      )}
      {tab === 'depreciation' && (
        <FixedAssetsToolbar
          responsiblePerson={responsiblePerson} onResponsiblePersonChange={setResponsiblePerson} responsibleOptions={responsibleOptions}
          location={location} onLocationChange={setLocation} locationOptions={locationOptions}
          search={search} onSearchChange={setSearch}
          onAddClick={handlePostDepreciation} canAdd
          addLabel={depreciation.posting ? 'Тооцоолж байна...' : 'Элэгдлийг тооцоолох'}
          addDisabled={depreciation.posting}
        />
      )}
      {tab === 'repair' && (
        <div className="ds-toolbar">
          <div className="relative min-w-[240px]">
            <input type="text" placeholder="Хайх..." className="ds-input w-full" disabled />
          </div>
          <div className="flex-1" />
          <button className="ds-btn-secondary">Хэвлэх</button>
          <button className="ds-btn-secondary">Экспорт</button>
          <button className="ds-btn-primary" onClick={() => setAddingRepair(true)}>+ Засвар бүртгэх</button>
        </div>
      )}
      {tab === 'inventory' && inventorySubTab === 'active' && (
        <div className="ds-toolbar flex-wrap justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select className="ds-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Бүгд</option>
              <option value="in_use">Ашиглалтад</option>
              <option value="repair">Засварт</option>
              <option value="written_off">Актлагдсан</option>
            </select>
            <select className="ds-select" value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)}>
              <option value="all">Бүх хариуцагч</option>
              {responsibleOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className="ds-select" value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="all">Бүх байршил</option>
              {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input type="text" placeholder="Хайх (нэр, бүртгэлийн дугаар, марк/модель)..." className="ds-input min-w-[240px]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {!inventory.activeCount ? (
            <button className="ds-btn-primary" disabled={inventory.starting} onClick={handleStartInventory}>
              {inventory.starting ? 'Эхлүүлж байна...' : 'Тооллого эхлүүлэх'}
            </button>
          ) : (
            <button className="bg-customRed hover:opacity-90 text-white text-xs px-3 py-1.5 rounded font-medium transition-opacity" onClick={handleCompleteInventory}>
              Тооллого дуусгах
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="flex gap-2">
          <button
            className={`text-[11.5px] px-3 py-1.5 rounded font-medium transition-colors ${inventorySubTab === 'active' ? 'bg-blue-600 text-white' : 'text-mutedtext hover:text-slate-900 dark:hover:text-white'}`}
            onClick={() => setInventorySubTab('active')}
          >
            Идэвхтэй тооллого
          </button>
          <button
            className={`text-[11.5px] px-3 py-1.5 rounded font-medium transition-colors ${inventorySubTab === 'history' ? 'bg-blue-600 text-white' : 'text-mutedtext hover:text-slate-900 dark:hover:text-white'}`}
            onClick={() => { setInventorySubTab('history'); setViewingHistoryCountId(null); }}
          >
            Тооллогын түүх
          </button>
        </div>
      )}
      {tab === 'list' && (
        <div className="grid grid-cols-4 gap-[10px]">
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Нийт хөрөнгийн тоо</div>
            <div className="text-[19px] font-bold">{summary.count}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Худалдан авсан нийт үнэ</div>
            <div className="text-[19px] font-bold">{formatMoney(summary.purchaseTotal)}₮</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Дансны үлдэгдэл нийт үнэ</div>
            <div className="text-[19px] font-bold">{formatMoney(summary.bookValueTotal)}₮</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Ашиглаж буй / Актлагдсан</div>
            <div className="text-[19px] font-bold">{summary.inUseCount} / {summary.writtenOffCount}</div>
          </div>
        </div>
      )}
      {tab === 'depreciation' && (
        <div className="grid grid-cols-4 gap-[10px]">
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Батлагдсан бүртгэлийн тоо</div>
            <div className="text-[19px] font-bold">{depreciation.stats.count}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Нийт батлагдсан дүн</div>
            <div className="text-[19px] font-bold">{formatMoney(depreciation.stats.total)}₮</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Энэ сард батлагдсан дүн</div>
            <div className="text-[19px] font-bold">{formatMoney(depreciation.stats.thisMonthAmount)}₮</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Сүүлд батлагдсан үе</div>
            <div className="text-[19px] font-bold">{depreciation.stats.latestPeriod ? formatDate(depreciation.stats.latestPeriod) : '—'}</div>
          </div>
        </div>
      )}
      {tab === 'repair' && (
        <div className="grid grid-cols-4 gap-[10px]">
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Нийт засвар үйлчилгээний тоо</div>
            <div className="text-[19px] font-bold">{repairs.stats.count}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Нийт зарцуулсан үнэ</div>
            <div className="text-[19px] font-bold">{formatMoney(repairs.stats.total)}₮</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Энэ сарын засварын тоо</div>
            <div className="text-[19px] font-bold">{repairs.stats.thisMonthCount}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Энэ сарын зарцуулсан үнэ</div>
            <div className="text-[19px] font-bold">{formatMoney(repairs.stats.thisMonthTotal)}₮</div>
          </div>
        </div>
      )}
      {tab === 'inventory' && inventorySubTab === 'active' && (
        <div className="grid grid-cols-4 gap-[10px]">
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Нийт Үндсэн хөрөнгийн тоо</div>
            <div className="text-[19px] font-bold">{inventory.items.length}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Тоологдсон</div>
            <div className="text-[19px] font-bold text-customGreen">{inventory.foundAssetIds.size}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Тоологдоогүй</div>
            <div className="text-[19px] font-bold text-customRed">{inventory.items.length - inventory.foundAssetIds.size}</div>
          </div>
          <div className="ds-card p-3">
            <div className="text-[11px] text-mutedtext mb-1.5">Тооллогын явц</div>
            <div className="text-[19px] font-bold">
              {inventory.items.length > 0 ? Math.round((inventory.foundAssetIds.size / inventory.items.length) * 100) : 0}%
            </div>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <FixedAssetsTable
          rows={filteredRows}
          loading={loading}
          loadError={loadError}
          onEdit={setEditing}
          onDelete={handleDelete}
          onView={setViewing}
          canEdit={can('fixedassets', 'edit')}
          canDelete={can('fixedassets', 'delete')}
          activeRepairAssetIds={repairs.activeRepairAssetIds}
        />
      )}
      {tab === 'depreciation' && (
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto overscroll-contain">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3 w-[100px]">үЕ</th>
                  <th className="py-2.5 px-3">ХӨРӨНГӨ</th>
                  <th className="py-2.5 px-3 w-[150px]">АРГАЧЛАЛ</th>
                  <th className="py-2.5 px-3 w-[130px] text-right">ДүН</th>
                  <th className="py-2.5 px-3 w-[140px]">БАТАЛСАН ОГНОО</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {depreciation.loading && <tr><td colSpan={5} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>}
                {!depreciation.loading && filteredPostings.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-darktext">Батлагдсан элэгдэл алга</td></tr>
                )}
                {!depreciation.loading && filteredPostings.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3">{formatDate(p.period)}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{p.asset?.name || '—'}</td>
                    <td className="py-2.5 px-3">{DEPRECIATION_METHODS[p.method_used] || p.method_used || '—'}</td>
                    <td className="py-2.5 px-3 text-right">{formatMoney(p.amount)}₮</td>
                    <td className="py-2.5 px-3">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'repair' && (
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto overscroll-contain">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">№</th>
                  <th className="py-2.5 px-3">ХӨРӨНГӨ</th>
                  <th className="py-2.5 px-3 w-[110px]">ЭХЭЛСЭН</th>
                  <th className="py-2.5 px-3 w-[110px]">ДУУССАН</th>
                  <th className="py-2.5 px-3">ТАЙЛБАР</th>
                  <th className="py-2.5 px-3 w-[110px] text-right">ҮНЭ</th>
                  <th className="py-2.5 px-3 w-[130px] text-right">НИЙТ ЗАРЦУУЛСАН</th>
                  <th className="py-2.5 px-3 w-[150px]">ХАРИЛЦАГЧ</th>
                  <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {repairs.loading && <tr><td colSpan={9} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>}
                {!repairs.loading && repairs.repairs.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-darktext">Засвар үйлчилгээ олдсонгүй</td></tr>
                )}
                {!repairs.loading && repairs.repairs.map((r, idx) => {
                  const totalSpent = repairs.totalSpentByAsset.get(r.asset_id) || 0;
                  const purchasePrice = Number(r.asset?.purchase_price) || 0;
                  const ratio = purchasePrice > 0 ? totalSpent / purchasePrice : 0;
                  const spentClass = ratio >= 1 ? 'text-customRed' : ratio >= 0.7 ? 'text-customOrange' : '';
                  return (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.asset?.name || '—'}</td>
                      <td className="py-2.5 px-3">{r.start_date ? formatDate(r.start_date) : '—'}</td>
                      <td className="py-2.5 px-3">{r.end_date ? formatDate(r.end_date) : '—'}</td>
                      <td className="py-2.5 px-3">{r.description || '—'}</td>
                      <td className="py-2.5 px-3 text-right">{formatMoney(r.amount)}₮</td>
                      <td className={`py-2.5 px-3 text-right font-semibold ${spentClass}`} title={ratio >= 1 ? 'Нийт зарцуулсан дүн худалдан авсан үнээс давсан — актлахыг үзэж үзээрэй' : ratio >= 0.7 ? 'Нийт зарцуулсан дүн худалдан авсан үнийн 70%-иас давсан' : ''}>
                        {formatMoney(totalSpent)}₮
                      </td>
                      <td className="py-2.5 px-3">{r.provider_org || '—'}</td>
                      <td className="py-2.5 px-3 text-right"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'inventory' && inventorySubTab === 'active' && (
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto overscroll-contain">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">№</th>
                  <th className="py-2.5 px-3 w-[150px]">ХӨРӨНГИЙН БүРТГЭЛИЙН ДУГААР</th>
                  <th className="py-2.5 px-3">ХӨРӨНГӨ</th>
                  <th className="py-2.5 px-3 w-[110px]">ТӨЛӨВ</th>
                  <th className="py-2.5 px-3 w-[170px]">ТООЛЛОГОД БүРТГЭСЭН ОГНОО</th>
                  <th className="py-2.5 px-3 w-[160px] text-right">ҮЙЛДЭЛ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {!inventory.activeCount && (
                  <tr><td colSpan={6} className="py-8 text-center text-darktext">Идэвхтэй тооллого байхгүй — дээрх "Тооллого эхлүүлэх" товчийг дарна уу.</td></tr>
                )}
                {inventory.activeCount && inventory.loading && (
                  <tr><td colSpan={6} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
                )}
                {inventory.activeCount && !inventory.loading && filteredInventoryItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-[12px]">{item.asset?.barcode || '—'}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{item.asset?.name || '—'}</td>
                    <td className="py-2.5 px-3 font-semibold">
                      {item.found ? <span className="text-customGreen">Тоологдсон</span> : <span className="text-customRed">Тоологдоогүй</span>}
                    </td>
                    <td className="py-2.5 px-3">{item.found_at ? formatDate(item.found_at) : '—'}</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {!item.found && (
                        <button className="ds-btn-secondary whitespace-nowrap" onClick={() => handleMarkFound(item.asset)}>Тооллогод бүртгэх</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'inventory' && inventorySubTab === 'history' && !viewingHistoryCountId && (
        <div className="ds-table-wrap">
          <div className="flex-1 overflow-auto overscroll-contain">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="py-2.5 px-3">ЭХЭЛСЭН ОГНОО</th>
                  <th className="py-2.5 px-3">ДУУССАН ОГНОО</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                {inventory.completedCounts.length === 0 && (
                  <tr><td colSpan={2} className="py-8 text-center text-darktext">Дуусгасан тооллого хараахан алга.</td></tr>
                )}
                {inventory.completedCounts.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]" onClick={() => handleViewHistoryCount(c.id)}>
                    <td className="py-2.5 px-3"><button type="button" className="text-customBlue hover:underline">{formatDateTimeMinutes(c.started_at)}</button></td>
                    <td className="py-2.5 px-3">{c.completed_at ? formatDateTimeMinutes(c.completed_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'inventory' && inventorySubTab === 'history' && viewingHistoryCountId && (
        <>
          <div className="ds-toolbar justify-start">
            <button className="ds-btn-secondary" onClick={() => setViewingHistoryCountId(null)}>← Тооллогын түүх рүү буцах</button>
          </div>
          <div className="ds-table-wrap">
            <div className="flex-1 overflow-auto overscroll-contain">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">№</th>
                    <th className="py-2.5 px-3 w-[150px]">ХӨРӨНГИЙН БүРТГЭЛИЙН ДУГААР</th>
                    <th className="py-2.5 px-3">ХӨРӨНГӨ</th>
                    <th className="py-2.5 px-3 w-[110px]">ТӨЛӨВ</th>
                    <th className="py-2.5 px-3 w-[170px]">ТООЛЛОГОД БүРТГЭСЭН ОГНОО</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                  {inventory.historyLoading && (
                    <tr><td colSpan={5} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
                  )}
                  {!inventory.historyLoading && inventory.historyItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-[12px]">{item.asset?.barcode || '—'}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{item.asset?.name || '—'}</td>
                      <td className="py-2.5 px-3 font-semibold">
                        {item.found ? <span className="text-customGreen">Тоологдсон</span> : <span className="text-customRed">Тоологдоогүй</span>}
                      </td>
                      <td className="py-2.5 px-3">{item.found_at ? formatDate(item.found_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <EditFixedAssetModal
        key={editing?.id}
        open={!!editing}
        onClose={() => setEditing(null)}
        asset={editing}
        onSave={handleSave}
        hoaId={hoaId}
      />

      <EditFixedAssetModal
        open={adding}
        onClose={() => setAdding(false)}
        asset={null}
        onSave={handleSave}
        hoaId={hoaId}
      />

      <AssetInfoModal
        open={!!viewing}
        onClose={handleCloseView}
        asset={viewing}
        canEdit={can('fixedassets', 'edit')}
        onEdit={(asset) => { handleCloseView(); setEditing(asset); }}
        onPrint={handlePrint}
        onWriteOff={(asset) => { handleCloseView(); setWritingOff(asset); }}
        underRepair={!!viewing && repairs.activeRepairAssetIds.has(viewing.id)}
        activeInventoryCount={inventory.activeCount}
        isFoundInCount={!!viewing && inventory.foundAssetIds.has(viewing.id)}
        onMarkFound={handleMarkFound}
      />

      <WriteOffAssetModal
        open={!!writingOff}
        onClose={() => setWritingOff(null)}
        asset={writingOff}
        onConfirm={handleWriteOff}
      />

      <RepairModal
        open={addingRepair}
        onClose={() => setAddingRepair(false)}
        assets={rows}
        onSave={handleAddRepair}
      />

      <ConfirmDialog />
    </>
  );
}
