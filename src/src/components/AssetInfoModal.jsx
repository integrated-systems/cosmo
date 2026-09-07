import { useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal';
import { formatDate, formatMoney } from '../lib/format';
import { statusLabel, statusClassName, DEPRECIATION_METHODS } from '../lib/fixedAssetsFormat';
import { computeStraightLineDepreciation, computeAcceleratedDepreciation } from '../lib/depreciation';
import { buildAssetDeepLink } from '../lib/labelPrint';

// 2026-09-07 (5): QR кодоор шошгоноос шууд нээгдэх (мвн хүснэгэлийн
// мвр дээр дарахад нээгдэх) ЗүВХүН УНШИХ мэдээллийн карт.
// 2026-09-07 (7): Хуучин "Баркод" мвр дэх CODE128 график зургийг
// бүрэн арилгаж, оронд нь дээд буланд жижиг QR thumbnail байрлуулав
// (дарахад шошго хэвлэх урсгал эхэлнэ — onPrint). "Баркод" мврийг
// "Хүрүнгийн бүртгэлийн дугаар" болгож нэрлэж, зүвхүн текст утга
// (график биш) харуулна.
export default function AssetInfoModal({ open, onClose, asset, onEdit, canEdit, onPrint, hoaId }) {
  const isDepreciable = asset?.type?.is_depreciable !== false;

  const depreciation = useMemo(() => {
    if (!asset || !isDepreciable) return null;
    const input = {
      purchasePrice: asset.purchase_price,
      salvageValue: asset.salvage_value,
      acquiredDate: asset.acquired_date,
    };
    const result = asset.depreciation_method === 'accelerated'
      ? computeAcceleratedDepreciation({ ...input, annualDepreciationRate: asset.annual_depreciation_rate })
      : computeStraightLineDepreciation({ ...input, usefulLifeMonths: asset.useful_life_months });
    const months = Number(asset.useful_life_months) || 0;
    const elapsedPct = months > 0
      ? Math.min(100, Math.round(((result.accumulated || 0) / Math.max(1, asset.purchase_price - (asset.salvage_value || 0))) * 100))
      : 0;
    return { ...result, elapsedPct };
  }, [asset, isDepreciable]);

  if (!asset) return null;

  return (
    <Modal open={open} onClose={onClose} title={asset.name} size="md" footer={
      <>
        {canEdit && <button className="ds-btn-secondary" onClick={() => onEdit(asset)}>Засах</button>}
        <button className="ds-btn-primary" onClick={onClose}>Хаах</button>
      </>
    }>
      <div className="flex flex-col gap-3 text-[13px]">
        <div className="flex justify-end">
          <QrThumbnail hoaId={hoaId} barcode={asset.barcode} onClick={() => onPrint?.(asset)} />
        </div>

        <Row label="Хөрөнгийн бүртгэлийн дугаар"><span className="font-mono font-semibold">{asset.barcode}</span></Row>
        <Row label="Марк, сериал, баркод">{asset.mark_serial || '—'}</Row>
        <Row label="Ангилал"><span className="font-semibold">{asset.category?.name || '—'}</span></Row>
        <Row label="Төрөл"><span className="font-semibold">{asset.type?.name || '—'}</span></Row>
        <Row label="Тоо хэмжээ">{asset.qty} {asset.unit}</Row>
        <Row label="Худалдан авсан огноо">{asset.acquired_date ? formatDate(asset.acquired_date) : '—'}</Row>
        <Row label="Худалдан авсан үнэ" bold>{formatMoney(asset.purchase_price)}₮</Row>
        <Row label="Борлуулагч байгууллага">{asset.seller_org || '—'}</Row>
        <Row label="Байршил"><span className="font-semibold">{asset.location?.name || '—'}</span></Row>
        <Row label="Хариуцагч">{asset.responsible_person || '—'}</Row>
        <Row label="Төлөв"><span className={`font-semibold ${statusClassName(asset.status)}`}>{statusLabel(asset.status)}</span></Row>
        {asset.note && <Row label="Тэмдэглэл"><span className="font-semibold">{asset.note}</span></Row>}

        <div className="pt-2 mt-1 border-t border-slate-200 dark:border-bordercol text-[11px] font-semibold tracking-wide text-mutedtext uppercase">
          Элэгдлийн мэдээлэл
        </div>

        {!isDepreciable ? (
          <div className="text-[12px] text-mutedtext">
            Энэ терел ({asset.type?.name || '—'}) элэгддэггүй хeрeнгe. Дансны үлдэгдэл үнэ = <span className="font-bold text-customBlue">{formatMoney(asset.purchase_price)}₮</span> хэвээр байнга үлдэнэ.
          </div>
        ) : (
          <>
            <Row label="Ашиглах хугацаа">{asset.useful_life_months ? `${asset.useful_life_months} сар` : '—'}</Row>
            <Row label="Аргачлал"><span className="font-semibold">{DEPRECIATION_METHODS[asset.depreciation_method] || '—'}</span></Row>
            {asset.depreciation_method === 'accelerated' && (
              <Row label="Жилийн элэгдлийн хувь">{asset.annual_depreciation_rate != null ? `${asset.annual_depreciation_rate}%` : '—'}</Row>
            )}
            <Row label="Ашиглалтаас гарах огноо">{asset.disposal_date ? formatDate(asset.disposal_date) : '—'}</Row>
            <Row label="Хуримтлагдсан элэгдэл" bold>{formatMoney(depreciation?.accumulated || 0)}₮</Row>
            <Row label="Дансны үлдэгдэл үнэ"><span className="font-bold text-customBlue">{formatMoney(depreciation?.bookValue ?? asset.purchase_price)}₮</span></Row>

            <div>
              <div className="flex items-center justify-between text-[11px] text-mutedtext mb-1">
                <span>Хугацааны явц</span>
                <span>{depreciation?.elapsedPct ?? 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-customBlue rounded-full" style={{ width: `${depreciation?.elapsedPct ?? 0}%` }} />
              </div>
            </div>
          </>
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
function QrThumbnail({ hoaId, barcode, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !hoaId || !barcode) return;
    const deepLink = buildAssetDeepLink(hoaId, barcode);
    QRCode.toCanvas(ref.current, deepLink, { margin: 0, width: 80, color: { dark: '#000000', light: '#ffffff' } }).catch(() => {});
  }, [hoaId, barcode]);

  return (
    <button type="button" title="Дарж шошго хэвлэх" onClick={onClick} className="rounded-md overflow-hidden border border-slate-200 dark:border-bordercol p-1 bg-white">
      <canvas ref={ref} width={80} height={80} />
    </button>
  );
}
