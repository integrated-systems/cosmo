import { useRole } from '../hooks/useRole';

// "Rule of two" зарчмаар нэг л удаа бүтээсэн эрхийн шалгалтын wrapper —
// 2026-08-13 архитектурын аудитаар "аль ч route хамгаалалтгүй" гэдгийг
// олж, үүнийг тодорхой шийдсэн загвар. Хуудас бүрт тусад нь эрхийн
// логик бичихийн оронд, `<RequireRole roles={['supersysadmin']}>`-оор
// л бүх route/хэсгийг хамгаална.
export default function RequireRole({ roles, children }) {
  const { role } = useRole();

  if (!roles.includes(role)) {
    return (
      <div className="ds-card p-6 text-center text-slate-500 dark:text-mutedtext">
        Энэ хэсэгт хандах эрхгүй байна.
      </div>
    );
  }

  return children;
}
