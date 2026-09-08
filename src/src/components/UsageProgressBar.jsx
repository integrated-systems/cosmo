// 2026-09-08 (6): "Ашиглалтын хугацаа" прогресс бар — AssetInfoModal.jsx
// (том) болон FixedAssetsTable.jsx (жижиг, мөр бүрт) хоёулаа дуудна
// (Rule of two). Өнгө хувиар автоматаар өөрчлөгдөнө (>=90% улаан,
// >=70% оранж, үгүй бол хөх) — ашиглалт дуусч буй хөрөнгийг мөр бүрт
// шууд анзаарахад тус болно.
export default function UsageProgressBar({ pct, size = 'md' }) {
  if (pct == null) return <span className="text-mutedtext text-[11px]">—</span>;

  const height = size === 'sm' ? 'h-1' : 'h-1.5';
  const barColor = pct >= 90 ? 'bg-customRed' : pct >= 70 ? 'bg-customOrange' : 'bg-customBlue';

  return (
    <div className={`w-full ${height} rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden`}>
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
