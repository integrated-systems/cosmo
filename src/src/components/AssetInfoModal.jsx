import { useMemo } from 'react';
import Modal from './Modal';
import BarcodeImage from './BarcodeImage';
import { formatDate, formatMoney } from '../lib/format';
import { statusLabel, statusClassName, DEPRECIATION_METHODS } from '../lib/fixedAssetsFormat';
import { computeStraightLineDepreciation, computeAcceleratedDepreciation } from '../lib/depreciation';

// 2026-09-07 (5): QR кодоор шошгоноос шууд нээгдэх (мөн хүснэгэлийн
// мөр дээр дарахад нээгдэх) ЗӨВХӨН УНШИХ мэдээллийн карт — хэрэглэгчийн
// өгсөн зурган жишээтэй яг адил бүтэцтэй. Засах модаль (EditFixedAssetModal)-
// аас ялгаатай нь: input БИШ, зөвхөн формат хийсэн утга харуулна.
// "Засах" товч зөвхөн canEdit=true үед харагдана (ролиос хамаарна).
export default function AssetInfoModal({ open, onClose, asset, onEdit, canEdit }) {
  const depreciation = useMemo(() => {
    if (!asset) return null;
    const input = {
      purchasePrice: asset.purchase_price,
      salvageValue: asset.salvage_value,
      usefulLifeMonths: asset.useful_life_months,
      acquiredDate: asset.acquired_date,
    };
    const result = asset.depreciation_method === 'accelerated'
      ? computeAcceleratedDepreciation(input)
      : computeStraightLineDepreciation(input);
    const months = Number(asset.useful_life_months) || 0;
    const elapsedPct = months > 0
      ? Math.min(100, Math.round(((result.accumulated || 0) / Math.max(1, asset.purchase_price - (asset.salvage_value || 0))) * 100))
      : 0;
    return { ...result, elapsedPct };
  }, [asset]);

  if (!asset) return null;

  return (
    <Modal open={open} onClose={onClose} title={asset.name} size="md" footer={
      <>
        {canEdit && <button className="ds-btn-secondary" onClick={() => onEdit(asset)}>Засах</button>}
        <button className="ds-btn-primary" onClick={onClose}>Хаах</button>
      </>
    }>
      <div className="flex flex-col gap-3 text-[13px]">
        <Row label="Баркод"><BarcodeImage value={asset.barcode} height={32} /></Row>
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
        <Row label="Ашиглах хугацаа">{asset.useful_life_months ? `${asset.useful_life_months} сар` : '—'}</Row>
        <Row label="Аргачлал"><span className="font-semibold">{DEPRECIATION_METHODS[asset.depreciation_method] || '—'}</span></Row>
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
