import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { useAuth } from '../lib/AuthContext';
import { useFixedAssetConfig } from '../hooks/useFixedAssetConfig';
import { DEPRECIATION_METHODS } from '../lib/fixedAssetsFormat';
import { useConfirm } from '../hooks/useConfirm';
import TabButton from '../components/TabButton';
import Modal from '../components/Modal';
import { EditIcon, DeleteIcon } from '../components/icons/Icons';

// "Үндсэн хөрөнгө тохиргоо" (СИСАДМИН, /fixedassconfig) — 2026-09-07
// хэрэглэгчийн "suh" прототипийн зурган жишээгээр (3 таб: Ангилал/
// Терел/Байршил), ГЭХДЭЭ жагсаалтыг картаар БИШ, Cosmo-ийн стандарт
// ds-table хүснэгэл дизайнаар (хэрэглэгчийн тодорхой заасны дагуу).
// useFixedAssetConfig hook-ыг EditFixedAssetModal.jsx-тэй хамт дахин
// ашигласан (Rule of two) — энд засварласан лавлах өгөгдөл тэр модальд
// шууд тусна.
//
// 2026-09-07 (6): Ангилал/Терел одоо ГЛОБАЛ стандарт (Монголын НББ-ийн
// стандарт хөрөнгийн ангилал) тул зөвхөн SUPERSYSADMIN засварлана —
// энгийн СӨХ ажилтан зөвхөн харна (RLS-д ч мөн адил хориглосон,
// UI-ийн хязгаарлалт бол зөвхөн тав тухтай байдлын үүднээс). Байршил
// хэвээрээ tenant бүрд өөр өөр тул бүх ажилтан засварлаж чадна.
const TABS = [
  { key: 'category', label: 'Ангилал' },
  { key: 'type', label: 'Терел' },
  { key: 'location', label: 'Байршил' },
];

export default function FixedAssetConfig() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { isSuperSysAdmin } = useAuth();
  const [tab, setTab] = useState('category');
  const { categories, types, locations, loading, reload } = useFixedAssetConfig(hoaId);

  return (
    <>
      <div className="flex gap-2">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'category' && <CategoriesTab canManage={isSuperSysAdmin} categories={categories} types={types} loading={loading} reload={reload} />}
      {tab === 'type' && <TypesTab canManage={isSuperSysAdmin} categories={categories} types={types} loading={loading} reload={reload} />}
      {tab === 'location' && <LocationsTab hoaId={hoaId} locations={locations} loading={loading} reload={reload} />}
    </>
  );
}

// ---------- Ангилал (ГЛОБАЛ, зөвхөн SUPERSYSADMIN засна) ----------

function CategoriesTab({ canManage, categories, types, loading, reload }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const typeCount = useMemo(() => {
    const map = new Map();
    types.forEach((t) => map.set(t.category_id, (map.get(t.category_id) || 0) + 1));
    return map;
  }, [types]);

  async function handleDelete(row) {
    const n = typeCount.get(row.id) || 0;
    const warn = n > 0 ? ` Энэ ангилалд харьяалагдах ${n} төрөл хамт идэвхгүй болно.` : '';
    if (!(await confirm(`"${row.name}" ангиллыг идэвхгүй болгох уу?${warn} (Устгахгүй, зөвхөн шинэ бүртгэлд харагдахгүй болно.)`))) return;
    const { error } = await supabase.from('fixed_asset_categories').update({ is_active: false }).eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    reload();
  }

  async function handleReactivate(row) {
    const { error } = await supabase.from('fixed_asset_categories').update({ is_active: true }).eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    reload();
  }

  return (
    <>
      {canManage && (
        <div className="ds-toolbar justify-end">
          <button className="ds-btn-primary" onClick={() => setAdding(true)}>+ Шинэ ангилал нэмэх</button>
        </div>
      )}
      {!canManage && (
        <div className="text-[11.5px] text-mutedtext">Энэ бол Монголын НББ-ийн стандарт ангилал — зөвхөн SUPERSYSADMIN засварлана.</div>
      )}

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">НЭР</th>
                <th className="py-2.5 px-3 w-[120px]">КОД</th>
                <th className="py-2.5 px-3 w-[160px]">АНХДАГЧ АШИГЛАХ ХУГАЦАА</th>
                <th className="py-2.5 px-3 w-[150px]">ЭЛЭГДЭЛ АРГАЧЛАЛ</th>
                <th className="py-2.5 px-3 w-[100px]">ТӨРЛИЙН ТОО</th>
                <th className="py-2.5 px-3 w-[90px]">ТӨЛӨВ</th>
                <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading && <tr><td colSpan={7} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>}
              {!loading && categories.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-darktext">Ангилал бүртгэгдээгүй байна</td></tr>
              )}
              {!loading && categories.map((c) => (
                <tr key={c.id} className={c.is_active === false ? 'opacity-50' : ''}>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{c.name}</td>
                  <td className="py-2.5 px-3 text-mutedtext">{c.code || '—'}</td>
                  <td className="py-2.5 px-3">{c.default_useful_life_months} сар</td>
                  <td className="py-2.5 px-3">{DEPRECIATION_METHODS[c.default_depreciation_method] || c.default_depreciation_method}</td>
                  <td className="py-2.5 px-3">{typeCount.get(c.id) || 0}</td>
                  <td className="py-2.5 px-3">{c.is_active === false ? <span className="text-customRed">Идэвхгүй</span> : <span className="text-customGreen">Идэвхтэй</span>}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {canManage && c.is_active !== false && (
                      <>
                        <button className="ds-icon-btn" title="Засах" onClick={() => setEditing(c)}><EditIcon /></button>
                        <button className="ds-icon-btn danger" title="Идэвхгүй болгох" onClick={() => handleDelete(c)}><DeleteIcon /></button>
                      </>
                    )}
                    {canManage && c.is_active === false && (
                      <button className="ds-btn-secondary" onClick={() => handleReactivate(c)}>Идэвхжүүлэх</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryModal key={editing?.id} open={!!editing || adding} onClose={() => { setEditing(null); setAdding(false); }} category={editing} onSaved={reload} />
      <ConfirmDialog />
    </>
  );
}

function CategoryModal({ open, onClose, category, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: category?.name || '',
    code: category?.code || '',
    defaultUsefulLifeMonths: category?.default_useful_life_months ?? 48,
    defaultDepreciationMethod: category?.default_depreciation_method || 'straight_line',
  }));

  async function save() {
    if (!form.name.trim()) { window.alert('Ангиллын нэрийг бөглөнө үү.'); return; }
    const payload = {
      tenant_id: null,
      name: form.name.trim(),
      code: form.code || null,
      default_useful_life_months: Number(form.defaultUsefulLifeMonths) || 48,
      default_depreciation_method: form.defaultDepreciationMethod,
    };
    const { error } = category
      ? await supabase.from('fixed_asset_categories').update(payload).eq('id', category.id)
      : await supabase.from('fixed_asset_categories').insert(payload);
    if (error) { window.alert(error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Ангилал засах' : 'Шинэ ангилал нэмэх'} footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="ds-btn-primary" onClick={save}>Хадгалах</button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Нэр</label>
          <input className="ds-input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Код</label>
          <input className="ds-input w-full" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Анхдагч ашиглах хугацаа (сар)</label>
          <input type="number" min="1" className="ds-input w-full" value={form.defaultUsefulLifeMonths} onChange={(e) => setForm((f) => ({ ...f, defaultUsefulLifeMonths: e.target.value }))} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Анхдагч элэгдэл аргачлал</label>
          <select className="ds-select w-full" value={form.defaultDepreciationMethod} onChange={(e) => setForm((f) => ({ ...f, defaultDepreciationMethod: e.target.value }))}>
            {Object.entries(DEPRECIATION_METHODS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Төрөл ----------

function TypesTab({ canManage, categories, types, loading, reload }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [categoryId, setCategoryId] = useState('');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const activeCategoryId = categoryId || categories[0]?.id || '';
  const filteredTypes = types.filter((t) => t.category_id === activeCategoryId);

  async function handleDelete(row) {
    if (!(await confirm(`"${row.name}" терелийг идэвхгүй болгох уу? (Устгахгүй, зүвхүн шинэ бүртгэлд харагдахгүй болно.)`))) return;
    const { error } = await supabase.from('fixed_asset_types').update({ is_active: false }).eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    reload();
  }

  async function handleReactivate(row) {
    const { error } = await supabase.from('fixed_asset_types').update({ is_active: true }).eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    reload();
  }

  return (
    <>
      <div className="ds-toolbar">
        <select className="ds-select" value={activeCategoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.length === 0 && <option value="">Ангилал бүртгэгдээгүй</option>}
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="text-[11.5px] text-mutedtext flex-1">
          Төрөл бүр тодорхой нэг Ангилалд харьяалагдана. Дээрх dropdown-оос Ангилал сонгож, тухайн ангиллын Төрлүүдийг харна.
        </div>
        {canManage && (
          <button className="ds-btn-primary" disabled={!activeCategoryId} onClick={() => setAdding(true)}>+ Шинэ төрөл нэмэх</button>
        )}
      </div>

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">НЭР</th>
                <th className="py-2.5 px-3 w-[130px]">ЭЛЭГДЭЛ</th>
                <th className="py-2.5 px-3 w-[90px]">ТүЛүВ</th>
                <th className="py-2.5 px-3 w-[100px] text-right">үЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading && <tr><td colSpan={4} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>}
              {!loading && activeCategoryId && filteredTypes.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-darktext">Энэ ангилалд терел бүртгэгдээгүй байна</td></tr>
              )}
              {!loading && filteredTypes.map((t) => (
                <tr key={t.id} className={t.is_active === false ? 'opacity-50' : ''}>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{t.name}</td>
                  <td className="py-2.5 px-3">{t.is_depreciable === false ? <span className="text-customRed">Элэгддэггүй</span> : 'Элэгддэг'}</td>
                  <td className="py-2.5 px-3">{t.is_active === false ? <span className="text-customRed">Идэвхгүй</span> : <span className="text-customGreen">Идэвхтэй</span>}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {canManage && t.is_active !== false && (
                      <>
                        <button className="ds-icon-btn" title="Засах" onClick={() => setEditing(t)}><EditIcon /></button>
                        <button className="ds-icon-btn danger" title="Идэвхгүй болгох" onClick={() => handleDelete(t)}><DeleteIcon /></button>
                      </>
                    )}
                    {canManage && t.is_active === false && (
                      <button className="ds-btn-secondary" onClick={() => handleReactivate(t)}>Идэвхжүүлэх</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TypeModal key={editing?.id} open={!!editing || adding} onClose={() => { setEditing(null); setAdding(false); }} type={editing} categories={categories} defaultCategoryId={activeCategoryId} onSaved={reload} />
      <ConfirmDialog />
    </>
  );
}

function TypeModal({ open, onClose, type, categories, defaultCategoryId, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: type?.name || '',
    categoryId: type?.category_id || defaultCategoryId || '',
    isDepreciable: type?.is_depreciable !== false,
  }));

  async function save() {
    if (!form.name.trim() || !form.categoryId) { window.alert('Нэр болон Ангиллыг заавал бөглөнө үү.'); return; }
    const payload = { tenant_id: null, name: form.name.trim(), category_id: form.categoryId, is_depreciable: form.isDepreciable };
    const { error } = type
      ? await supabase.from('fixed_asset_types').update(payload).eq('id', type.id)
      : await supabase.from('fixed_asset_types').insert(payload);
    if (error) { window.alert(error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={type ? 'Төрөл засах' : 'Шинэ төрөл нэмэх'} footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Болих</button>
        <button className="ds-btn-primary" onClick={save}>Хадгалах</button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Ангилал</label>
          <select className="ds-select w-full" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="">— Ангилал сонгох —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Нэр</label>
          <input className="ds-input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}

// ---------- Байршил ----------

function LocationsTab({ hoaId, locations, loading, reload }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');

  function startAdd() { setName(''); setEditingId(null); setAdding(true); }
  function startEdit(row) { setName(row.name); setEditingId(row.id); setAdding(true); }

  async function save() {
    if (!name.trim()) return;
    const { error } = editingId
      ? await supabase.from('fixed_asset_locations').update({ name: name.trim() }).eq('id', editingId)
      : await supabase.from('fixed_asset_locations').insert({ tenant_id: hoaId, name: name.trim() });
    if (error) { window.alert(error.message); return; }
    setAdding(false);
    setEditingId(null);
    reload();
  }

  async function remove(row) {
    if (!(await confirm(`"${row.name}" байршлыг устгах уу?`))) return;
    const { error } = await supabase.from('fixed_asset_locations').delete().eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    reload();
  }

  return (
    <>
      <div className="ds-toolbar justify-end">
        {!adding && <button className="ds-btn-primary" onClick={startAdd}>+ Шинэ байршил нэмэх</button>}
      </div>

      {adding && (
        <div className="ds-card p-3 flex gap-2">
          <input className="ds-input flex-1" placeholder="Байршлын нэр" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="ds-btn-primary" onClick={save}>Хадгалах</button>
          <button className="ds-btn-secondary" onClick={() => { setAdding(false); setEditingId(null); }}>Болих</button>
        </div>
      )}

      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">НЭР</th>
                <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading && <tr><td colSpan={2} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>}
              {!loading && locations.length === 0 && (
                <tr><td colSpan={2} className="py-8 text-center text-darktext">Байршил бүртгэгдээгүй байна</td></tr>
              )}
              {!loading && locations.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{l.name}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button className="ds-icon-btn" title="Засах" onClick={() => startEdit(l)}><EditIcon /></button>
                    <button className="ds-icon-btn danger" title="Устгах" onClick={() => remove(l)}><DeleteIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog />
    </>
  );
}
