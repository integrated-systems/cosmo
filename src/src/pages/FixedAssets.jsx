import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney } from '../lib/format';
import { useAccessRules } from '../hooks/useAccessRules';
import { useConfirm } from '../hooks/useConfirm';
import { buildLabelPngBlob, shareOrDownloadLabel, buildAssetDeepLink } from '../lib/labelPrint';
import TabButton from '../components/TabButton';
import FixedAssetsToolbar from '../components/FixedAssetsToolbar';
import FixedAssetsTable from '../components/FixedAssetsTable';
import EditFixedAssetModal from '../components/EditFixedAssetModal';
import AssetInfoModal from '../components/AssetInfoModal';

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
const TABS = [
  { key: 'list', label: 'Үндсэн хөрөнгийн жагсаалт' },
  { key: 'depreciation', label: 'Элэгдэл' },
  { key: 'repair', label: 'Засвар' },
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
  const [tenantName, setTenantName] = useState('');

  const [responsiblePerson, setResponsiblePerson] = useState('all');
  const [location, setLocation] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!hoaId) return;
    supabase.from('tenants').select('name').eq('id', hoaId).single().then(({ data }) => {
      if (data) setTenantName(data.name);
    });
  }, [hoaId]);

  async function loadAssets() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await fetchAllRows(() =>
      supabase.from('fixed_assets')
        .select('*, category:fixed_asset_categories(id, name), type:fixed_asset_types(id, name), location:fixed_asset_locations(id, name)')
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
      .select('*, category:fixed_asset_categories(id, name), type:fixed_asset_types(id, name), location:fixed_asset_locations(id, name)')
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
    () => Array.from(new Set(rows.map((r) => r.responsible_person).filter(Boolean))).sort(),
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
    if (responsiblePerson !== 'all' && r.responsible_person !== responsiblePerson) return false;
    if (location !== 'all' && r.location_id !== location) return false;
    if (q) {
      const hay = `${r.name} ${r.barcode} ${r.mark_serial || ''}`.toLowerCase();
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
      qty: form.qty !== '' ? Number(form.qty) : 1,
      unit: form.unit,
      acquired_date: form.acquiredDate || null,
      purchase_price: form.purchasePrice !== '' ? Number(form.purchasePrice) : 0,
      seller_org: form.sellerOrg || null,
      location_id: form.locationId || null,
      responsible_person: form.responsiblePerson || null,
      note: form.note || null,
      useful_life_months: form.usefulLifeMonths !== '' ? Number(form.usefulLifeMonths) : null,
      depreciation_method: form.depreciationMethod || null,
      salvage_value: form.salvageValue !== '' ? Number(form.salvageValue) : 0,
      status: form.status,
    };

    const selectClause = '*, category:fixed_asset_categories(id, name), type:fixed_asset_types(id, name), location:fixed_asset_locations(id, name)';
    if (editing) {
      const { data, error } = await supabase.from('fixed_assets').update(payload).eq('id', editing.id).select(selectClause).single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? data : r)));
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

  // 2026-09-07: Шошго хэвлэлт — эхний шат зөвхөн iPad/iPhone дээр
  // турших зорилготой (src/lib/labelPrint.js тайлбарыг үзнэ үү).
  // 2026-09-07 (5): QR код (CODE128 биш) — deep-link URL агуулна.
  async function handlePrint(row) {
    if (!(await confirm(`"${row.name}" хөрөнгийн шошгыг хэвлэх үү?`))) return;
    try {
      const deepLink = buildAssetDeepLink(hoaId, row.barcode);
      const blob = await buildLabelPngBlob({ tenantName, barcode: row.barcode, markSerial: row.mark_serial, deepLink });
      await shareOrDownloadLabel(blob, `${row.barcode}.png`);
    } catch (err) {
      window.alert(`Шошго үүсгэхэд алдаа гарлаа: ${err.message}`);
    }
  }

  function handleCloseView() {
    setViewing(null);
    if (searchParams.get('asset')) setSearchParams({}, { replace: true });
  }

  return (
    <>
      <FixedAssetsToolbar
        responsiblePerson={responsiblePerson} onResponsiblePersonChange={setResponsiblePerson} responsibleOptions={responsibleOptions}
        location={location} onLocationChange={setLocation} locationOptions={locationOptions}
        search={search} onSearchChange={setSearch}
        onAddClick={() => setAdding(true)} canAdd={can('fixedassets', 'add')}
      />

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

      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab !== 'list' ? (
        <div className="ds-card p-6 text-center text-[12px] text-mutedtext">Энэ таб түн удахгүй нэмэгдэнэ.</div>
      ) : (
        <FixedAssetsTable
          rows={filteredRows}
          loading={loading}
          loadError={loadError}
          onEdit={setEditing}
          onDelete={handleDelete}
          onPrint={handlePrint}
          onView={setViewing}
          canEdit={can('fixedassets', 'edit')}
          canDelete={can('fixedassets', 'delete')}
        />
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
      />

      <ConfirmDialog />
    </>
  );
}
