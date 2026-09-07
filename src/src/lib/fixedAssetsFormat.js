// "Үндсэн хөрөнгө бүртгэл" (/fixedassets) хуудасны нийтлэг формат/тогтмол —
// Rule of two: ТӨЛӨВ-ийн шошго/өнгийг Table болон Modal хоёулаа энд
// нэг л газраас дуудна, хуулбарлахгүй.
export const FIXED_ASSET_STATUS = {
  in_use: { label: 'Ашиглаж байгаа', className: 'text-customGreen' },
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

export const UNIT_OPTIONS = ['ширхэг', 'м²', 'багц', 'иж бүрдэл', 'кг', 'литр'];
