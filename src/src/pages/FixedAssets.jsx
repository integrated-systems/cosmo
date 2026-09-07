import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney } from '../lib/format';
import { useAccessRules } from '../hooks/useAccessRules';
import { useConfirm } from '../hooks/useConfirm';
import TabButton from '../components/TabButton';
import FixedAssetsToolbar from '../components/FixedAssetsToolbar';
import FixedAssetsTable from '../components/FixedAssetsTable';
import EditFixedAssetModal from '../components/EditFixedAssetModal';

// "Үндсэн хөрөнгө бүртгэл" (/fixedassets) — "Удирдах зөвлөл портал"
// бүлэг. 2026-09-07 хэрэглэгчийн хуучин "suh" прототипийн зурган
// жишээгээр өгсөн бүтэц (тойм карт → таб → хүснэгэл, ParkingPage.jsx-
// ийн загварын дагуу) дээр үндэслэв, гэхдээ Cosmo-ийн бодит дизайн/
// компонент/Supabase backend-тэй (fixed_assets хүснэгэл). Хуучин
// хувилбарт байгаагүй ШИНЭ элемент болох дээд тойм статистик картыг
// Invoice.jsx-ийн grid-cols-4 загвараар зохиов.
//
// "Элэгдэл" ба "Засвар" таб (хуучин хувилбарт байсан ч энэ даалгаварт
// дэлгэрэнгүй заагаагүй) ParkingPage.jsx-ийн "Түр нэвтэрсэн машин"
// таб шиг placeholder хэлбэрээр орлоо — дараа тусад нь тодорхой
// хэрэгцээгээр бүтээнэ.
const TABS = [
  { key: 'list', label: 'Үндсэн хөрөнгийн жагсаалт' },
  { key: 'depreciation', label: 'Элэгдэл' },
  { key: 'repair', label: 'Засвар' },
];

export default function FixedAssets() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { can } = useAccessRules(hoaId);
  const { confirm, ConfirmDialog } = useConfirm();

  const [tab, setTab] = useState('list');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const [responsiblePerson, setResponsiblePerson] = useState('all');
  const [location, setLocation] = useState('all');
  const [search, setSearch] = useState('');

  async function loadAssets() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await fetchAllRows(() =>
      supabase.from('fixed_assets').select('*').eq('tenant_id', hoaId).order('created_at', { ascending: false })
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

  const responsibleOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.responsible_person).filter(Boolean))).sort(),
    [rows]
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.location).filter(Boolean))).sort(),
    [rows]
  );

  const q = search.trim().toLowerCase();
  const filteredRows = rows.filter((r) => {
    if (responsiblePerson !== 'all' && r.responsible_person !== responsiblePerson) return false;
    if (location !== 'all' && r.location !== location) return false;
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
      category: form.category || null,
      qty: form.qty !== '' ? Number(form.qty) : 1,
      unit: form.unit,
      acquired_date: form.acquiredDate || null,
      purchase_price: form.purchasePrice !== '' ? Number(form.purchasePrice) : 0,
      accumulated_depreciation: form.accumulatedDepreciation !== '' ? Number(form.accumulatedDepreciation) : 0,
      location: form.location || null,
      responsible_person: form.responsiblePerson || null,
      status: form.status,
      note: form.note || null,
    };

    if (editing) {
      const { data, error } = await supabase.from('fixed_assets').update(payload).eq('id', editing.id).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? data : r)));
    } else {
      const { data, error } = await supabase.from('fixed_assets').insert(payload).select().single();
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

  return (
    <>
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
        <>
          <FixedAssetsToolbar
            responsiblePerson={responsiblePerson} onResponsiblePersonChange={setResponsiblePerson} responsibleOptions={responsibleOptions}
            location={location} onLocationChange={setLocation} locationOptions={locationOptions}
            search={search} onSearchChange={setSearch}
            onAddClick={() => setAdding(true)} canAdd={can('fixedassets', 'add')}
          />

          <FixedAssetsTable
            rows={filteredRows}
            loading={loading}
            loadError={loadError}
            onEdit={setEditing}
            onDelete={handleDelete}
            canEdit={can('fixedassets', 'edit')}
            canDelete={can('fixedassets', 'delete')}
          />
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

      <ConfirmDialog />
    </>
  );
}
