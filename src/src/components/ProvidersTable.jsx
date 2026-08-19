import { formatDate } from '../lib/format';
import { EditIcon, DeleteIcon } from './icons/Icons';

// "Харилцагчийн бvртгэл" (/providers) хуудасны хvснэгэл — 2026-08-19
// хэрэглэгчийн screenshot-оор өгсөн баганын дараалал: # | Хуулийн
// этгээдийн нэр | Гэрчилгээ № | Гvйцэтгэх удирдлага | Гар утас | Утас |
// Мэйл | Гэрээ № | Гэрээ эхлэх | Гэрээ дуусах | Тэмдэглэл | Vйлдэл.
// ClienteleTable.jsx-ийн загвар/дизайныг дахин ашигласан (Rule of two).
// Owners/Clientele-тэй одоогоор ХОЛБООГvй, зvгээр vйлчилгээ vзvvлэгч
// (provider) байгууллагын бvртгэл.
export default function ProvidersTable({ rows, loading, loadError, onRowClick, onEdit, onDelete }) {
  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3 w-10 text-center"></th>
              <th className="py-2.5 px-3 w-[180px]">ХУУЛИЙН ЭТГЭЭДИЙН НЭР</th>
              <th className="py-2.5 px-3 w-[100px]">ГЭРЧИЛГЭЭ №</th>
              <th className="py-2.5 px-3 w-[140px]">ГҮЙЦЭТГЭХ УДИРДЛАГА</th>
              <th className="py-2.5 px-3 w-[100px]">ГАР УТАС</th>
              <th className="py-2.5 px-3 w-[100px]">УТАС</th>
              <th className="py-2.5 px-3 w-[160px]">МЭЙЛ</th>
              <th className="py-2.5 px-3 w-[100px]">ГЭРЭЭ №</th>
              <th className="py-2.5 px-3 w-[100px]">ГЭРЭЭ ЭХЛЭХ</th>
              <th className="py-2.5 px-3 w-[100px]">ГЭРЭЭ ДУУСАХ</th>
              <th className="py-2.5 px-3 w-[220px]">ТЭМДЭГЛЭЛ</th>
              <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading && (
              <tr><td colSpan={12} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
            )}
            {!loading && loadError && (
              <tr><td colSpan={12} className="py-8 text-center text-customRed">{loadError}</td></tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr><td colSpan={12} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
            )}
            {!loading && !loadError && rows.map((r, idx) => (
              <tr key={r.id} onClick={() => onRowClick(r)} className="cursor-pointer">
                <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.legal_entity_name || '—'}</td>
                <td className="py-2.5 px-3">{r.certificate_no || '—'}</td>
                <td className="py-2.5 px-3">{r.ceo_name || '—'}</td>
                <td className="py-2.5 px-3">{r.mobile || '—'}</td>
                <td className="py-2.5 px-3">{r.phone || '—'}</td>
                <td className="py-2.5 px-3">{r.email || '—'}</td>
                <td className="py-2.5 px-3">{r.contract_no || '—'}</td>
                <td className="py-2.5 px-3">{r.contract_start ? formatDate(r.contract_start) : '—'}</td>
                <td className="py-2.5 px-3">{r.contract_end ? formatDate(r.contract_end) : '—'}</td>
                <td className="py-2.5 px-3 max-w-[220px] truncate" title={r.note}>{r.note || '—'}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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

      <div className="ds-table-summary">
        <div>
          Нийт: <span className="text-slate-900 dark:text-white font-medium">{rows.length}</span>
        </div>
      </div>
    </div>
  );
}
