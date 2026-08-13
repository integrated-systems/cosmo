// Дахин ашиглагдах модал wrapper — 2026-08-13 хэрэглэгчийн тодорхой заасан
// спек: фон #070d1d (tailwind.config-ийн `sidebg` token), border-radius
// 8px (карт/модалийн стандарт), доторх товчнууд 4px (.ds-btn-* классууд
// аль хэдийн зөв тохируулагдсан). "Rule of two": цаашид өгөгдөх модалиудад
// энэ л компонентыг дахин ашиглана, шинээр overlay бүтэц бүү давт.
export default function Modal({ open, onClose, title, children, footer, size = 'sm' }) {
  if (!open) return null;

  const widthClass = size === 'lg' ? 'w-[660px]' : 'w-[420px]';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`${widthClass} max-h-[85vh] overflow-y-auto rounded-lg bg-sidebg border border-bordercol p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="ds-icon-btn"
            title="Хаах"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="text-[13px] text-mutedtext">{children}</div>

        {footer && <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-bordercol">{footer}</div>}
      </div>
    </div>
  );
}
