import { useSectionLock } from '../hooks/useSectionLock';

// 2026-09-04 (12): Тохиргооны таб бүр дээр байрлах ерөнхий "section
// lock" badge/товч. Бүх staff-д тврлвв ("Ил тод байх" зарчим) харагдана,
// гэхдээ зөвхөн SUPERSYSADMIN-д л дарж өөрчлөх боломжтой (Open/
// Delegated/Locked). RLS дээр can_edit_section() функц бодит хамгаалалт
// хийдэг тул энэ бол зөвхөн UX давхарга.
const STATE_LABEL = { open: 'Нээлттэй', delegated: 'Тодорхой хүнд', locked: 'Цоожтой' };
const STATE_ICON = { open: '🔓', delegated: '👤', locked: '🔒' };

export function SectionLockBadge({ tenantId, sectionKey }) {
  const { state, isSuperSysAdmin, setLockState, loading } = useSectionLock(tenantId, sectionKey);

  function cycleState() {
    if (state === 'open') setLockState('locked');
    else if (state === 'locked') setLockState('open');
    else setLockState('open'); // delegated -> ирээдүйд хүн сонгох UI нэмнэ, одоохондоо шууд нээнэ
  }

  if (loading) return null;

  return (
    <button
      onClick={isSuperSysAdmin ? cycleState : undefined}
      disabled={!isSuperSysAdmin}
      title={isSuperSysAdmin ? 'Дарж өөрчлөх' : undefined}
      className={`text-[11px] font-medium px-2 py-1 rounded flex items-center gap-1 ${
        state === 'locked' ? 'bg-customRed/15 text-customRed' : state === 'delegated' ? 'bg-customBlue/15 text-customBlue' : 'bg-slate-500/10 text-mutedtext'
      } ${isSuperSysAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
    >
      <span>{STATE_ICON[state]}</span>
      <span>{STATE_LABEL[state]}</span>
    </button>
  );
}
