// 2026-09-09 (34): Pending/Rejected/Deactivated үе шатанд Sidebar/
// Topbar-ыг үзүүлэхгүй, TenantSuspendedScreen.jsx-тэй ижил зарчмаар
// цэвэрхэн, тусад нь дэлгэц харуулна — үүнээс oмнe эдгээр төлевт ч
// бүтэн менү бүтэц (Sidebar) харагддаг байсан (бодит эрсдэлгүй ч,
// зохимжгүй харагдац байсан).
export default function TenantGateScreen({ icon, title, message }) {
  return (
    <div className="h-screen flex items-center justify-center bg-sidebg px-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-3">{icon}</div>
        <div className="text-[16px] font-semibold text-white mb-2">{title}</div>
        {message && <div className="text-[13px] text-mutedtext leading-relaxed">{message}</div>}
      </div>
    </div>
  );
}
