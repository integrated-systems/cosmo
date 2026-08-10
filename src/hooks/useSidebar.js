import { useEffect, useState } from 'react';

// projectcosmo.html-ийн toggleBtn/checkScreenSize логик (мөр ~811-850) —
// 1000px-ээс нарийсахад автоматаар хураана. Эх кодонд байсан
// "sidebar.classList.collapsed = ..." гэсэн үр дүнгүй мөрийг (аудитаар
// олдсон, юу ч хийдэггүй байсан) энд оруулаагүй.
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function checkScreenSize() {
      const mobile = window.innerWidth <= 1000;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        setMobileOpen(false);
      } else {
        setCollapsed(false);
      }
    }
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  function toggleSidebar() {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  }

  const isOpen = isMobile ? mobileOpen : !collapsed;

  return { isOpen, isMobile, toggleSidebar };
}
