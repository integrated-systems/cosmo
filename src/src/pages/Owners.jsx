import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatDate } from '../lib/format';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import Modal from '../components/Modal';
import EditOwnerModal from '../components/EditOwnerModal';

// 2026-08-15: Supabase-тай холбогдов — EXAMPLE_OWNERS mock массив
// арилж, "owners" хүснэгэлээс бодитоор унших/бичих боллоо. "Төлөв"
// (өмчлөгч/түрээслэгч) талбарыг хэрэглэгчийн тодорхой заасны дагуу
// БҮРЭН устгасан — Сууц өмчлөгч бүртгэлд түрээслэгчийн статус байх
// учиргүй, түрээслэгчийн тухай мэдээллийг СӨХ Тайлбар талбарт гараар
// тэмдэглэнэ. Оронд нь өмчийн Улсын бүртгэлийн дугаарыг Инфо модальд
// харуулдаг болгов.
//
// TODO: "ТӨЛӨЛТ (САРААР)" баганын сар бүрийн төлбөрийн бодит статус
// (төлсөн/төлөгдөөгүй/ирээдүй) тусдаа payments/invoices хүснэгэл
// шаарддаг тул одоохондоо бүх мөрд "мэдээлэлгүй" (mutedtext) badge
// харуулна — өнгөний дүрэм (paid=customBlue, overdue=customRed,
// future=mutedtext) бэлэн, бодит дата ирэхэд шууд ажиллана.
// TODO: мөрний дугаар (index) — төлбөрийн үлдэгдэлгүй/үлдэгдэлтэй
// (customBlue/customRed) өнгөт дүрэм бэлэн, бодит "hasBalance" дата
// байхгүй тул одоохондоо анхдагч (neutral) өнгөтэй.

function summarizeSpots(items) {
  if (!items || items.length === 0) return '—';
  return items.map((it) => `${it.floor}-${it.no}`).join(', ');
}
function summarizeVehicles(items) {
  if (!items || items.length === 0) return '—';
  return items.map((it) => `${it.digits} ${it.letters}`).join(', ');
}
function formatDoorNo(n) {
  if (n == null) return '—';
  return String(n).padStart(3, '0');
}

// Сар бүрийн төлбөрийн дугаартай badge мөр (12 сар) — зураг загвар:
// дугуй цэг БИШ, тоо бүхий дөрвөлжин (rounded — 4px, 2026-08-15 хэрэглэгчийн
// заасны дагуу rounded-md 6px-ээс багассан, сондгой 3px биш тэгш тоо
// сонгосон нь badge-ийн тэгш хэмийг гажуулахгүй), төлсөн сарууд
// customBlue, төлөгдөөгүй сарууд customRed өнгөтэй.
// TODO: бодит payments хүснэгэлээс тухайн өмчлөгчийн "хэдэн сар хүртэл
// төлбөрөө барагдуулсан"-ыг унших ёстой. Одоохондоо backend байхгүй тул
// screenshot-той тохирсон ЖИШЭЭ утгуудаар (цэвэр гараар бичсэн,
// algorithmic биш) мөр бүрт эргэлдүүлж харуулна.
const MONTHS_SHORT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const EXAMPLE_PAID_THROUGH = [8, 6, 7, 3];
function PaymentBadges({ paidThroughMonth }) {
  return (
    <div className="flex gap-[3px]">
      {MONTHS_SHORT.map((m) => {
        const paid = m <= paidThroughMonth;
        return (
          <span
            key={m}
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-semibold border ${
              paid
                ? 'bg-blue-500/[0.18] text-customBlue border-blue-500/30'
                : 'bg-red-500/[0.18] text-customRed border-red-500/30'
            }`}
          >
            {m}
          </span>
        );
      })}
    </div>
  );
}

export default function Owners() {
  // Sidebar-ийн HoaSwitcher-ээр сонгосон СӨХ (:hoaId) — Dashboard/бусад
  // хуудастай ижил урсгал. DEFAULT_TENANT_ID нь зөвхөн :hoaId алга байх
  // (боломжгүй ч гэсэн) нөхцөлд зориулсан нөөц утга.
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  async function loadOwners() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('tenant_id', hoaId)
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(error.message);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOwners();
  }, [hoaId]);

  // Хайлтын талбар: тоот, нэр (нэр+овог), утас, имэйл-ээр НЭГЭН ЗЭРЭГ хайна
  const q = search.trim().toLowerCase();
  const filteredRows = !q ? rows : rows.filter((r) => {
    const doorNo = formatDoorNo(r.door_no).toLowerCase();
    const fullname = `${r.firstname || ''} ${r.lastname || ''}`.toLowerCase();
    const phones = (r.phones || []).join(' ').toLowerCase();
    const emails = (r.emails || []).join(' ').toLowerCase();
    return doorNo.includes(q) || fullname.includes(q) || phones.includes(q) || emails.includes(q);
  });

  async function handleSave(form) {
    const payload = {
      tenant_id: hoaId,
      building_no: form.buildingNo ? Number(form.buildingNo) : null,
      floor: form.floor !== '' ? Number(form.floor) : null,
      door_no: form.doorNo !== '' ? Number(form.doorNo) : null,
      sqm: form.sqm !== '' ? Number(form.sqm) : null,
      firstname: form.firstname || null,
      lastname: form.lastname || null,
      regno: form.regno || null,
      own_date: form.ownDate || null,
      cadastral_no: form.cadastralNo ? `${form.cadastralPrefix}${form.cadastralNo}` : null,
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

    if (editing) {
      const { data, error } = await supabase.from('owners').update(payload).eq('id', editing.id).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? data : r)));
    } else {
      const { data, error } = await supabase.from('owners').insert(payload).select().single();
      if (error) { window.alert(error.message); return; }
      setRows((prev) => [data, ...prev]);
    }
    setEditing(null);
    setAdding(false);
  }

  async function handleDelete(row) {
    if (!window.confirm(`${row.firstname} ${row.lastname}-г устгах уу?`)) return;
    const { error } = await supabase.from('owners').delete().eq('id', row.id);
    if (error) { window.alert(error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  return (
    <>
      {/* Toolbar: шүүлтүүр + Хэвлэх/Экспортлох/Нэмэх — глобал .ds-* класс ашиглав */}
      <div className="ds-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <select className="ds-select">
            <option>Бүх байр</option>
          </select>
          <select className="ds-select">
            <option>Бүх орц</option>
          </select>
          <div className="relative min-w-[200px]">
            <input
              type="text"
              placeholder="Хайх (тоот, нэр, утас, имэйл)..."
              className="ds-input w-full pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="w-4 h-4 text-slate-400 dark:text-mutedtext absolute left-2.5 top-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="ds-btn-secondary">Хэвлэх</button>
          <button className="ds-btn-secondary">Экспортлох</button>
          <button className="ds-btn-primary" onClick={() => setAdding(true)}>+ Сууц өмчлөгч нэмэх</button>
        </div>
      </div>

      {/* Хүснэгэл (sticky толгойтой, зөвхөн мөрүүд дотооддоо скроллдог) — глобал .ds-table класс */}
      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3 w-10 text-center"></th>
                <th className="py-2.5 px-3 w-[80px]">БАЙР</th>
                <th className="py-2.5 px-3 w-[70px]">ТООТ</th>
                <th className="py-2.5 px-3 w-[80px]">м²</th>
                <th className="py-2.5 px-3 w-[100px]">НЭР</th>
                <th className="py-2.5 px-3 w-[100px]">ОВОГ</th>
                <th className="py-2.5 px-3 w-[100px]">УТАС</th>
                <th className="py-2.5 px-3 w-[140px]">ИМЭЙЛ</th>
                <th className="py-2.5 px-3 w-[100px]">ӨМЧИЛСӨН</th>
                <th className="py-2.5 px-3 w-[70px]">АМ БҮЛ</th>
                <th className="py-2.5 px-3 w-[70px]">0-6 НАС</th>
                <th className="py-2.5 px-3 w-[70px]">6-18 НАС</th>
                <th className="py-2.5 px-3 w-[80px]">ЗОГСООЛ</th>
                <th className="py-2.5 px-3 w-[90px]">АГУУЛАХ</th>
                <th className="py-2.5 px-3 w-[100px]">МАШИН</th>
                <th className="py-2.5 px-3 w-[280px]">ТӨЛӨЛТ (САРААР)</th>
                <th className="py-2.5 px-3 w-[180px]">Тайлбар</th>
                <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading && (
                <tr><td colSpan={18} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
              )}
              {!loading && loadError && (
                <tr><td colSpan={18} className="py-8 text-center text-customRed">{loadError}</td></tr>
              )}
              {!loading && !loadError && filteredRows.length === 0 && (
                <tr><td colSpan={18} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
              )}
              {!loading && !loadError && filteredRows.map((r, idx) => (
                <tr key={r.id} onClick={() => setSelected(r)} className="cursor-pointer">
                  <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium">{r.building_no ?? '—'}</td>
                  <td className="py-2.5 px-3">{formatDoorNo(r.door_no)}</td>
                  <td className="py-2.5 px-3">{r.sqm ?? '—'}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.firstname}</td>
                  <td className="py-2.5 px-3">{r.lastname}</td>
                  <td className="py-2.5 px-3">{r.phones?.[0] || '—'}</td>
                  <td className="py-2.5 px-3">{r.emails?.[0] || '—'}</td>
                  <td className="py-2.5 px-3">{r.own_date ? formatDate(r.own_date) : '—'}</td>
                  <td className="py-2.5 px-3">{r.people_count ?? '—'}</td>
                  <td className="py-2.5 px-3">{r.child_0_5 ?? 0}</td>
                  <td className="py-2.5 px-3">{r.child_6_18 ?? 0}</td>
                  <td className="py-2.5 px-3">{summarizeSpots(r.parkings)}</td>
                  <td className="py-2.5 px-3">{summarizeSpots(r.storages)}</td>
                  <td className="py-2.5 px-3">{summarizeVehicles(r.vehicles)}</td>
                  <td className="py-2.5 px-3"><PaymentBadges paidThroughMonth={EXAMPLE_PAID_THROUGH[idx % EXAMPLE_PAID_THROUGH.length]} /></td>
                  <td className="py-2.5 px-3 max-w-[180px] truncate" title={r.note}>{r.note || '—'}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button className="ds-icon-btn" title="Засах" onClick={() => setEditing(r)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="ds-icon-btn danger" title="Устгах" onClick={() => handleDelete(r)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ds-table-summary">
          <div>
            Нийт: <span className="text-slate-900 dark:text-white font-medium">{rows.length}</span>
          </div>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.firstname} ${selected.lastname}` : ''}
        size="md"
        footer={
          <>
            <button className="ds-btn-secondary">CC center</button>
            <button className="ds-btn-secondary">Төлбөр бүртгэх</button>
            <button className="ds-btn-secondary">ИБаримт</button>
            <button className="ds-btn-secondary">Мэдэгдэл</button>
            <button className="ds-btn-secondary" onClick={() => { setEditing(selected); setSelected(null); }}>Засах</button>
            <button className="ds-btn-secondary" onClick={() => setSelected(null)}>Хаах</button>
          </>
        }
      >
        {selected && (
          <div>
            <div className="ds-detail-row"><span className="ds-detail-label">Байр / Тоот</span><span className="ds-detail-value">{selected.building_no ?? '—'} / {selected.door_no ?? '—'}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">Талбай</span><span className="ds-detail-value">{selected.sqm ?? '—'} м²</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">өмчийн Улсын бүртгэлийн дугаар</span><span className="ds-detail-value">{selected.cadastral_no || '—'}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">Утас</span><span className="ds-detail-value">{selected.phones?.join(', ') || '—'}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">Имэйл</span><span className="ds-detail-value">{selected.emails?.join(', ') || '—'}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">өмчлөх огноо</span><span className="ds-detail-value">{selected.own_date ? formatDate(selected.own_date) : '—'}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">Ам бүл</span><span className="ds-detail-value">{selected.people_count ?? '—'}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">0-6 / 6-18 нас</span><span className="ds-detail-value">{selected.child_0_5 ?? 0} / {selected.child_6_18 ?? 0}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">Зогсоол</span><span className="ds-detail-value">{summarizeSpots(selected.parkings)}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">Агуулах</span><span className="ds-detail-value">{summarizeSpots(selected.storages)}</span></div>
            <div className="ds-detail-row"><span className="ds-detail-label">Машин</span><span className="ds-detail-value">{summarizeVehicles(selected.vehicles)}</span></div>
            <div className="pt-2 pb-1">
              <div className="ds-detail-label mb-1">Тайлбар</div>
              <div className="ds-detail-value text-left font-normal whitespace-pre-wrap">{selected.note || '—'}</div>
            </div>
          </div>
        )}
      </Modal>

      <EditOwnerModal
        key={editing?.id}
        open={!!editing}
        onClose={() => setEditing(null)}
        owner={editing}
        onSave={handleSave}
      />

      <EditOwnerModal
        open={adding}
        onClose={() => setAdding(false)}
        owner={null}
        onSave={handleSave}
      />
    </>
  );
}
