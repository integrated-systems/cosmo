// "Үндсэн хөрөнгө бүртгэл" (/fixedassets) хуудасны нийтлэг формат/тогтмол —
// Rule of two: ТӨЛӨВ-ийн шошго/өнгийг Table болон Modal хоёулаа энд
// нэг л газраас дуудна, хуулбарлахгүй.
// 2026-09-08 (6): "Ашиглаж байгаа" -> "Ашиглалтад" (товч), мвн
// Хүснэгэл/Инфо карт хоёуланд ашиглах "Ашиглалтын хугацаа" (usage %)
// тооцооллыг ЭНД нэг л газраас гаргана.
export const FIXED_ASSET_STATUS = {
  in_use: { label: 'Ашиглалтад', className: 'text-customGreen' },
  not_in_use: { label: 'Ашиглахгүй', className: 'text-mutedtext' },
  sold: { label: 'Зарагдсан', className: 'text-customBlue' },
  written_off: { label: 'Актлагдсан', className: 'text-customRed' },
};

export function statusLabel(status) {
  return FIXED_ASSET_STATUS[status]?.label ?? status ?? '—';
}

export function statusClassName(status) {
  return FIXED_ASSET_STATUS[status]?.className ?? 'text-slate-700 dark:text-text';
}


export const DEPRECIATION_METHODS = {
  straight_line: 'Шугаман элэгдэл',
  accelerated: 'Хурдасгасан элэгдэл',
};

// Ашиглалтын хугацааны явц (%) — бодит хуримтлагдсан элэгдлээс
// (accumulated_depreciation) шууд тооцно, ЦОРЫН ГАНЦ газраас
// (AssetInfoModal.jsx болон FixedAssetsTable.jsx хоёулаа дуудна).
// Элэгддэггүй терел (жиш Газар)-д null буцаана.
export function computeUsagePct(asset) {
  if (asset?.type?.is_depreciable === false) return null;
  const depreciableBase = Math.max(0, (Number(asset?.purchase_price) || 0) + (Number(asset?.capitalized_amount) || 0) - (Number(asset?.salvage_value) || 0));
  if (depreciableBase <= 0) return null;
  return Math.min(100, Math.round(((Number(asset?.accumulated_depreciation) || 0) / depreciableBase) * 100));
}
