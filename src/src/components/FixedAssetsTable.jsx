import { formatDate, formatMoney } from '../lib/format';
import { statusLabel, statusClassName } from '../lib/fixedAssetsFormat';
import { EditIcon, DeleteIcon } from './icons/Icons';
import BarcodeImage from './BarcodeImage';

// FixedAssets.jsx-ийн хүснэгэл — ClienteleTable.jsx-ийн бүтцийг дахин
// ашигласан (Rule of two). Хуучин "suh" прототипийн баганын нэрс,
// дараалал бүрэн хадгалагдсан: БАРКОД/НЭР,БРЕНД/МАРК,СЕРИАЛ/ТӨРӨЛ/
// Т.ХЭМЖЭЭ/АВСАН ОГНОО/ХУДАЛДАН АВСАН ҮНЭ/ХУРИМТЛАГДСАН ЭЛЭГДЭЛ/
// ДАНСНЫ ҮЛДЭГДЭЛ ҮНЭ/БАЙРШИЛ/ХАРИУЦАГЧ/ТӨЛӨВ + ҮЙЛДЭЛ (шинэ,
// EditIcon/DeleteIcon — Cosmo-ийн стандарт action багана).
// 2026-09-07 (2): хэрэглэгчийн заасны дагуу "НИЙТ" нийлбэр мөр (thead-
// ийн дор) болон доод ds-table-summary footer-ыг бүрэн устгав — эдгээр
// нь FixedAssets.jsx-ийн тойм статистик картуудтай (Нийт хөрөнгийн
// тоо/Худалдан авсан нийт үнэ/Актлагдсан) шууд давхцаж байсан тул.
export default function FixedAssetsTable({ rows, loading, loadError, onEdit, onDelete, onPrint, canEdit = true, canDelete = true }) {
  const colCount = 14;

  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto overscroll-contain">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">№</th>
              <th className="py-2.5 px-3 w-[90px]">БАРКОД</th>
              <th className="py-2.5 px-3 w-[150px]">НЭР, БРЕНД</th>
              <th className="py-2.5 px-3 w-[110px]">МАРК/СЕРИАЛ</th>
              <th className="py-2.5 px-3 w-[130px]">ТӨРӨЛ</th>
              <th className="py-2.5 px-3 w-[90px]">Т.ХЭМЖЭЭ</th>
              <th className="py-2.5 px-3 w-[100px]">АВСАН ОГНОО</th>
              <th className="py-2.5 px-3 w-[110px] text-right">ХУДАЛДАН АВСАН ҮНЭ</th>
              <th className="py-2.5 px-3 w-[110px] text-right">ХУРИМТЛАГДСАН ЭЛЭГДЭЛ</th>
              <th className="py-2.5 px-3 w-[110px] text-right">ДАНСНЫ ҮЛДЭГДЭЛ ҮНЭ</th>
              <th className="py-2.5 px-3 w-[100px]">БАЙРШИЛ</th>
              <th className="py-2.5 px-3 w-[120px]">ХАРИУЦАГЧ</th>
              <th className="py-2.5 px-3 w-[100px]">ТӨЛӨВ</th>
              <th className="py-2.5 px-3 w-[80px] text-right">ҮЙЛДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading && (
              <tr><td colSpan={colCount} className="py-8 text-center text-darktext">Ачаалж байна...</td></tr>
            )}
            {!loading && loadError && (
              <tr><td colSpan={colCount} className="py-8 text-center text-customRed">{loadError}</td></tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr><td colSpan={colCount} className="py-8 text-center text-darktext">Мэдээлэл олдсонгүй</td></tr>
            )}
            {!loading && !loadError && rows.map((r, idx) => (
              <tr key={r.id}>
                <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <button type="button" className="cursor-pointer" title="Дарж шошго хэвлэх" onClick={() => onPrint?.(r)}>
                    <BarcodeImage value={r.barcode} />
                  </button>
                </td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                <td className="py-2.5 px-3">{r.mark_serial || '—'}</td>
                <td className="py-2.5 px-3">{r.type?.name || '—'}</td>
                <td className="py-2.5 px-3">{r.qty} {r.unit}</td>
                <td className="py-2.5 px-3">{r.acquired_date ? formatDate(r.acquired_date) : '—'}</td>
                <td className="py-2.5 px-3 text-right">{formatMoney(r.purchase_price)}₮</td>
                <td className="py-2.5 px-3 text-right">{formatMoney(r.accumulated_depreciation)}₮</td>
                <td className="py-2.5 px-3 text-right">{formatMoney(r.book_value)}₮</td>
                <td className="py-2.5 px-3">{r.location?.name || '—'}</td>
                <td className="py-2.5 px-3">{r.responsible_person || '—'}</td>
                <td className={`py-2.5 px-3 font-semibold ${statusClassName(r.status)}`}>{statusLabel(r.status)}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
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
