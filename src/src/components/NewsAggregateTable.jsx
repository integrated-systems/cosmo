import { formatDateTime } from '../lib/format';
import { EditIcon, DeleteIcon } from './icons/Icons';

// "Мэдээний агрегат" (/news, 2-р таб) — бvх мэдээг удирдах СИСАДМИН/
// менежерийн таблиц. Owners.jsx-ийн .ds-table загварыг дахин ашигласан
// (Rule of two) — 2026-08-19 хэрэглэгчийн screenshot-оор өгсөн баганын
// бvтэц: ОГНОО/АНГИЛАЛ/ГАРЧИГ/ТӨЛӨВ/ОНЦЛОХ/ШУУРХАЙ/ПАБЛИК/ҮЙЛДЭЛ.
function YesNoCell({ value }) {
  return value ? (
    <span className="text-customBlue font-medium">Тийм</span>
  ) : (
    <span className="text-mutedtext">—</span>
  );
}

function StatusCell({ status }) {
  if (status === 'published') {
    return <span className="text-customGreen">✓ Нийтлэгдсэн</span>;
  }
  return <span className="text-mutedtext">Ноорог</span>;
}

export default function NewsAggregateTable({ rows, loading, onEdit, onDelete }) {
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
              <th className="py-2.5 px-3 w-[80px]">ПАБЛИК</th>
              <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading && (
              <tr><td colSpan={8} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-darktext">Мэдээлэл олдсонгvй</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTime(r.datetime)}</td>
                <td className="py-2.5 px-3">{r.category}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.title}</td>
                <td className="py-2.5 px-3"><StatusCell status={r.status} /></td>
                <td className="py-2.5 px-3"><YesNoCell value={r.featured} /></td>
                <td className="py-2.5 px-3"><YesNoCell value={r.urgent} /></td>
                <td className="py-2.5 px-3"><YesNoCell value={r.isPublic} /></td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button className="ds-icon-btn" title="Засах" onClick={() => onEdit(r)}>
                    <EditIcon />
                  </button>
                  <button className="ds-icon-btn danger" title="Устгах" onClick={() => onDelete(r)}>
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
