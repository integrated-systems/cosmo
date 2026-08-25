import { formatDate } from '../lib/format';
import { summarizeSpots, summarizeVehicles } from '../lib/spotVehicleFormat';
import PaymentBadges, { EXAMPLE_PAID_THROUGH } from './PaymentBadges';
import { EditIcon, DeleteIcon } from './icons/Icons';

// Clientele.jsx-ийн хүснэгэл — 2026-08-16 хэрэглэгчийн тодорхой заасан
// баганын дараалал: # | Хуулийн этгээд | Регистр | м² | Гүйцэтгэх
// удирдлага | Гар утас | Утас | Имэйл | Гэрээ № | Гэрээ эхлэх | Гэрээ
// дуусах | Зогсоол | Агуулах | Машин | Төлөлт (Сараар) | Тайлбар | Үйлдэл.
// OwnersTable.jsx-ийн загвар/дизайныг дахин ашигласан (Rule of two).
export default function ClienteleTable({ rows, loading, loadError, onRowClick, onEdit, onDelete, canEdit = true, canDelete = true }) {
  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3 w-10 text-center"></th>
              <th className="py-2.5 px-3 w-[160px]">ХУУЛИЙН ЭТГЭЭД</th>
              <th className="py-2.5 px-3 w-[100px]">РЕГИСТР</th>
              <th className="py-2.5 px-3 w-[70px]">М²</th>
              <th className="py-2.5 px-3 w-[140px]">ӨМЧИЙН УЛСЫН БҮРТГЭЛИЙН ДУГААР</th>
              <th className="py-2.5 px-3 w-[140px]">ГҮЙЦЭТГЭХ УДИРДЛАГА</th>
              <th className="py-2.5 px-3 w-[100px]">ГАР УТАС</th>
              <th className="py-2.5 px-3 w-[100px]">УТАС</th>
              <th className="py-2.5 px-3 w-[140px]">ИМЭЙЛ</th>
              <th className="py-2.5 px-3 w-[100px]">ГЭРЭЭ №</th>
              <th className="py-2.5 px-3 w-[100px]">ГЭРЭЭ ЭХЛЭХ</th>
              <th className="py-2.5 px-3 w-[100px]">ГЭРЭЭ ДУУСАХ</th>
              <th className="py-2.5 px-3 w-[80px]">ЗОГСООЛ</th>
              <th className="py-2.5 px-3 w-[90px]">АГУУЛАХ</th>
              <th className="py-2.5 px-3 w-[100px]">МАШИН</th>
              <th className="py-2.5 px-3 w-[280px]">ТӨЛӨЛТ (САРААР)</th>
              <th className="py-2.5 px-3 w-[180px]">ТАЙЛБАР</th>
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
            {!loading && !loadError && rows.length === 0 && (
              <tr><td colSpan={18} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
            )}
            {!loading && !loadError && rows.map((r, idx) => (
              <tr key={r.id} onClick={() => onRowClick(r)} className="cursor-pointer">
                <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.legal_entity_name || '—'}</td>
                <td className="py-2.5 px-3">{r.reg_no || '—'}</td>
                <td className="py-2.5 px-3">{r.sqm ?? '—'}</td>
                <td className="py-2.5 px-3">{r.property_no || '—'}</td>
                <td className="py-2.5 px-3">{r.ceo_first_name_last_name || '—'}</td>
                <td className="py-2.5 px-3">{r.mobile || '—'}</td>
                <td className="py-2.5 px-3">{r.phone || '—'}</td>
                <td className="py-2.5 px-3">{r.email || '—'}</td>
                <td className="py-2.5 px-3">{r.contract_no || '—'}</td>
                <td className="py-2.5 px-3">{r.contract_start ? formatDate(r.contract_start) : '—'}</td>
                <td className="py-2.5 px-3">{r.contract_end ? formatDate(r.contract_end) : '—'}</td>
                <td className="py-2.5 px-3">{summarizeSpots(r.parkings)}</td>
                <td className="py-2.5 px-3">{summarizeSpots(r.storages)}</td>
                <td className="py-2.5 px-3">{summarizeVehicles(r.vehicles)}</td>
                <td className="py-2.5 px-3"><PaymentBadges paidThroughMonth={EXAMPLE_PAID_THROUGH[idx % EXAMPLE_PAID_THROUGH.length]} /></td>
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
  );
}
