import { formatDate, formatMoney } from '../lib/format';
import { statusLabel, statusClassName } from '../lib/fixedAssetsFormat';
import { EditIcon, DeleteIcon } from './icons/Icons';

// FixedAssets.jsx-ийн хүснэгэл — ClienteleTable.jsx-ийн бүтцийг дахин
// ашигласан (Rule of two). Хуучин "suh" прототипийн баганын нэрс,
// дараалал үндсэндээ хадгалагдсан.
// 2026-09-07 (2): "НИЙТ" нийлбэр мвр/footer-ыг устгав (тойм картуудтай
// давхцаж байсан).
// 2026-09-07 (7): Хэрэглэгчийн заасны дагуу мвр (хвл) БүХЭЛДЭЭ дарахад
// AssetInfoModal нээгдэнэ. БАРКОД (график) баганыг бүрэн арилгаж,
// оронд нь "Хүрүнгийн бүртгэлийн дугаар" текст багана оруулав — QR
// хэвлэлт одоо зөвхүн AssetInfoModal дотроос хийгдэнэ (энд onPrint
// шаардлагагүй болсон).
// 2026-09-08 (2): activeRepairAssetIds үед тухайн хeрeнгийг статус
// (written_off эс бэшгүй тохиолдолд) "Засварт" (custom оранж) гэж
// автоматаар давхарлаж харуулна — RepairModal.jsx-ийн Эхэлсэн/Дууссан
// огнооны хугацаанд байгаа үед л идэвхтэй (useAssetRepairs.js харна уу).
export default function FixedAssetsTable({ rows, loading, loadError, onEdit, onDelete, onView, canEdit = true, canDelete = true, activeRepairAssetIds }) {
  const colCount = 13;

  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto overscroll-contain">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">№</th>
              <th className="py-2.5 px-3 w-[130px]">ХӨРӨНГИЙН БүРТГЭЛИЙН ДУГААР</th>
              <th className="py-2.5 px-3 w-[150px]">НЭР, БРЕНД</th>
              <th className="py-2.5 px-3 w-[170px]">ХӨРӨНГИЙН МАРК, МОДЕЛЬ, СЕРИАЛ, ЗАГВАР, КОД</th>
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
              <tr key={r.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]" onClick={() => onView?.(r)}>
                <td className="py-2.5 px-3 text-center text-slate-500 dark:text-mutedtext">{idx + 1}</td>
                <td className="py-2.5 px-3 font-mono text-[12px]">{r.barcode}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                <td className="py-2.5 px-3">{r.mark_serial || '—'}</td>
                <td className="py-2.5 px-3">{r.type?.name || '—'}</td>
                <td className="py-2.5 px-3">{r.qty} {r.unit}</td>
                <td className="py-2.5 px-3">{r.acquired_date ? formatDate(r.acquired_date) : '—'}</td>
                <td className="py-2.5 px-3 text-right">{formatMoney(r.purchase_price)}₮</td>
                <td className="py-2.5 px-3 text-right">{formatMoney(r.accumulated_depreciation)}₮</td>
                <td className="py-2.5 px-3 text-right">{formatMoney(r.book_value)}₮</td>
                <td className="py-2.5 px-3">{r.location?.name || '—'}</td>
                <td className="py-2.5 px-3">{r.responsible_position?.name || '—'}</td>
                <td className={`py-2.5 px-3 font-semibold ${activeRepairAssetIds?.has(r.id) && r.status !== 'written_off' ? 'text-customOrange' : statusClassName(r.status)}`}>
                  {activeRepairAssetIds?.has(r.id) && r.status !== 'written_off' ? 'Засварт' : statusLabel(r.status)}
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  {canEdit && (
                    <button className="ds-icon-btn" title="Засах" onClick={(e) => { e.stopPropagation(); onEdit(r); }}>
                      <EditIcon />
                    </button>
                  )}
                  {canDelete && (
                    <button className="ds-icon-btn danger" title="Устгах" onClick={(e) => { e.stopPropagation(); onDelete(r); }}>
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
