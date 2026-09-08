import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal';
import { formatDate, formatMoney } from '../lib/format';
import { statusLabel, statusClassName, DEPRECIATION_METHODS, computeUsagePct } from '../lib/fixedAssetsFormat';
import { buildAssetDeepLink } from '../lib/labelPrint';
import UsageProgressBar from './UsageProgressBar';
import { useAssignmentHistory } from '../hooks/useAssignmentHistory';

// 2026-09-07 (5): QR кодоор шошгоноос шууд нээгдэх (мүн хүснэгэлийн
// мүр дээр дарахад нээгдэх) ЗүВХүН УНШИХ мэдээллийн карт.
// 2026-09-07 (7): Хуучин "Баркод" мүр дэх CODE128 график зургийг
// бүрэн арилгаж, оронд нь дээд буланд жижиг QR thumbnail байрлуулав
// (дарахад шошго хэвлэх урсгал эхэлнэ — onPrint). "Баркод" мүрийг
// "Хүрүнгийн бүртгэлийн дугаар" болгож нэрлэж, зүвхүн текст утга
// (график биш) харуулна.
// 2026-09-08 (5): АЛДАА ЗАСАВ — Хуримтлагдсан элэгдэл/Дансны үлдэгдэл
// үнэ өмнө computeStraightLineDepreciation()-ээр ХУДАЛДАН АВСАН
// ОГНООНООС хойш дахин симуляц хийж (бодит батлагдсан
// asset.accumulated_depreciation-ыг ОГТ хараагүйгээр) тооцоологддог
// байсан тул "Батлах" дарсны дараа ч 0.00₮ хэвээр харагддаг байв.
// Одоо ЗӨВХӨН бодит бичигдсэн (post_monthly_depreciation()-ээр
// баталсан) утгыг шууд харуулна — depreciation.js-ийн амьд симуляц
// ЭНД ХЭРЭГЛЭГДЭХГүй (тэр нь зөвхөн EditFixedAssetModal-ийн
// "хэрэв ингэвэл" харьцуулалтад ашиглагдана).
export default function AssetInfoModal({ open, onClose, asset, onEdit, canEdit, onPrint, onWriteOff, underRepair, activeInventoryCount, isFoundInCount, onMarkFound }) {
  const isDepreciable = asset?.type?.is_depreciable !== false;
  const { history, loading: historyLoading } = useAssignmentHistory(asset?.id);

  if (!asset) return null;

  const usagePct = computeUsagePct(asset);

  return (
    <Modal open={open} onClose={onClose} title={asset.name} size="md" footer={
      <>
        {activeInventoryCount && !isFoundInCount && asset.status !== 'written_off' && (
          <button className="bg-customGreen hover:opacity-90 text-white text-xs px-3 py-1.5 rounded font-medium transition-opacity" onClick={() => onMarkFound?.(asset)}>Тооллогод бүртгэх</button>
        )}
        {activeInventoryCount && isFoundInCount && (
          <span className="text-xs text-customGreen font-medium self-center">✓ Тоологдсон</span>
        )}
        {canEdit && asset.status !== 'written_off' && (
          <button className="bg-customRed hover:opacity-90 text-white text-xs px-3 py-1.5 rounded font-medium transition-opacity" onClick={() => onWriteOff?.(asset)}>Актлах</button>
        )}
        {canEdit && <button className="ds-btn-secondary" onClick={() => onEdit(asset)}>Засах</button>}
        <button className="ds-btn-primary" onClick={onClose}>Хаах</button>
      </>
    }>
      <div className="flex flex-col gap-3 text-[13px]">
        <div className="flex justify-end">
          <QrThumbnail barcode={asset.barcode} onClick={() => onPrint?.(asset)} />
        </div>

        <Row label="Хөрөнгийн бүртгэлийн дугаар"><span className="font-mono font-semibold">{asset.barcode}</span></Row>
        <Row label="Хөрөнгийн марк, модель, сериал, загвар, код">{asset.mark_serial || '—'}</Row>
        <Row label="Ангилал"><span className="font-semibold">{asset.category?.name || '—'}</span></Row>
        <Row label="Төрөл"><span className="font-semibold">{asset.type?.name || '—'}</span></Row>
        <Row label="Тоо хэмжээ">{asset.qty} {asset.unit}</Row>
        <Row label="Худалдан авсан огноо">{asset.acquired_date ? formatDate(asset.acquired_date) : '—'}</Row>
        <Row label="Худалдан авсан үнэ" bold>{formatMoney(asset.purchase_price)}₮</Row>
        {Number(asset.capitalized_amount) > 0 && (
          <Row label="Капиталжуулсан нэмэлт үнэ" bold>{formatMoney(asset.capitalized_amount)}₮</Row>
        )}
        <Row label="Борлуулагч байгууллага">{asset.seller_org || '—'}</Row>
        <Row label="Байршил"><span className="font-semibold">{asset.location?.name || '—'}</span></Row>
        <Row label="Хариуцагч">{asset.responsible_position?.name || '—'}</Row>
        <Row label="Төлөв">
          {underRepair && asset.status !== 'written_off' ? (
            <span className="font-semibold text-customOrange">Засварт</span>
          ) : (
            <span className={`font-semibold ${statusClassName(asset.status)}`}>{statusLabel(asset.status)}</span>
          )}
        </Row>
        {asset.status === 'written_off' && (
          <>
            <Row label="Актласан огноо">{asset.write_off_date ? formatDate(asset.write_off_date) : '—'}</Row>
            <Row label="Актласан шалтгаан"><span className="font-semibold">{asset.write_off_reason || '—'}</span></Row>
            <Row label="Актласан үнэ / орлого">{formatMoney(asset.write_off_amount || 0)}₮</Row>
          </>
        )}
        {asset.note && <Row label="Тэмдэглэл"><span className="font-semibold">{asset.note}</span></Row>}

        <div className="pt-2 mt-1 border-t border-slate-200 dark:border-bordercol text-[11px] font-semibold tracking-wide text-mutedtext uppercase">
          Элэгдлийн мэдээлэл
        </div>

        {!isDepreciable ? (
          <div className="text-[12px] text-mutedtext">
            Энэ терел ({asset.type?.name || '—'}) элэгддэггүй хөрөнгө. Дансны үлдэгдэл үнэ = <span className="font-bold text-customBlue">{formatMoney(asset.purchase_price)}₮</span> хэвээр байнга үлдэнэ.
          </div>
        ) : (
          <>
            <Row label="Ашиглах хугацаа">{asset.useful_life_months ? `${asset.useful_life_months} сар` : '—'}</Row>
            <Row label="Аргачлал"><span className="font-semibold">{DEPRECIATION_METHODS[asset.depreciation_method] || '—'}</span></Row>
            {asset.depreciation_method === 'accelerated' && (
              <Row label="Жилийн элэгдлийн хувь">{asset.annual_depreciation_rate != null ? `${asset.annual_depreciation_rate}%` : '—'}</Row>
            )}
            <Row label="Ашиглалтаас гарах огноо">{asset.disposal_date ? formatDate(asset.disposal_date) : '—'}</Row>
            <Row label="Хуримтлагдсан элэгдэл" bold>{formatMoney(asset.accumulated_depreciation || 0)}₮</Row>
            <Row label="Дансны үлдэгдэл үнэ"><span className="font-bold text-customBlue">{formatMoney(asset.book_value ?? asset.purchase_price)}₮</span></Row>

            <div>
              <div className="flex items-center justify-between text-[11px] text-mutedtext mb-1">
                <span>Ашиглалтын хугацаа</span>
                <span>{usagePct ?? 0}%</span>
              </div>
              <UsageProgressBar pct={usagePct} />
            </div>
          </>
        )}

        <div className="pt-2 mt-1 border-t border-slate-200 dark:border-bordercol text-[11px] font-semibold tracking-wide text-mutedtext uppercase">
          Шилжилтийн түүх (Байршил/Хариуцагч)
        </div>
        {historyLoading && <div className="text-[12px] text-mutedtext">Ачаалж байна...</div>}
        {!historyLoading && history.length === 0 && (
          <div className="text-[12px] text-mutedtext">Шилжилт хараахан бүртгэгдээгүй байна.</div>
        )}
        {!historyLoading && history.length > 0 && (
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <div key={h.id} className="text-[12px]">
                <div className="text-mutedtext text-[11px]">{formatDate(h.changed_at)}</div>
                {h.old_location_id !== null || h.new_location_id !== null ? (
                  <div>Байршил: <span className="text-slate-500 dark:text-mutedtext">{h.old_location?.name || '—'}</span> → <span className="font-semibold">{h.new_location?.name || '—'}</span></div>
                ) : null}
                {h.old_responsible_position_id !== null || h.new_responsible_position_id !== null ? (
                  <div>Хариуцагч: <span className="text-slate-500 dark:text-mutedtext">{h.old_responsible?.name || '—'}</span> → <span className="font-semibold">{h.new_responsible?.name || '—'}</span></div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, children, bold }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-mutedtext">{label}</span>
      <span className={bold ? 'font-bold' : ''}>{children}</span>
    </div>
  );
}

// Дарахад шошго хэвлэх (onPrint) урсгал эхэлдэг жижиг QR thumbnail.
// 2026-09-07 (12): margin/errorCorrectionLevel-ийг зөв утга руу
// буцааж, deepLink-ийг богино хэлбэрээр (hoaId шаардахгүй) үүсгэнэ.
function QrThumbnail({ barcode, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !barcode) return;
    const deepLink = buildAssetDeepLink(barcode);
    QRCode.toCanvas(ref.current, deepLink, { width: 90, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } }).catch(() => {});
  }, [barcode]);

  return (
    <button type="button" title="Дарж шошго хэвлэх" onClick={onClick} className="rounded-md overflow-hidden border border-slate-200 dark:border-bordercol p-1 bg-white">
      <canvas ref={ref} width={90} height={90} />
    </button>
  );
}
