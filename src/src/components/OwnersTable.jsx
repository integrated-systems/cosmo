import { formatDate } from '../lib/format';
import { summarizeSpots, summarizeVehicles, summarizeGridSpots, formatDoorNo, formatStructureValue } from '../lib/ownersFormat';
import { useGridSpots } from '../hooks/useGridSpots';
import PaymentBadges from './PaymentBadges';
import { EditIcon, DeleteIcon } from './icons/Icons';

// Owners.jsx-ийн хүснэгэл (thead+tbody, sticky толгойтой) — 2026-08-15
// хэрэглэгчийн заасны дагуу тусдаа компонент болгов (Rule of two).
// 2026-08-17 (4-р засвар): "БАЙР" ба "ТООТ" баганын хооронд динамик
// "ДАВХАР"/"ОРЦ" багана нэмэв — AddressConfig.jsx-д тухайн байрны
// сонгосон "Дугаарын бүтэц" (structure_type)-ээс хамаарна.
function findLayoutRow(unitLayouts, r) {
  return unitLayouts.find(
    (u) => u.building_no === r.building_no && u.floor === r.floor && u.door_no === r.door_no
  );
}

export default function OwnersTable({ rows, unitLayouts = [], loading, loadError, onRowClick, onEdit, onDelete, canEdit = true, canDelete = true, hoaId, year, getYearSummary, overdueColor, atRiskColor, pendingColor, paidColor }) {
  const { gridParkingSpots, gridStorageSpots } = useGridSpots(hoaId);
  // Ихэнх тохиолдолд tenant бүхэлдээ НЭГ дугаарлалтын бүтэц ашиглана
  // (анхны байрны утгаар баганын гарчгийг тодорхойлно, мөр бүр өөрийн
  // бодит утгыг харуулна).
  const headerStructure = unitLayouts[0]?.structure_type || 'floor';
  const structureLabel = headerStructure === 'entrance' ? 'ОРЦ' : 'ДАВХАР';
  // 2026-09-13: Хэрэглэгчийн хүсэлтээр — Байр, дараа нь Давхар, дараа
  // нь Тоот 3 баганыг угсруулан A-Z дараалалд оруулав.
  const sortedRows = [...rows].sort((a, b) => {
    const byBuilding = String(a.building_no ?? '').localeCompare(String(b.building_no ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    if (byBuilding !== 0) return byBuilding;
    const byFloor = String(a.floor ?? '').localeCompare(String(b.floor ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    if (byFloor !== 0) return byFloor;
    return String(a.door_no ?? '').localeCompare(String(b.door_no ?? ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto overscroll-contain">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3 w-10 text-center"></th>
              <th className="py-2.5 px-3 w-[80px]">БАЙР</th>
              <th className="py-2.5 px-3 w-[80px]">{structureLabel}</th>
              <th className="py-2.5 px-3 w-[70px]">ТООТ</th>
              <th className="py-2.5 px-3 w-[80px]">м²</th>
              <th className="py-2.5 px-3 w-[140px]">ӨУБД СУУЦ</th>
              <th className="py-2.5 px-3 w-[100px]">ӨМЧИЛСӨН</th>
              <th className="py-2.5 px-3 w-[100px]">НЭР</th>
              <th className="py-2.5 px-3 w-[100px]">ОВОГ</th>
              <th className="py-2.5 px-3 w-[100px]">УТАС</th>
              <th className="py-2.5 px-3 w-[140px]">ИМЭЙЛ</th>
              <th className="py-2.5 px-3 w-[110px]">РЕГИСТР</th>
              <th className="py-2.5 px-3 w-[70px]">АМ БҮЛ</th>
              <th className="py-2.5 px-3 w-[70px]">0-6 НАС</th>
              <th className="py-2.5 px-3 w-[70px]">6-18 НАС</th>
              <th className="py-2.5 px-3 w-[80px]">ЗОГСООЛ</th>
              <th className="py-2.5 px-3 w-[90px]">АГУУЛАХ</th>
              <th className="py-2.5 px-3 w-[100px]">МАШИН</th>
              <th className="py-2.5 px-3 w-[280px]">ТӨЛӨЛТ (САРААР)</th>
              <th className="py-2.5 px-3 w-[180px]">ТЭМДЭГЛЭЛ</th>
              <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading && (
              <tr><td colSpan={21} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
            )}
            {!loading && loadError && (
              <tr><td colSpan={21} className="py-8 text-center text-customRed">{loadError}</td></tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr><td colSpan={21} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
            )}
            {!loading && !loadError && sortedRows.map((r, idx) => {
              const layoutRow = findLayoutRow(unitLayouts, r);
              const structureVal = layoutRow?.structure_type === 'entrance'
                ? layoutRow.entrance_no
                : r.floor;
              return (
              <tr key={r.id} onClick={() => onRowClick(r)} className="cursor-pointer">
                <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">
                  {idx + 1}
                </td>
                <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium">{r.building_no ?? '—'}</td>
                <td className="py-2.5 px-3">{formatStructureValue(structureVal)}</td>
                <td className="py-2.5 px-3">{formatDoorNo(r.door_no, layoutRow?.structure_type)}</td>
                <td className="py-2.5 px-3">{r.sqm ?? '—'}</td>
                <td className="py-2.5 px-3">{r.property_no || '—'}</td>
                <td className="py-2.5 px-3">{r.own_date ? formatDate(r.own_date) : '—'}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.firstname}</td>
                <td className="py-2.5 px-3">{r.lastname}</td>
                <td className="py-2.5 px-3">{r.phones?.[0] || '—'}</td>
                <td className="py-2.5 px-3">{r.emails?.[0] || '—'}</td>
                <td className="py-2.5 px-3">{r.regno || '—'}</td>
                <td className="py-2.5 px-3">{r.people_count ?? '—'}</td>
                <td className="py-2.5 px-3">{r.child_0_5 ?? 0}</td>
                <td className="py-2.5 px-3">{r.child_6_18 ?? 0}</td>
                <td className="py-2.5 px-3">{[summarizeSpots(r.parkings), summarizeGridSpots(r.grid_parkings, gridParkingSpots)].filter((s) => s !== '—').join(', ') || '—'}</td>
                <td className="py-2.5 px-3">{[summarizeSpots(r.storages), summarizeGridSpots(r.grid_storages, gridStorageSpots)].filter((s) => s !== '—').join(', ') || '—'}</td>
                <td className="py-2.5 px-3">{summarizeVehicles(r.vehicles)}</td>
                <td className="py-2.5 px-3"><PaymentBadges {...getYearSummary(layoutRow?.id || r.id, year)} overdueColor={overdueColor} atRiskColor={atRiskColor} pendingColor={pendingColor} paidColor={paidColor} currentMonth={year < new Date().getFullYear() ? 12 : year > new Date().getFullYear() ? 0 : new Date().getMonth() + 1} /></td>
                <td className="py-2.5 px-3 max-w-[180px] truncate" title={r.note}>{r.note || '—'}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <button className="ds-icon-btn" title="Засах" onClick={() => onEdit(r)}>
                      <EditIcon />
                    </button>
                  )}
                  {canDelete && (
                    <button className="ds-icon-btn danger" title="Устгах" onClick={() => onDelete(r)}>
                      <DeleteIcon />
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ds-table-summary">
        <div>
          Нийт: <span className="text-slate-900 dark:text-white font-medium">{rows.length}</span>
        </div>
      </div>
    </div>
  );
}
