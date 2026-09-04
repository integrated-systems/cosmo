import { useSectionLock } from '../hooks/useSectionLock';

// 2026-09-04 (13): Хэрэглэгчийн хүсэлт - товчийг "Тоот"/"Зогсоол,
// Агуулах, Талбай" tab товчтой ижил өндөртэй (30px), 30x30px тэг
// дврввлжин болгож, текст (Цоожтой/Нээлттэй) арилгаж, зөвхөн 20x20px
// svg иконыг л үлдээв (илүү тод харагдацтай). өнгөний логик хэвээрээ.
function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function UnlockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </svg>
  );
}

export function SectionLockBadge({ tenantId, sectionKey }) {
  const { state, isSuperSysAdmin, setLockState, loading } = useSectionLock(tenantId, sectionKey);

  function cycleState() {
    if (state === 'open') setLockState('locked');
    else if (state === 'locked') setLockState('open');
    else setLockState('open'); // delegated -> ирээдүйд хүн сонгох UI нэмнэ, одоохондоо шууд нээнэ
  }

  if (loading) return null;

  const Icon = state === 'open' ? UnlockIcon : LockIcon;

  return (
    <button
      onClick={isSuperSysAdmin ? cycleState : undefined}
      disabled={!isSuperSysAdmin}
      title={isSuperSysAdmin ? 'Дарж өөрчлөх' : undefined}
      style={{ width: 30, height: 30 }}
      className={`rounded flex items-center justify-center shrink-0 ${
        state === 'locked' ? 'bg-customRed/15 text-customRed' : state === 'delegated' ? 'bg-customBlue/15 text-customBlue' : 'bg-slate-500/10 text-mutedtext'
      } ${isSuperSysAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
    >
      <Icon />
    </button>
  );
}
