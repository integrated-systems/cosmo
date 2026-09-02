import { formatDateTime } from '../lib/format';
import { EditIcon, DeleteIcon } from './icons/Icons';

// "Мэдээний агрегат" (/news, 2-р таб) — бүх мэдээг удирдах СИСАДМИН/
// менежерийн таблиц. Owners.jsx-ийн .ds-table загварыг дахин ашигласан
// (Rule of two) — 2026-08-19 хэрэглэгчийн screenshot-оор өгсөн баганын
// бүтэц: ОГНОО/АНГИЛАЛ/ГАРЧИГ/ТӨЛӨВ/ОНЦЛОХ/ШУУРХАЙ/ҮЙЛДЭЛ (ПАБЛИК багана
// 2026-08-19 хэрэглэгчийн шийдвэрээр бүрмөсөн арилгагдсан — /news
// хуудсыг зөвхөн дотоод tenant-ийн гишүүдэд зориулна).
// ТӨЛӨВ багана: 2026-08-19 хэрэглэгчийн заасны дагуу НЭГ товчоор
// Нуух/Нийтлэх сэлгэнэ (дарангуут Нуух болж, ахиад дарангуут Нийтлэх
// болно) — өмнөх статик текст+badge-ийг сольсон.
function StatusToggle({ status, onToggle }) {
  const isPublished = status === 'published';
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`text-xs font-medium px-2 py-1 rounded border transition-colors ${
        isPublished
          ? 'border-customGreen text-customGreen hover:bg-customGreen/10'
          : 'border-bordercol text-mutedtext hover:border-customBlue hover:text-customBlue'
      }`}
    >
      {isPublished ? 'Нуух' : 'Нийтлэх'}
    </button>
  );
}

function YesNoCell({ value }) {
  return value ? (
    <span className="text-customBlue font-medium">Тийм</span>
  ) : (
    <span className="text-mutedtext">—</span>
  );
}

export default function NewsAggregateTable({ rows, loading, onRowClick, onEdit, onDelete, onToggleStatus, canEdit = true, canDelete = true }) {
  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3 w-[130px]">ОГНОО</th>
              <th className="py-2.5 px-3 w-[140px]">АНГИЛАЛ</th>
              <th className="py-2.5 px-3">ГАРЧИГ</th>
              <th className="py-2.5 px-3 w-[110px]">ТӨЛӨВ</th>
              <th className="py-2.5 px-3 w-[80px]">ОНЦЛОХ</th>
              <th className="py-2.5 px-3 w-[80px]">ШУУРХАЙ</th>
              <th className="py-2.5 px-3 w-[110px]">СЭРЭМЖЛҮҮЛЭГ</th>
              <th className="py-2.5 px-3 w-[80px]">НОЦТОЙ</th>
              <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading && (
              <tr><td colSpan={9} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} onClick={() => onRowClick(r)} className="cursor-pointer">
                <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTime(r.datetime)}</td>
                <td className="py-2.5 px-3">{r.category}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.title}</td>
                <td className="py-2.5 px-3">
                  <StatusToggle status={r.status} onToggle={() => onToggleStatus(r)} />
                </td>
                <td className="py-2.5 px-3"><YesNoCell value={r.featured} /></td>
                <td className="py-2.5 px-3"><YesNoCell value={r.urgent} /></td>
                <td className="py-2.5 px-3"><YesNoCell value={r.warning} /></td>
                <td className="py-2.5 px-3"><YesNoCell value={r.critical} /></td>
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
    </div>
  );
}
