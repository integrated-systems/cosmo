import { summarizeGridSpots, summarizeVehicles, summarizePropertyNos, extractGridItemUuid } from '../lib/spotVehicleFormat';
import PaymentBadges from './PaymentBadges';
import { useGridSpots } from '../hooks/useGridSpots';
import { EditIcon, DeleteIcon } from './icons/Icons';

// 2026-09-13: "Зогсоол, агуулах дангаар өмчлөгч" таб-ийн хүснэгэл —
// OwnersTable.jsx-тэй төстэй ч, Байр/Давхар/Тоот баганагүй (учир нь
// эдгээр өмчлөгч сууцгүй). Төлбөрийн индикатор (PaymentBadges) энд
// grid_parkings/grid_storages-ийн 1-р задалсан UUID-г тогтвортой
// нэгж болгож ашиглана (Invoice.jsx-тэй ижил зарчим).
export default function OwnersSpotOnlyTable({ rows, loading, loadError, onRowClick, onEdit, onDelete, canEdit = true, canDelete = true, hoaId, year, getYearSummary }) {
  const { gridParkingSpots, gridStorageSpots } = useGridSpots(hoaId);

  const sortedRows = [...rows].sort((a, b) => `${a.lastname || ''}${a.firstname || ''}`.localeCompare(`${b.lastname || ''}${b.firstname || ''}`, undefined, { numeric: true, sensitivity: 'base' }));

  function stableTargetId(r) {
    const parkingUuid = r.has_grid_parking && Array.isArray(r.grid_parkings) && r.grid_parkings.length > 0 ? extractGridItemUuid(r.grid_parkings[0]?.id) : null;
    if (parkingUuid) return parkingUuid;
    const storageUuid = r.has_grid_storage && Array.isArray(r.grid_storages) && r.grid_storages.length > 0 ? extractGridItemUuid(r.grid_storages[0]?.id) : null;
    if (storageUuid) return storageUuid;
    return r.id;
  }

  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto overscroll-contain">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3">№</th>
              <th className="py-2.5 px-3">НЭР</th>
              <th className="py-2.5 px-3">ОВОГ</th>
              <th className="py-2.5 px-3">УТАС</th>
              <th className="py-2.5 px-3">И-МЭЙЛ</th>
              <th className="py-2.5 px-3">РЕГИСТР</th>
              <th className="py-2.5 px-3">ЗОГСООЛ</th>
              <th className="py-2.5 px-3">ӨУБД ЗОГСООЛ</th>
              <th className="py-2.5 px-3">АГУУЛАХ</th>
              <th className="py-2.5 px-3">ӨУБД АГУУЛАХ</th>
              <th className="py-2.5 px-3">МАШИН</th>
              <th className="py-2.5 px-3">ТӨЛӨЛТ (САРААР)</th>
              <th className="py-2.5 px-3">ТЭМДЭГЛЭЛ</th>
              <th className="py-2.5 px-3 text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading ? (
              <tr><td colSpan={14} className="py-6 text-center text-mutedtext">Ачаалж байна...</td></tr>
            ) : loadError ? (
              <tr><td colSpan={14} className="py-6 text-center text-customRed">{loadError}</td></tr>
            ) : sortedRows.length === 0 ? (
              <tr><td colSpan={14} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
            ) : sortedRows.map((r, idx) => (
              <tr key={r.id} onClick={() => onRowClick(r)} className="cursor-pointer">
                <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.firstname}</td>
                <td className="py-2.5 px-3">{r.lastname}</td>
                <td className="py-2.5 px-3">{r.phones?.[0] || '—'}</td>
                <td className="py-2.5 px-3">{r.emails?.[0] || '—'}</td>
                <td className="py-2.5 px-3">{r.regno || '—'}</td>
                <td className="py-2.5 px-3">{summarizeGridSpots(r.grid_parkings, gridParkingSpots)}</td>
                <td className="py-2.5 px-3">{summarizePropertyNos(r.grid_parkings)}</td>
                <td className="py-2.5 px-3">{summarizeGridSpots(r.grid_storages, gridStorageSpots)}</td>
                <td className="py-2.5 px-3">{summarizePropertyNos(r.grid_storages)}</td>
                <td className="py-2.5 px-3">{summarizeVehicles(r.vehicles)}</td>
                <td className="py-2.5 px-3"><PaymentBadges {...getYearSummary(stableTargetId(r), year)} currentMonth={year < new Date().getFullYear() ? 12 : year > new Date().getFullYear() ? 0 : new Date().getMonth() + 1} /></td>
                <td className="py-2.5 px-3 max-w-[180px] truncate" title={r.note}>{r.note || '—'}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  {canEdit && <button className="ds-icon-btn" onClick={(ev) => { ev.stopPropagation(); onEdit(r); }}><EditIcon /></button>}
                  {canDelete && <button className="ds-icon-btn danger" onClick={(ev) => { ev.stopPropagation(); onDelete(r); }}><DeleteIcon /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
