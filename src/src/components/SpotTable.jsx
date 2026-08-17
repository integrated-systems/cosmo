import { EditIcon } from './icons/Icons';

// Property.jsx-ийн Зогсоол/Агуулах таб — grid БИШ, Owners.jsx-ийн
// .ds-table загварыг дахин ашигласан хүснэгэл (Rule of two, 2026-08-17
// хэрэглэгчийн заасны дагуу).
export default function SpotTable({ rows, emptyLabel }) {
  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3 w-10 text-center"></th>
              <th className="py-2.5 px-3 w-[100px]">БАЙР</th>
              <th className="py-2.5 px-3 w-[120px]">БАЙРШИЛ</th>
              <th className="py-2.5 px-3 w-[160px]">ӨМЧЛӨГЧ</th>
              <th className="py-2.5 px-3 w-[120px]">УТАС</th>
              <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-darktext">{emptyLabel || 'Мэдээлэл олдсонгүй'}</td></tr>
            )}
            {rows.map((r, idx) => (
              <tr key={r.id} onClick={r.onClick} className="cursor-pointer">
                <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.buildingNo || '—'}</td>
                <td className="py-2.5 px-3">{r.location}</td>
                <td className="py-2.5 px-3">{r.ownerName || '—'}</td>
                <td className="py-2.5 px-3">{r.phone || '—'}</td>
                <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button className="ds-icon-btn" title="Харах" onClick={r.onClick}>
                    <EditIcon />
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
  );
}
